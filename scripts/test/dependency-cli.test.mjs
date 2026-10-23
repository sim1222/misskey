import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('the migration CLI starts with the installed CJS and npm alias graph', () => {
	// --help loads the actual TypeORM/yargs/cliui graph without reading database
	// configuration or connecting to a database. Programmatic migrations miss it.
	const result = spawnSync(process.execPath, ['packages/backend/node_modules/typeorm/cli.js', '--help'], {
		cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8', timeout: 15000,
	});
	assert.ifError(result.error);
	assert.equal(result.status, 0, result.stderr.slice(-2000));
	assert.match(result.stdout, /migration:run/);
});
