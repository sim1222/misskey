import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.MAINTENANCE_SMOKE_URL ?? 'http://127.0.0.1:61812';
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const home = await fetch(`${base}/`);
assert.equal(home.status, 200);
assert.match(await home.text(), /Misskey/);
const response = await fetch(`${base}/api/meta`, {
	method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
assert.equal(response.status, 200);
assert.equal((await response.json()).version, metadata.version);
const manifest = JSON.parse(await readFile(new URL('../built/_client_dist_/manifest.json', import.meta.url), 'utf8'));
const asset = await fetch(`${base}/assets/${manifest['src/init.ts'].file}`);
assert.equal(asset.status, 200);
assert.match(asset.headers.get('Content-Type'), /javascript/);
assert.ok((await asset.arrayBuffer()).byteLength > 0);
const webManifest = await fetch(`${base}/manifest.json`);
assert.equal(webManifest.status, 200);
assert.ok((await webManifest.json()).icons.length > 0);
console.log(`Application smoke checks passed (${metadata.version})`);
