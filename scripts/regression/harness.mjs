import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const requireBackend = createRequire(resolve(root, 'packages/backend/package.json'));

export function localHost(host) {
	assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Regression services must be on loopback');
	return host;
}

export async function eventually(check, description, timeout = 10000, fatal = () => false) {
	const deadline = Date.now() + timeout;
	let error;
	do {
		if (fatal()) throw new Error(`Aborted: ${description}; application exited`, { cause: error });
		try { return await check(); } catch (e) { error = e; }
		await delay(50);
	} while (Date.now() < deadline);
	throw new Error(`Timed out: ${description}`, { cause: error });
}

export async function fixture() {
	const { Client } = requireBackend('pg');
	const Redis = requireBackend('ioredis');
	const adminOptions = {
		host: localHost(process.env.REGRESSION_PG_HOST ?? '127.0.0.1'),
		port: Number(process.env.REGRESSION_PG_PORT ?? 54318),
		user: process.env.REGRESSION_PG_USER ?? 'postgres',
		password: process.env.REGRESSION_PG_PASSWORD ?? '',
		database: 'postgres',
	};
	const redisOptions = {
		host: localHost(process.env.REGRESSION_REDIS_HOST ?? '127.0.0.1'),
		port: Number(process.env.REGRESSION_REDIS_PORT ?? 56318),
	};
	const name = `regression_${process.pid}_${randomBytes(6).toString('hex')}`;
	assert.match(name, /^regression_[0-9]+_[a-f0-9]+$/);
	const output = resolve(root, '.maintenance-regression/latest');
	await rm(output, { recursive: true, force: true });
	await mkdir(output, { recursive: true });
	const directory = await mkdtemp(resolve(root, '.maintenance-regression/fixture-'));
	const backend = resolve(directory, 'packages/backend');
	const admin = new Client(adminOptions);
	const redis = new Redis(redisOptions);
	let db;
	let child;
	let created = false;
	let log;
	const stop = async () => {
		if (child && child.exitCode === null) {
			const exit = once(child, 'exit');
			child.kill('SIGTERM');
			const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
			await exit;
			clearTimeout(timer);
		}
		log?.end();
		await db?.end();
		if (created) {
			await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
		}
		// Never FLUSHDB/FLUSHALL: delete only this randomly named fixture's keys.
		let cursor = '0';
		do {
			const [next, keys] = await redis.scan(cursor, 'MATCH', `${name}:*`, 'COUNT', 100);
			cursor = next;
			if (keys.length) await redis.del(...keys);
		} while (cursor !== '0');
		await redis.quit();
		await admin.end();
		await rm(directory, { recursive: true, force: true });
	};
	try {
		await admin.connect();
		const { rows: [version] } = await admin.query("SELECT current_setting('server_version_num')::integer AS number, version() AS description");
		assert.ok(version.number >= 180000 && version.number < 190000, 'Regression tests require PostgreSQL 18');
		await writeFile(resolve(output, 'postgres-version.json'), JSON.stringify(version, null, 2) + '\n');
		await admin.query(`CREATE DATABASE "${name}"`);
		created = true;
		db = new Client({ ...adminOptions, database: name });
		await db.connect();
		const listener = createServer();
		listener.listen(0, '127.0.0.1');
		await once(listener, 'listening');
		const port = listener.address().port;
		await new Promise((done, reject) => listener.close(error => error ? reject(error) : done()));
		const base = `http://127.0.0.1:${port}`;
		await mkdir(backend, { recursive: true });
		await mkdir(resolve(directory, '.config'));
		// Real copies keep loadConfig() and media writes inside the fixture. Symlinking
		// application JS would resolve its paths back to the developer's configuration.
		await cp(resolve(root, 'packages/backend/built'), resolve(backend, 'built'), { recursive: true });
		await cp(resolve(root, 'packages/backend/package.json'), resolve(backend, 'package.json'));
		await cp(resolve(root, 'packages/backend/ormconfig.js'), resolve(backend, 'ormconfig.js'));
		await cp(resolve(root, '.node-version'), resolve(directory, '.node-version'));
		await symlink(resolve(root, 'packages/backend/node_modules'), resolve(backend, 'node_modules'), 'dir');
		await symlink(resolve(root, 'packages/backend/migration'), resolve(backend, 'migration'), 'dir');
		await symlink(resolve(root, 'packages/backend/assets'), resolve(backend, 'assets'), 'dir');
		await symlink(resolve(root, 'built'), resolve(directory, 'built'), 'dir');
		await symlink(resolve(root, 'packages/client'), resolve(directory, 'packages/client'), 'dir');
		const config = {
			url: base, port, id: 'aid', clusterLimit: 1,
			db: { host: adminOptions.host, port: adminOptions.port, user: adminOptions.user, pass: adminOptions.password, db: name },
			redis: { ...redisOptions, prefix: name },
		};
		await writeFile(resolve(directory, '.config/default.yml'), JSON.stringify(config));
		const env = { ...process.env, NODE_ENV: 'production', MK_DISABLE_CLUSTERING: '1', MK_NO_DAEMONS: '1' };
		delete env.MK_ONLY_SERVER;
		delete env.MK_ONLY_QUEUE;
		const run = (args, extra = {}, ipc = false) => spawn(process.execPath, ['--require', resolve(root, 'scripts/regression/network-guard.cjs'), ...args], { cwd: backend, env: { ...env, ...extra }, stdio: ipc ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'] });
		const migrate = run(['--input-type=module', '-e', "const {default: db} = await import('./ormconfig.js'); await db.initialize(); await db.runMigrations(); await db.destroy();"]);
		let migrationLog = '';
		migrate.stdout.on('data', data => { migrationLog += data; });
		migrate.stderr.on('data', data => { migrationLog += data; });
		const [code] = await once(migrate, 'exit');
		await writeFile(resolve(output, 'migrations.log'), migrationLog);
		assert.equal(code, 0, `Fixture migrations failed; see ${output}/migrations.log`);
		await mkdir(resolve(output, 'v8'), { recursive: true });
		// Run the compiled crypto helper in the same fixture/build and collect its
		// real V8 coverage alongside the server, including malformed/invalid chains.
		const contracts = run([resolve(root, 'scripts/regression/certificate-contracts.mjs'), resolve(backend, 'built')], { NODE_V8_COVERAGE: resolve(output, 'v8') });
		let contractLog = '';
		contracts.stdout.on('data', data => { contractLog += data; });
		contracts.stderr.on('data', data => { contractLog += data; });
		const [contractCode] = await once(contracts, 'exit');
		await writeFile(resolve(output, 'certificate-contracts.log'), contractLog);
		assert.equal(contractCode, 0, `Certificate compatibility failed; see ${output}/certificate-contracts.log`);
		log = createWriteStream(resolve(output, 'application.log'));
		child = run(['--import', resolve(root, 'scripts/regression/probe-hooks.mjs'), 'built/boot/index.js'], { NODE_V8_COVERAGE: resolve(output, 'v8') }, true);
		child.stdout.pipe(log, { end: false });
		child.stderr.pipe(log, { end: false });
		await eventually(async () => {
			assert.equal(child.exitCode, null, 'Application exited');
			const response = await fetch(`${base}/api/meta`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
			assert.equal(response.status, 200);
		}, 'HTTP application readiness', 60000, () => child.exitCode !== null);
		const query = (request, kind) => new Promise((done, reject) => {
			const timer = setTimeout(() => { child.off('message', receive); reject(new Error('Metadata IPC timeout')); }, 10000);
			function receive(message) {
				if (message?.kind === kind) { clearTimeout(timer); child.off('message', receive); done(message); }
			}
			child.on('message', receive);
			child.send(request);
		});
		const message = await query('regression:metadata', 'metadata');
		assert.equal(message.kind, 'metadata');
		return { base, db, redis, name, output, directory, stop, endpoints: message.endpoints, runtimeErrors: () => query('regression:errors', 'runtimeErrors') };
	} catch (error) {
		await stop();
		throw error;
	}
}
