import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { root } from '../regression/harness.mjs';

test('summaly security fork retains the exact upstream parsers, plugins and encoding behavior', async () => {
	const directory = resolve(root, 'packages/backend/vendor/summaly');
	const manifest = JSON.parse(await readFile(resolve(directory, 'upstream-sha256.json'), 'utf8'));
	assert.equal(manifest.package, 'summaly@2.7.0');
	assert.deepEqual(manifest.modified, ['package.json', 'built/index.js', 'built/index.d.ts', 'built/utils/got.js']);
	let compared = 0;
	for (const [path, expected] of Object.entries(manifest.files)) {
		if (manifest.modified.includes(path)) continue;
		assert.equal(createHash('sha256').update(await readFile(resolve(directory, path))).digest('hex'), expected, `Unrelated vendored code changed: ${path}`);
		compared++;
	}
	assert.ok(compared > 25, 'Missing upstream compatibility records');
});
