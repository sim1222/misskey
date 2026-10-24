import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../../packages/backend/package.json', import.meta.url));
const ts = require('typescript');
const source = await readFile(new URL('../../packages/backend/src/types.ts', import.meta.url), 'utf8');
const script = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const constants = await import('data:text/javascript;base64,' + Buffer.from(script).toString('base64'));
let output = '// Generated from backend/types.ts; do not edit.\n';
for (const [name, value] of Object.entries(constants)) { assert.ok(Array.isArray(value) && value.every(item => typeof item === 'string')); output += 'export const ' + name + ' = ' + JSON.stringify(value) + ' as const;\n'; }
output += `export type NoteVisibility = typeof noteVisibilities[number];
export function isNoteVisibility(value: unknown): value is NoteVisibility { return noteVisibilities.some(type => type === value); }
export type NotificationType = typeof notificationTypes[number];
export function isNotificationType(value: unknown): value is NotificationType { return notificationTypes.some(type => type === value); }
export function isNotificationTypes(value: unknown): value is NotificationType[] { return Array.isArray(value) && value.every(isNotificationType); }
`;
const destination = new URL('../../packages/shared/constants.ts', import.meta.url);
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output);
else await writeFile(destination, output);
