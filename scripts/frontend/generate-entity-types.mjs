import { refs, schemaType } from './backend-schema.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output = '// Generated from backend model schemas; do not edit.\n' + Object.entries(refs).map(([name, schema]) => 'export type ' + name + ' = ' + schemaType(schema, reference => reference) + ';').join('\n') + '\n';
const destination = new URL('../../packages/shared/schema-entities.ts', import.meta.url);
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output);
else await writeFile(destination, output);
