import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getClientEntry } from '../packages/backend/built/misc/client-manifest.js';

const base = process.env.MAINTENANCE_SMOKE_URL ?? 'http://127.0.0.1:61812';
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const home = await fetch(`${base}/`);
assert.equal(home.status, 200);
const html = await home.text();
assert.match(html, /Misskey/);
const response = await fetch(`${base}/api/meta`, {
	method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
assert.equal(response.status, 200);
assert.equal((await response.json()).version, metadata.version);
const apiDescription = await fetch(`${base}/api.json`);
assert.equal(apiDescription.status, 200);
const apiDocument = await apiDescription.json();
assert.equal(apiDocument.openapi, '3.0.0');
assert.equal(apiDocument.info.version, metadata.version);
assert.ok(apiDocument.paths['/drive/files/create'].post);
const manifest = JSON.parse(await readFile(new URL('../built/_client_dist_/manifest.json', import.meta.url), 'utf8'));
const asset = await fetch(`${base}/assets/${manifest['src/init.ts'].file}`);
assert.equal(asset.status, 200);
assert.match(asset.headers.get('Content-Type'), /javascript/);
assert.ok((await asset.arrayBuffer()).byteLength > 0);
for (const file of getClientEntry(manifest).css) {
	assert.ok(html.includes(`<link rel="stylesheet" href="/assets/${file}">`), `Missing stylesheet link: ${file}`);
	const stylesheet = await fetch(`${base}/assets/${file}`);
	assert.equal(stylesheet.status, 200);
	assert.match(stylesheet.headers.get('Content-Type'), /text\/css/);
	assert.ok((await stylesheet.text()).length > 0);
}
const webManifest = await fetch(`${base}/manifest.json`);
assert.equal(webManifest.status, 200);
assert.ok((await webManifest.json()).icons.length > 0);
console.log(`Application smoke checks passed (${metadata.version})`);
