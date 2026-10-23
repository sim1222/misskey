import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, requireBackend } from './harness.mjs';

export async function coverage(output, directory, completed = true) {
	const convert = requireBackend('v8-to-istanbul');
	const { createCoverageMap } = requireBackend('istanbul-lib-coverage');
	const { createContext } = requireBackend('istanbul-lib-report');
	const reports = requireBackend('istanbul-reports');
	const map = createCoverageMap({});
	for (const name of (await readdir(resolve(output, 'v8'), { recursive: true })).filter(path => path.endsWith('.json'))) {
		const report = JSON.parse(await readFile(resolve(output, 'v8', name), 'utf8'));
		for (const script of report.result) {
			if (!script.url.startsWith('file:')) continue;
			const path = fileURLToPath(script.url);
			const fragment = relative(resolve(directory, 'packages/backend/built'), path);
			if (fragment.startsWith('..') || !fragment.endsWith('.js')) continue;
			const converter = convert(resolve(root, 'packages/backend/built', fragment));
			await converter.load();
			converter.applyCoverage(script.functions);
			map.merge(converter.toIstanbul());
		}
	}
	assert.ok(map.files().length > 100, 'Missing application V8 coverage');
	// Imported declarations are not the whole application. Include source files
	// outside the loaded DI graph as zero coverage rather than omitting them.
	const sourceRoot = resolve(root, 'packages/backend/src');
	for (const entry of await readdir(sourceRoot, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) continue;
		const source = resolve(entry.parentPath, entry.name);
		if (map.files().includes(source)) continue;
		const built = resolve(root, 'packages/backend/built', relative(sourceRoot, source).replace(/\.ts$/, '.js'));
		const text = await readFile(built, 'utf8');
		const converter = convert(built);
		await converter.load();
		converter.applyCoverage([{ functionName: '(empty-report)', ranges: [{ startOffset: 0, endOffset: text.length, count: 0 }], isBlockCoverage: true }]);
		const zero = converter.toIstanbul();
		for (const file of Object.values(zero)) {
			for (const key of Object.keys(file.s)) file.s[key] = 0;
			for (const key of Object.keys(file.f)) file.f[key] = 0;
			for (const key of Object.keys(file.b)) file.b[key] = file.b[key].map(() => 0);
		}
		map.merge(zero);
	}
	const context = createContext({ dir: resolve(output, 'coverage'), coverageMap: map });
	for (const type of ['html', 'lcovonly', 'json', 'json-summary', 'text-summary']) reports.create(type).execute(context);
	const summary = Object.fromEntries(map.files().sort().map(file => [relative(root, file), map.fileCoverageFor(file).toSummary().toJSON()]));
	summary.total = map.getCoverageSummary().toJSON();
	await writeFile(resolve(output, 'coverage-summary.json'), JSON.stringify(summary, null, 2) + '\n');
	const important = [
		'packages/backend/src/server/api/ApiCallService.ts',
		'packages/backend/src/server/api/AuthenticateService.ts',
		'packages/backend/src/server/api/endpoint-base.ts',
		'packages/backend/src/server/ActivityPubServerService.ts',
		'packages/backend/src/queue/processors/InboxProcessorService.ts',
		'packages/backend/src/core/NoteCreateService.ts',
		'packages/backend/src/core/entities/NoteEntityService.ts',
	];
	if (process.argv.includes('--record') && completed) {
		const floor = Object.fromEntries(['total', ...important].map(path => {
			assert.ok(summary[path], `Coverage missing ${path}`);
			return [path, Object.fromEntries(['lines', 'branches', 'functions'].map(metric => [metric, Math.floor(summary[path][metric].pct)]))];
		}));
		await writeFile(resolve(output, 'coverage-floor-candidate.json'), JSON.stringify(floor, null, 2) + '\n');
	} else if (completed) {
		const floors = JSON.parse(await readFile(resolve(root, 'scripts/regression/coverage-floor.json'), 'utf8'));
		for (const [file, metrics] of Object.entries(floors)) {
			assert.ok(summary[file], `Coverage removed: ${file}`);
			for (const [metric, minimum] of Object.entries(metrics)) assert.ok(summary[file][metric].pct >= minimum, `${file} ${metric}: ${summary[file][metric].pct}% < ${minimum}%`);
		}
	}
}
