import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { dependencyContracts } from '../regression/dependency-contracts.mjs';

// Date arithmetic is intentionally compared in the reference's time zone.
process.env.TZ = 'UTC';

test('updated dependencies preserve the recorded pre-update behavior', async () => {
	const expected = JSON.parse(await readFile(new URL('../regression/dependency-baseline.json', import.meta.url), 'utf8'));
	const require = createRequire(new URL('../../packages/backend/package.json', import.meta.url));
	assert.deepEqual(await dependencyContracts(require), expected.observations);
});
