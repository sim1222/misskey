import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './harness.mjs';

export async function buildFingerprint() {
	const directory = resolve(root, 'packages/backend/built');
	const hash = createHash('sha256');
	for (const file of (await readdir(directory, { recursive: true })).filter(path => /\.(js|map)$/.test(path)).sort()) {
		hash.update(file); hash.update(await readFile(resolve(directory, file)));
	}
	return hash.digest('hex');
}
