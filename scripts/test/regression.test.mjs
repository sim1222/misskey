import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { localHost, root } from '../regression/harness.mjs';
import { Observations, differences, verifyBaseline } from '../regression/observations.mjs';
import { changedLines, uncoveredChanges } from '../regression/changed-coverage.mjs';
import { requireBackend } from '../regression/harness.mjs';
import { createHash } from 'node:crypto';
import { unitSourceFingerprint, verifiedUnitCoverage } from '../regression/unit-coverage.mjs';

test('fixture refuses non-local service hosts before database creation', () => {
	for (const host of ['production.example.com', '192.168.1.1', '127.0.0.1.example.org', '/var/run/postgresql', 'localhost:5432', '']) assert.throws(() => localHost(host));
	assert.equal(localHost('127.0.0.1'), '127.0.0.1');
});

test('application process cannot connect to external hosts or Unix sockets', () => {
	for (const expression of ["require('node:net').connect(443, 'example.com')", "require('node:net').connect({port:443,host:'169.254.169.254'})", "require('node:net').connect('/tmp/socket')"]) {
		assert.throws(() => execFileSync(process.execPath, ['--require', resolve(root, 'scripts/regression/network-guard.cjs'), '-e', expression], { stdio: 'pipe' }), /blocked non-loopback/);
	}
});

test('fixture blocks external DNS including resolver instances and custom promisifiers', () => {
	for (const expression of [
		"require('node:dns').lookup('example.com', () => {})",
		"require('node:dns').resolve4('example.com', () => {})",
		"new (require('node:dns').Resolver)().resolve4('example.com', () => {})",
		"require('node:dns').promises.resolve4('example.com')",
		"new (require('node:dns').promises.Resolver)().resolve6('example.com')",
		"require('node:util').promisify(require('node:dns').lookup)('example.com')",
	]) assert.throws(() => execFileSync(process.execPath, ['--require', resolve(root, 'scripts/regression/network-guard.cjs'), '-e', expression], { stdio: 'pipe' }), /blocked external DNS/);
	const local = execFileSync(process.execPath, ['--require', resolve(root, 'scripts/regression/network-guard.cjs'), '-e', "require('node:util').promisify(require('node:dns').lookup)('localhost').then(result => { if (!['127.0.0.1', '::1'].includes(result.address)) throw Error('Unexpected address'); console.log(result.family); })"], { encoding: 'utf8' });
	assert.match(local.trim(), /^[46]$/);
});

test('normalization preserves privacy fields, nullability, array order and status', () => {
	const o = new Observations('http://127.0.0.1:12345');
	o.alias('abcdefghijkl', 'alice');
	const normalized = o.normalize({ status: 403, body: { userId: 'abcdefghijkl', uri: 'http://127.0.0.1:12345/users/abcdefghijkl', text: null, isHidden: true, permission: ['read:notes', 'write:notes'], createdAt: '2024-01-02T03:04:05.000Z' } });
	assert.equal(normalized.body.uri, '<instance>/users/<alice>');
	assert.equal(normalized.body.createdAt, '<timestamp>');
	assert.equal(normalized.body.text, null);
	assert.equal(normalized.body.isHidden, true);
	assert.equal(normalized.status, 403);
	assert.deepEqual(normalized.body.permission, ['read:notes', 'write:notes']);
});

test('credentials are redacted without losing their presence or null state', () => {
	const o = new Observations('http://127.0.0.1:12345');
	assert.deepEqual(o.normalize({ token: 'random', password: null }), { password: null, token: '<generated-secret>' });
	assert.equal(o.normalize('http://127.0.0.1:12345/auth/random'), '<instance>/auth/<generated-secret>');
});

test('diff detects leaked text, changed authentication, missing fields and ordering', () => {
	const expected = { status: 401, body: { text: null, isHidden: true, permission: ['read:notes'], items: ['a', 'b'] } };
	for (const changed of [
		{ ...expected, status: 200 },
		{ ...expected, body: { ...expected.body, text: 'secret' } },
		{ ...expected, body: { ...expected.body, isHidden: undefined } },
		{ ...expected, body: { ...expected.body, permission: ['read:notes', 'write:notes'] } },
		{ ...expected, body: { ...expected.body, items: ['b', 'a'] } },
	]) assert.ok(differences(expected, changed).length > 0);
});

test('comparison gate fails on behavior changes and leaves the baseline untouched', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'misskey-regression-gate-'));
	try {
		const path = join(directory, 'baseline.json');
		const text = JSON.stringify({ privateNote: { text: null } });
		await writeFile(path, text);
		await verifyBaseline({ privateNote: { text: null } }, directory, path);
		await assert.rejects(verifyBaseline({ privateNote: { text: 'leaked' } }, directory, path), /Behavior changed/);
		assert.equal(await readFile(path, 'utf8'), text);
		assert.equal(JSON.parse(await readFile(join(directory, 'behavior-diff.json'), 'utf8'))[0].path, '$.privateNote.text');
	} finally { await rm(directory, { recursive: true, force: true }); }
});

test('patch gate detects newly untested executable lines and branch outcomes', () => {
	assert.equal(changedLines('+++ b/packages/backend/src/@types/contract.d.ts\n@@ -0,0 +1 @@\n+declare module "jsonld" {}').size, 0);
	const path = 'packages/backend/src/example.ts';
	const lines = changedLines(`diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -3,0 +4,2 @@\n+if (user) return 1;\n+return 0;`);
	assert.deepEqual([...lines.get(path)], [4, 5]);
	const { createCoverageMap } = requireBackend('istanbul-lib-coverage');
	const location = line => ({ start: { line, column: 0 }, end: { line, column: 20 } });
	const map = createCoverageMap({ [resolve(root, path)]: { path: resolve(root, path), statementMap: { 0: location(4), 1: location(5) }, fnMap: {}, branchMap: { 0: { type: 'if', loc: location(4), locations: [location(4), location(5)] } }, s: { 0: 1, 1: 0 }, f: {}, b: { 0: [1, 0] } } });
	assert.equal(uncoveredChanges(lines, map).length, 2);
	map.data[resolve(root, path)].s[1] = 1;
	map.data[resolve(root, path)].b[0][1] = 1;
	assert.deepEqual(uncoveredChanges(lines, map), []);
});

test('patch coverage rejects stale, altered and mismatched-runtime unit reports', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'misskey-unit-coverage-'));
	try {
		const report = JSON.stringify({});
		await writeFile(join(directory, 'coverage-final.json'), report);
		const metadata = { node: process.version, sourceFingerprint: await unitSourceFingerprint(), reportHash: createHash('sha256').update(report).digest('hex') };
		const save = value => writeFile(join(directory, 'coverage-metadata.json'), JSON.stringify(value));
		await save(metadata); assert.deepEqual(await verifiedUnitCoverage(directory), {});
		await save({ ...metadata, node: 'v0.0.0' }); await assert.rejects(verifiedUnitCoverage(directory), /different Node/);
		await save({ ...metadata, sourceFingerprint: 'old' }); await assert.rejects(verifiedUnitCoverage(directory), /stale/);
		await save(metadata); await writeFile(join(directory, 'coverage-final.json'), '{}\n'); await assert.rejects(verifiedUnitCoverage(directory), /differs/);
	} finally { await rm(directory, { recursive: true, force: true }); }
});
