import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './harness.mjs';

export async function inventory(f, o, users) {
	const endpoints = f.endpoints;
	const emptyToken = await o.api('issue token without permissions', 'miauth/gen-token', { session: null, permission: [] }, users.alice);
	o.record('registered API contracts', endpoints.map(ep => ({ name: ep.name, meta: ep.meta, params: ep.params })).sort((a, b) => a.name.localeCompare(b.name)));
	for (const ep of endpoints) {
		await o.api(`invalid token /${ep.name}`, ep.name, {}, { token: 'invalid-regression-token' }, 403, 'AUTHENTICATION_FAILED');
		if (ep.meta.requireCredential || ep.meta.secure) {
			await o.api(`anonymous denied /${ep.name}`, ep.name, {}, null, ep.meta.secure ? 400 : 401, ep.meta.secure ? 'ACCESS_DENIED' : 'CREDENTIAL_REQUIRED');
		}
		if (ep.meta.requireAdmin || ep.meta.requireModerator) {
			await o.api(`member denied /${ep.name}`, ep.name, {}, users.carol, 400, 'ACCESS_DENIED');
		}
		if (ep.meta.kind && !ep.meta.secure && !ep.meta.requireAdmin && !ep.meta.requireModerator) {
			await o.api(`token scope denied /${ep.name}`, ep.name, {}, emptyToken, 400, 'PERMISSION_DENIED');
		}
		// Invalid declared types are guaranteed to stop at AJV before execution.
		// Never fuzz with potentially valid inputs: admin endpoints can delete data.
		const entry = Object.entries(ep.params.properties ?? {}).find(([, schema]) => schema.type);
		if (entry && !ep.meta.requireFile) {
			const [key, schema] = entry;
			const wrong = schema.type === 'array' || schema.type === 'object' ? false : [];
			await o.api(`invalid parameter /${ep.name}`, ep.name, { [key]: wrong }, users.admin, 400, 'INVALID_PARAM');
		}
		if (!ep.meta.allowGet && !ep.meta.requireFile) {
			const response = await fetch(`${f.base}/api/${ep.name}`);
			assert.equal(response.status, 405, `GET must not execute POST-only ${ep.name}`);
			o.record(`GET refused /${ep.name}`, { status: response.status });
		}
	}
	const report = endpoints.map(ep => {
		const calls = o.calls.get(ep.name) ?? [];
		return {
			endpoint: ep.name, tags: ep.meta.tags ?? [],
			invalidToken: calls.some(c => c.name.startsWith('invalid token /')),
			anonymousDenial: calls.some(c => c.name.startsWith('anonymous denied /')),
			roleDenial: calls.some(c => c.name.startsWith('member denied /')),
			scopeDenial: calls.some(c => c.name.startsWith('token scope denied /')),
			invalidParameter: calls.some(c => c.name.startsWith('invalid parameter /')),
			success: calls.some(c => c.status >= 200 && c.status < 300),
			domainError: calls.some(c => c.status >= 400 && !/^(invalid token|anonymous denied|member denied|token scope denied|invalid parameter) \//.test(c.name)),
			calls,
		};
	});
	assert.ok(report.every(ep => ep.invalidToken));
	const successful = report.filter(ep => ep.success).length;
	const markdown = [
		'# Regression coverage inventory', '',
		`${report.length} registered endpoints; ${successful} exercised successfully; ${report.length - successful} without a successful workflow. Authentication probes do not imply functional coverage.`, '',
		'| Endpoint | Invalid token | Anonymous denial | Role denial | Scope denial | Invalid param | Success | Domain error |',
		'| --- | --- | --- | --- | --- | --- | --- | --- |',
		...report.map(ep => `| ${ep.endpoint} | ${ep.invalidToken ? 'yes' : '—'} | ${ep.anonymousDenial ? 'yes' : '—'} | ${ep.roleDenial ? 'yes' : '—'} | ${ep.scopeDenial ? 'yes' : '—'} | ${ep.invalidParameter ? 'yes' : '—'} | ${ep.success ? 'yes' : '**uncovered**'} | ${ep.domainError ? 'yes' : '—'} |`),
		'', 'See docs/maintenance/regression-testing.md for untested services, attack classes and manual gates.', '',
	].join('\n');
	await writeFile(resolve(f.output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
	await writeFile(resolve(f.output, 'inventory.md'), markdown);
	const advisories = JSON.parse(await readFile(resolve(root, 'docs/maintenance/misskey-advisories.json'), 'utf8')).advisories;
	const mapping = JSON.parse(await readFile(resolve(root, 'scripts/regression/advisory-tests.json'), 'utf8'));
	const security = [];
	for (const advisory of advisories) {
		const tests = mapping[advisory.id] ?? { unitFiles: [], observations: [] };
		for (const file of tests.unitFiles) {
			assert.match(file, /^packages\/backend\/test\/unit\/[a-zA-Z0-9_-]+\.ts$/, 'Advisory unit tests must run in the active Jest suite');
			await access(resolve(root, file));
		}
		for (const name of tests.observations) assert.ok(Object.hasOwn(o.values, name), `Advisory observation did not run: ${name}`);
		const linked = tests.unitFiles.length + tests.observations.length > 0;
		if (advisory.status === 'patched-and-regression-tested') assert.ok(linked, `Missing regression mapping: ${advisory.id}`);
		security.push({ id: advisory.id, title: advisory.title, status: advisory.status, url: advisory.url, tests, coverage: linked ? 'linked regression (review scope)' : 'dedicated attack reproduction pending' });
	}
	for (const id of Object.keys(mapping)) assert.ok(advisories.some(advisory => advisory.id === id), `Unknown advisory mapping: ${id}`);
	await writeFile(resolve(f.output, 'security-inventory.json'), JSON.stringify(security, null, 2) + '\n');
	await writeFile(resolve(f.output, 'security-inventory.md'), ['# Advisory regression inventory', '', 'General API probes do not establish that a specific advisory is fixed.', '', '| Advisory | Source review status | Dedicated regression |', '| --- | --- | --- |', ...security.map(item => `| [${item.id}](${item.url}) | ${item.status} | ${item.coverage} |`), ''].join('\n'));
	return { endpoints: report.length, successful, observations: Object.keys(o.values).length };
}
