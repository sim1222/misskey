import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, requireBackend } from './harness.mjs';

export function changedLines(diff) {
	const files = new Map();
	let path;
	for (const line of diff.split('\n')) {
		if (line.startsWith('+++ b/')) { path = line.slice(6); files.set(path, new Set()); }
		const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (hunk && path) for (let i = 0; i < Number(hunk[2] ?? 1); i++) files.get(path).add(Number(hunk[1]) + i);
	}
	return files;
}

export function uncoveredChanges(files, map) {
	const missing = [];
	for (const [file, lines] of files) {
		const coverage = map.data[resolve(root, file)];
		if (!coverage) { missing.push({ file, reason: 'No runtime coverage for changed file' }); continue; }
		for (const [line, count] of Object.entries(coverage.getLineCoverage())) if (lines.has(Number(line)) && count === 0) missing.push({ file, line: Number(line), reason: 'Changed executable line not exercised' });
		for (const [id, branch] of Object.entries(coverage.branchMap)) {
			if (lines.has(branch.loc.start.line) && coverage.b[id].some(count => count === 0)) missing.push({ file, line: branch.loc.start.line, reason: 'Changed branch has an unexercised outcome' });
		}
	}
	return missing;
}

async function main() {
	const base = process.env.REGRESSION_BASE_REF ?? process.argv[2];
	assert.match(base ?? '', /^[0-9a-f]{40}$/, 'Pass the full pre-patch commit SHA as REGRESSION_BASE_REF or first argument');
	const diff = execFileSync('git', ['diff', '--no-ext-diff', '--unified=0', '--diff-filter=AM', base, 'HEAD', '--', 'packages/backend/src'], { cwd: root, encoding: 'utf8' });
	const { createCoverageMap } = requireBackend('istanbul-lib-coverage');
	const map = createCoverageMap(JSON.parse(await readFile(resolve(root, '.maintenance-regression/latest/coverage/coverage-final.json'), 'utf8')));
	const files = changedLines(diff);
	const failures = uncoveredChanges(files, map);
	await writeFile(resolve(root, '.maintenance-regression/latest/changed-coverage.json'), JSON.stringify({ base, files: [...files.keys()], failures }, null, 2) + '\n');
	assert.equal(failures.length, 0, `Untested patch behavior: ${JSON.stringify(failures.slice(0, 10))}`);
	console.log(`Changed executable lines/branches checked in ${files.size} backend files`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
