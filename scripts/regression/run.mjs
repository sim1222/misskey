import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixture, root } from './harness.mjs';
import { Observations, verifyBaseline } from './observations.mjs';
import { scenarios, database } from './scenarios.mjs';
import { inventory } from './inventory.mjs';
import { browserScenarios } from './browser.mjs';
import { coverage } from './coverage.mjs';

const f = await fixture();
const o = new Observations(f.base);
let completed = false;
try {
	console.log('Running real HTTP, database, streaming and federation contracts');
	const users = await scenarios(f, o);
	console.log('Running Chromium UI workflows');
	await browserScenarios(f, o);
	console.log('Probing every registered API authentication boundary');
	const counts = await inventory(f, o, users);
	await database(f, o);
	const summary = { ...counts, observations: Object.keys(o.values).length };
	await writeFile(resolve(f.output, 'summary.json'), JSON.stringify({ ...summary, revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), node: process.version }, null, 2) + '\n');
	await verifyBaseline(o.values, f.output, resolve(root, 'scripts/regression/baseline.json'));
	completed = true;
	console.log(JSON.stringify(summary));
} finally {
	await writeFile(resolve(f.output, 'observations.json'), JSON.stringify(o.values, null, 2) + '\n');
	await f.stop();
	await coverage(f.output, f.directory, completed);
}
