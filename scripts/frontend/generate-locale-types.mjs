import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const locales = require('../../locales');
const output = '// Generated from the canonical merged ja-JP locale; do not edit.\nexport const defaultLocale = ' + JSON.stringify(locales['ja-JP'], null, '\t') + ';\nexport type Locale = typeof defaultLocale;\n';
const destination = new URL('../../packages/shared/locale.ts', import.meta.url);
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output);
else await writeFile(destination, output);
