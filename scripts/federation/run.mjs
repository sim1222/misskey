import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { coverage } from '../regression/coverage.mjs';
import { buildFingerprint } from '../regression/build-fingerprint.mjs';
import { requireBackend } from '../regression/harness.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const execute = promisify(execFile);
const docker = async (...args) => (await execute('docker', args, { cwd: root, maxBuffer: 20 * 1024 * 1024 })).stdout;
const prefix = `misskey-fed-${process.pid}-${randomBytes(4).toString('hex')}`;
const output = resolve(root, '.maintenance-federation/latest');
await mkdir(resolve(root, '.maintenance-federation'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.maintenance-federation/fixture-'));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const names = [];
let network = false;
const image = 'misskey-federation-test:local';
const backendBuildDigest = await buildFingerprint();
async function wait(check, description) {
	let last;
	for (let attempt = 0; attempt < 120; attempt++) {
		try { await check(); return; } catch (error) { last = error; await delay(500); }
	}
	throw new Error(`Not ready: ${description}`, { cause: last });
}
async function run(name, args) {
	const full = `${prefix}-${name}`;
	names.push(full);
	await docker('run', '-d', '--init', '--name', full, '--label', `io.misskey.federation=${prefix}`, '--network', prefix, '--network-alias', name, ...args);
	return full;
}
try {
	if (!process.argv.includes('--reuse-image')) {
		const build = spawn('docker', ['build', '-f', 'scripts/federation/Dockerfile', '-t', image, ...(process.env.FEDERATION_BUILD_CA ? ['--secret', `id=build-ca,src=${resolve(process.env.FEDERATION_BUILD_CA)}`] : []), '.'], { cwd: root, stdio: 'inherit' });
		const [code] = await once(build, 'exit');
		assert.equal(code, 0, 'Federation image build failed');
	}
	await writeFile(resolve(output, 'build.json'), JSON.stringify({ backendBuildDigest, postgresMajor: 18, image: (await docker('image', 'inspect', '--format', '{{.Id}}', image)).trim() }, null, 2) + '\n');
	await docker('network', 'create', '--internal', '--label', `io.misskey.federation=${prefix}`, prefix);
	network = true;
	const isolatedNetwork = JSON.parse(await docker('network', 'inspect', prefix))[0];
	const allowedPrivateNetworks = isolatedNetwork.IPAM.Config.map(entry => entry.Subnet).filter(subnet => subnet && !subnet.includes(':'));
	assert.equal(allowedPrivateNetworks.length, 1, 'Expected a dedicated IPv4 fixture subnet');
	const pg = await run('postgres', ['--tmpfs', '/var/lib/postgresql', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:18-alpine']);
	const redis = await run('redis', ['redis:7-alpine', 'redis-server', '--save', '', '--appendonly', 'no']);
	await wait(() => docker('exec', pg, 'pg_isready', '-U', 'postgres'), 'PostgreSQL 18');
	await wait(() => docker('exec', redis, 'redis-cli', 'ping'), 'Redis');
	await writeFile(resolve(output, 'postgres-version.txt'), await docker('exec', pg, 'psql', '-U', 'postgres', '-Atc', 'SELECT version()'));
	const certs = resolve(directory, 'certs');
	await mkdir(certs);
	await execute('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', resolve(certs, 'ca-key.pem'), '-out', resolve(certs, 'ca.pem'), '-days', '2', '-subj', '/CN=Misskey isolated federation test CA']);
	for (const peer of ['alpha', 'beta', 'gamma']) {
		await mkdir(resolve(output, 'v8', peer), { recursive: true });
		await docker('exec', pg, 'createdb', '-U', 'postgres', `federation_${peer}`);
		const peerDirectory = resolve(directory, peer);
		await mkdir(peerDirectory);
		const host = `${peer}.federation.test`;
		await writeFile(resolve(peerDirectory, 'default.yml'), JSON.stringify({ url: `https://${host}`, port: 3000, id: 'aid', clusterLimit: 1, db: { host: 'postgres', port: 5432, db: `federation_${peer}`, user: 'postgres', pass: '' }, redis: { host: 'redis', port: 6379, prefix: `federation_${peer}` }, signToActivityPubGet: true, allowedPrivateNetworks }));
		const certificateDirectory = resolve(peerDirectory, 'certs');
		await mkdir(certificateDirectory);
		await execute('openssl', ['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', resolve(certificateDirectory, 'key.pem'), '-out', resolve(certificateDirectory, 'request.pem'), '-subj', `/CN=${host}`]);
		await writeFile(resolve(certificateDirectory, 'extensions'), `subjectAltName=DNS:${host}\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`);
		await execute('openssl', ['x509', '-req', '-in', resolve(certificateDirectory, 'request.pem'), '-CA', resolve(certs, 'ca.pem'), '-CAkey', resolve(certs, 'ca-key.pem'), '-set_serial', String(['alpha', 'beta', 'gamma'].indexOf(peer) + 1), '-out', resolve(certificateDirectory, 'cert.pem'), '-days', '2', '-extfile', resolve(certificateDirectory, 'extensions')]);
		await run(peer, ['--network-alias', host, '-e', `FEDERATION_PEER=${peer}`, '-e', 'NODE_EXTRA_CA_CERTS=/ca/ca.pem', '-v', `${peerDirectory}:/misskey/.config:ro`, '-v', `${certificateDirectory}:/certs:ro`, '-v', `${certs}/ca.pem:/ca/ca.pem:ro`, '-v', `${output}:/evidence`, '-v', `${resolve(root, 'scripts')}:/misskey/scripts:ro`, image]);
	}
	const alpha = `${prefix}-alpha`;
	assert.equal((await docker('exec', alpha, 'node', '--version')).trim(), process.version, 'Image Node version differs; rebuild the image');
	assert.equal((await docker('exec', alpha, 'node', '--input-type=module', '-e', "import {buildFingerprint} from '/misskey/scripts/regression/build-fingerprint.mjs'; console.log(await buildFingerprint())")).trim(), backendBuildDigest, 'Image application differs; rebuild the image');
	for (const file of ['package.json', 'yarn.lock']) assert.ok(await docker('exec', alpha, 'cat', `/misskey/packages/backend/${file}`) === await readFile(resolve(root, 'packages/backend', file), 'utf8'), 'Image dependencies differ; rebuild the image');
	console.log('Three isolated Misskey peers started; running actual federation workflows');
	const driver = spawn('docker', ['exec', `${prefix}-alpha`, 'node', '/misskey/scripts/federation/scenarios.mjs'], { cwd: root, stdio: 'inherit' });
	const [driverCode] = await once(driver, 'exit');
	assert.equal(driverCode, 0, `Federation scenarios failed; see ${output}`);
} finally {
	for (const name of [...names].reverse()) {
		let inspection;
		try { inspection = JSON.parse(await docker('inspect', name))[0]; } catch (error) { if (String(error.stderr).includes('No such')) continue; throw error; }
		assert.equal(inspection.Config.Labels?.['io.misskey.federation'], prefix, 'Refusing to remove an unowned container');
		await docker('stop', '--time', '8', name);
		const log = await execute('docker', ['logs', name], { maxBuffer: 20 * 1024 * 1024 }).catch(error => ({ stdout: error.stdout ?? '', stderr: error.stderr ?? '' }));
		await writeFile(resolve(output, `${name.slice(prefix.length + 1)}-container.log`), log.stdout + log.stderr);
		await docker('rm', '-f', '-v', name);
	}
	if (network) await docker('network', 'rm', prefix);
	await rm(directory, { recursive: true, force: true });
}
await coverage(output, '/misskey', false);
assert.equal(await buildFingerprint(), backendBuildDigest, 'Backend changed during federation execution');
let regression;
try { regression = JSON.parse(await readFile(resolve(root, '.maintenance-regression/latest/summary.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (regression?.backendBuildDigest === backendBuildDigest) {
	const { createCoverageMap } = requireBackend('istanbul-lib-coverage');
	const map = createCoverageMap(JSON.parse(await readFile(resolve(root, '.maintenance-regression/latest/coverage/coverage-final.json'), 'utf8')));
	map.merge(JSON.parse(await readFile(resolve(output, 'coverage/coverage-final.json'), 'utf8')));
	await writeFile(resolve(output, 'combined-coverage.json'), JSON.stringify(map.toJSON()));
	console.log('Combined same-build single-process and container coverage for patch checks');
} else console.log('Standalone federation coverage recorded; run regression tests for this build to combine coverage');
