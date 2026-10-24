import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const client = resolve(root, 'packages/client');
const directory = await mkdtemp(resolve(client, 'src/__type_contracts_'));
const cases = [
 "import { api, apiGet, popup } from '@/os';",
 "import UsersTooltip from '@/components/MkUsersTooltip.vue';",
 "import NotificationSettings from '@/components/MkNotificationSettingWindow.vue';",
 "import { defaultStore } from '@/store';",
 "import type { Stream } from '@/misskey';",
 "declare const stream: Stream;",
 "api('notes/show', { noteId: 'note' }).then(note => note.text?.toUpperCase());",
 "api('users/show', { userIds: ['user'] }).then(users => users.map(user => user.username));",
 "api('admin/meta').then(meta => meta.maxNoteTextLength.toFixed());",
 "apiGet('users/notes', { userId: 'user', _cacheKey_: 10 });",
 "popup(UsersTooltip, { showing: true, users: [], count: 0, targetElement: document.body }, {});",
 "popup(NotificationSettings, {}, { done: result => result.includingTypes?.includes('follow') });",
 "stream.useChannel('antenna', { antennaId: 'antenna' });",
 "stream.useChannel('messaging', { otherparty: 'user' }).send('read', { id: 'message' });",
 "api('notes/show'); // reject: missing required request",
 "api('notes/show', { noteId: 42 }); // reject: wrong request field type",
 "api('notes/show', { noteId: 'note', invented: true }); // reject: unknown request field",
 "api('notes/create', { text: 'note', visibility: 'private' }); // reject: invalid visibility",
 "api('users/show', { userIds: ['user'] }).then(users => users.username); // reject: conditional array response",
 "api('meta', { detail: false }).then(meta => meta.features); // reject: conditional lite response",
 "popup(UsersTooltip, { showing: true, users: [], count: 0 }, {}); // reject: required popup anchor",
 "popup(NotificationSettings, {}, { done: (result: string) => result.length }); // reject: popup event payload",
 "stream.useChannel('antenna'); // reject: required channel parameters",
 "stream.useChannel('main').on('notification', (_notification: string) => {}); // reject: incoming stream payload",
 "stream.useChannel('invented'); // reject: unknown channel",
 "stream.useChannel('antenna', { antennaId: 42 }); // reject: channel parameters",
 "stream.useChannel('messaging', {}).send('read', { id: 42 }); // reject: outgoing stream payload",
 "defaultStore.set('defaultNoteVisibility', 'private'); // reject: store enum",
];
const sfcCases = [
 '<script setup lang="ts">',
 "import { ref } from 'vue';",
 "import TextInput from '@/components/form/input.vue';",
 "import NumberInput from '@/components/form/number-input.vue';",
 "const text = ref('text'); const number = ref(1);",
 '</script>',
 '<template>',
 '<TextInput v-model="text"/>',
 '<NumberInput v-model="number"/>',
 '<TextInput v-model="number"/> <!-- reject: numeric text model -->',
 '<NumberInput v-model="text"/> <!-- reject: string numeric model -->',
 '</template>',
];
try {
 const sfcFilename = resolve(directory, 'vue-models.vue');
 await writeFile(sfcFilename, sfcCases.join('\n') + '\n');
 const filename = resolve(directory, 'api-popup-stream.ts');
 await writeFile(filename, cases.join('\n') + '\n');
 const result = await new Promise((ok, fail) => {
  const child = spawn(process.execPath, [resolve(client, 'node_modules/vue-tsc/bin/vue-tsc.js'), '--noEmit', '--pretty', 'false'], { cwd: client, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  child.once('error', fail);
  child.once('close', status => ok({ status, output }));
 });
 const expected = new Set(cases.flatMap((line, index) => line.includes('reject:') ? [index + 1] : []));
 const sfcExpected = new Set(sfcCases.flatMap((line, index) => line.includes('reject:') ? [index + 1] : []));
 const sfcObserved = new Set();
 const observed = new Set();
 const unexpected = [];
 for (const line of result.output.split('\n')) {
  const diagnostic = /^(.+)\((\d+),\d+\): error TS\d+:/.exec(line);
  if (!diagnostic) continue;
  if (resolve(client, diagnostic[1]) === filename && expected.has(Number(diagnostic[2]))) observed.add(Number(diagnostic[2]));
  else if (resolve(client, diagnostic[1]) === sfcFilename && sfcExpected.has(Number(diagnostic[2]))) sfcObserved.add(Number(diagnostic[2]));
  else unexpected.push(line);
 }
 assert.equal(unexpected.length, 0, `Unexpected type errors:\n${unexpected.join('\n')}`);
 assert.equal(result.status, 2, `Type checker did not reject invalid contracts:\n${result.output}`);
 assert.deepEqual([...expected].filter(line => !observed.has(line)).map(line => cases[line - 1]), [], 'Invalid contracts were accepted');
 for (const line of sfcExpected) assert.ok(sfcObserved.has(line), `Invalid Vue model was accepted: ${sfcCases[line - 1]}`);
 console.log(`Public type contracts: ${expected.size + sfcExpected.size} invalid API/popup/stream/store/Vue usages rejected; positive examples compile`);
} finally {
 await rm(directory, { recursive: true, force: true });
}
