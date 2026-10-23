import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { root } from './harness.mjs';
// Only source-map comments differ from the production backend build. Real source
// locations and embedded source text make V8 branch coverage useful to reviewers.
for (const args of [
	['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--sourceMap', '--inlineSources'],
	['node_modules/tsc-alias/dist/bin/index.js', '-p', 'tsconfig.json'],
]) {
	const result = spawnSync(process.execPath, args, { cwd: resolve(root, 'packages/backend'), stdio: 'inherit' });
	if (result.status !== 0) process.exit(result.status ?? 1);
}
