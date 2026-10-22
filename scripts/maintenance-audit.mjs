import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scopes = { root: '.', backend: 'packages/backend', client: 'packages/client', sw: 'packages/sw' };
const report = { generatedAt: new Date().toISOString(), source: 'Yarn Classic audit / npm registry', scopes: {} };
for (const [scope, directory] of Object.entries(scopes)) {
	const result = spawnSync('yarn', ['audit', '--json'], { cwd: resolve(root, directory), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	if (result.error) throw result.error;
	const advisories = new Map();
	let summary;
	for (const line of result.stdout.split('\n').filter(Boolean)) {
		const event = JSON.parse(line);
		if (event.type === 'error') throw new Error(`${scope}: ${JSON.stringify(event.data)}`);
		if (event.type === 'auditSummary') summary = event.data;
		if (event.type !== 'auditAdvisory') continue;
		const { advisory, resolution } = event.data;
		const id = advisory.github_advisory_id ?? String(advisory.id);
		const item = advisories.get(id) ?? {
			id, module: advisory.module_name, severity: advisory.severity, title: advisory.title,
			url: advisory.url, vulnerableVersions: advisory.vulnerable_versions,
			patchedVersions: advisory.patched_versions, paths: [],
		};
		if (resolution?.path && !item.paths.includes(resolution.path)) item.paths.push(resolution.path);
		advisories.set(id, item);
	}
	// Nonzero vulnerability bitmasks are expected; a missing summary is a failed audit.
	if (!summary || result.status == null || result.status > 31) throw new Error(`${scope}: audit did not complete: ${result.stderr}`);
	report.scopes[scope] = { summary, uniqueAdvisories: [...advisories.values()].sort((a, b) => a.id.localeCompare(b.id)) };
	console.log(`${scope}: ${advisories.size} unique advisories`);
}
const output = resolve(process.argv[2] ?? '/tmp/misskey-dependency-audit.json');
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved ${output}`);
