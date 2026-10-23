import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeYarnAliases } from '../normalize-yarn-aliases.mjs';

const artifact = '  version "6.0.1"\n  resolved "https://registry.yarnpkg.com/strip-ansi/-/strip-ansi-6.0.1.tgz"\n  integrity sha512-unchanged\n  dependencies:\n    ansi-regex "^5.0.1"';
const alias = '"strip-ansi-cjs@npm:strip-ansi@^6.0.1"';

test('separates npm alias metadata without changing artifact identity', () => {
	const input = `# yarn lockfile v1\n\n${alias}, strip-ansi@^6.0.0:\n  name strip-ansi-cjs\n${artifact}\n`;
	assert.equal(normalizeYarnAliases(input), `# yarn lockfile v1\n\nstrip-ansi@^6.0.0:\n${artifact}\n\n${alias}:\n  name strip-ansi-cjs\n${artifact}\n`);
});

test('is idempotent and preserves unrelated and standalone alias entries', () => {
	const input = `# yarn lockfile v1\n\n${alias}:\n  name strip-ansi-cjs\n${artifact}\n\nstrip-ansi@^6.0.0:\n${artifact}\n`;
	assert.equal(normalizeYarnAliases(input), input);
	assert.equal(normalizeYarnAliases(normalizeYarnAliases(input)), input);
});

test('rejects ambiguous alias names instead of changing their identity', () => {
	const input = `${alias}, "other@npm:strip-ansi@^6.0.1", strip-ansi@^6.0.0:\n  name strip-ansi-cjs\n${artifact}\n`;
	assert.throws(() => normalizeYarnAliases(input), /Ambiguous npm alias names/);
});
