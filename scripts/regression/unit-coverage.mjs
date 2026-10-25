import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './harness.mjs';

const digest = data => createHash('sha256').update(data).digest('hex');
export async function unitSourceFingerprint() {
	const hash = createHash('sha256');
	for (const file of ['packages/backend/package.json', 'packages/backend/yarn.lock', 'packages/client/package.json', 'packages/client/yarn.lock']) {
		hash.update(file); hash.update(await readFile(resolve(root, file)));
	}
	for (const relative of ['packages/backend/src', 'packages/backend/test/unit', 'packages/backend/vendor', 'packages/client/src']) {
		const directory = resolve(root, relative);
		// The compiler's intentional negative examples are temporary test inputs,
		// not application source; they are created and removed during type checks.
		for (const file of (await readdir(directory, { recursive: true })).filter(file => /\.(ts|js|mjs|json|vue)$/.test(file) && !file.startsWith('__type_contracts_')).sort()) {
			hash.update(`${relative}/${file}\0`); hash.update(await readFile(resolve(directory, file)));
		}
	}
	return hash.digest('hex');
}

export async function verifiedUnitCoverage(directory) {
	const metadata = JSON.parse(await readFile(resolve(directory, 'coverage-metadata.json'), 'utf8'));
	assert.equal(metadata.node, process.version, 'Unit coverage uses a different Node runtime');
	assert.equal(metadata.sourceFingerprint, await unitSourceFingerprint(), 'Unit coverage is stale; rerun the coverage tests');
	const report = await readFile(resolve(directory, 'coverage-final.json'));
	assert.equal(metadata.reportHash, digest(report), 'Unit coverage report differs from its verified metadata');
	return JSON.parse(report);
}

async function main() {
	const sourceFingerprint = await unitSourceFingerprint();
	const directory = resolve(root, 'packages/backend/coverage');
	await rm(resolve(directory, 'coverage-metadata.json'), { force: true });
	const result = spawnSync('yarn', ['jest', '--coverage', '--coverageReporters=json', '--coverageReporters=json-summary', '--coverageReporters=lcov', '--coverageReporters=text-summary', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
	if (result.error) throw result.error;
	assert.equal(result.status, 0, 'Unit coverage tests failed');
	assert.equal(await unitSourceFingerprint(), sourceFingerprint, 'Source changed during unit coverage execution');
	const reportHash = digest(await readFile(resolve(directory, 'coverage-final.json')));
	await writeFile(resolve(directory, 'coverage-metadata.json'), JSON.stringify({ node: process.version, sourceFingerprint, reportHash }, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
