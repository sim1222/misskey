import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export class Observations {
	constructor(base) {
		this.base = base;
		this.aliases = new Map();
		this.values = {};
		this.calls = new Map();
	}
	alias(value, label) {
		assert.equal(typeof value, 'string');
		this.aliases.set(value, `<${label}>`);
		return value;
	}
	identities(value, key = '') {
		if (typeof value === 'string' && (key === 'id' || key.endsWith('Id'))) {
			if (/^[a-z0-9]{10,24}$/.test(value) && !this.aliases.has(value)) this.alias(value, `id-${this.aliases.size}`);
			if (value.startsWith(`${this.base}/`) && /^\/[0-9a-f-]{36}$/.test(new URL(value).pathname)) this.alias(value, 'generated-activity-id');
		} else if (Array.isArray(value)) value.forEach(v => this.identities(v, key.endsWith('Ids') ? key.slice(0, -1) : key));
		else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => this.identities(v, k));
	}
	normalize(value, key = '') {
		if (value instanceof Date) return '<timestamp>';
		if (typeof value === 'string') {
			if (this.aliases.has(value)) return this.aliases.get(value);
			if (key === 'qr' && value.startsWith('data:image/png;base64,')) return '<generated-authenticator-qr>';
			if (['token', 'i', 'password', 'publicKey', 'publicKeyPem', 'privateKey', 'secret', 'salt', 'accessToken', 'hash', 'accessKey', 'thumbnailAccessKey', 'webpublicAccessKey'].includes(key) && value.length) {
				this.alias(value, 'generated-secret');
				return '<generated-secret>';
			}
			if (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return '<timestamp>';
			if ((key === 'id' || key.endsWith('Id')) && /^[a-z0-9]{10,24}$/.test(value)) {
				this.alias(value, `id-${this.aliases.size}`);
				return this.aliases.get(value);
			}
			let normalized = value.replaceAll(this.base, '<instance>').replaceAll(new URL(this.base).host, '<instance-host>').replaceAll(encodeURIComponent(new URL(this.base).host), '<instance-host-encoded>');
			for (const [from, to] of this.aliases) normalized = normalized.replaceAll(from, to);
			return normalized;
		}
		if (Array.isArray(value)) return value.map(item => this.normalize(item, key.endsWith('Ids') ? key.slice(0, -1) : key));
		if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, this.normalize(value[k], k)]));
		return value;
	}
	record(name, value) {
		assert.ok(!Object.hasOwn(this.values, name), `Duplicate observation ${name}`);
		this.identities(value);
		this.values[name] = this.normalize(value);
	}
	async api(name, endpoint, params = {}, user, expected = 200, errorCode) {
		const response = await fetch(`${this.base}/api/${endpoint}`, {
			method: 'POST', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...params, ...(user ? { i: user.token } : {}) }), signal: AbortSignal.timeout(15000),
		});
		const text = await response.text();
		let body;
		try { body = JSON.parse(text); } catch { body = text; }
		this.calls.set(endpoint, [...(this.calls.get(endpoint) ?? []), { name, status: response.status }]);
		// Record unexpected results too; CI uploads the partial report on failure.
		this.record(name, { status: response.status, contentType: response.headers.get('content-type'), cacheControl: response.headers.get('cache-control'), body });
		assert.equal(response.status, expected, `${name}: ${endpoint}: ${text.slice(0, 1500)}`);
		if (errorCode) assert.equal(body.error?.code, errorCode, name);
		return body;
	}
	async http(name, path, expected = 200, options = {}) {
		const response = await fetch(`${this.base}${path}`, { ...options, signal: AbortSignal.timeout(15000) });
		const body = await response.text();
		assert.equal(response.status, expected, `${name}: ${body.slice(0, 500)}`);
		let parsed;
		try { parsed = JSON.parse(body); } catch { parsed = body; }
		this.record(name, { status: response.status, contentType: response.headers.get('content-type'), body: parsed });
		return parsed;
	}
}

export function differences(before, after, path = '$') {
	if (JSON.stringify(before) === JSON.stringify(after)) return [];
	if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after)) return [{ path, before, after }];
	return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => differences(before[key], after[key], `${path}.${key}`));
}

export async function verifyBaseline(observations, output, baseline) {
	await writeFile(resolve(output, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
	if (process.argv.includes('--record')) {
		// Recording produces a candidate only. No command overwrites the reviewed baseline.
		console.log(`Baseline candidate: ${output}/observations.json (review before copying)`);
		return;
	}
	const expected = JSON.parse(await readFile(baseline, 'utf8'));
	const diff = differences(expected, observations);
	await writeFile(resolve(output, 'behavior-diff.json'), JSON.stringify(diff, null, 2) + '\n');
	assert.equal(diff.length, 0, `Behavior changed at ${diff.slice(0, 12).map(d => d.path).join(', ')}; review ${output}/behavior-diff.json`);
}
