import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isFormResult } from '../../packages/client/src/scripts/form.ts';
import { isNumberInput, isTextInput, parseDialogResult } from '../../packages/client/src/types/dialog.ts';
import { createCanvasApi } from '../../packages/client/src/scripts/aiscript/canvas.ts';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/client/package.json', import.meta.url));
const { values } = require('@syuilo/aiscript');

test('dialog cancellation never becomes a successful empty result', () => {
 assert.deepEqual(parseDialogResult(undefined, isTextInput), { canceled: true });
 assert.deepEqual(parseDialogResult({ canceled: true }, isNumberInput), { canceled: true });
 assert.deepEqual(parseDialogResult({ canceled: false, result: 0 }, isNumberInput), { canceled: false, result: 0 });
 assert.deepEqual(parseDialogResult({ canceled: false, result: '' }, isTextInput), { canceled: false, result: '' });
 assert.deepEqual(parseDialogResult({ canceled: false, result: null }, isTextInput), { canceled: false, result: null });
 assert.throws(() => parseDialogResult({ canceled: false, result: '0' }, isNumberInput), TypeError);
});

test('forms keep false, zero and nullable defaults and reject incompatible results', () => {
 const form = {
  text: { type: 'string', default: null }, count: { type: 'number', default: 0 },
  flag: { type: 'boolean', default: false }, level: { type: 'range', min: 0, max: 1, default: 0 },
  choice: { type: 'enum', default: null, enum: [{ label: 'none', value: null }, { label: 'one', value: 1 }] },
  object: { type: 'object', hidden: true, default: {} }, array: { type: 'array', hidden: true, default: [] },
  button: { type: 'button', action() {} },
 };
 const good = { text: null, count: 0, flag: false, level: 0, choice: null, object: {}, array: [], button: null };
 assert.equal(isFormResult(form, good), true);
 for (const [key, value] of [['count', '0'], ['flag', 0], ['level', null], ['choice', 2], ['object', []], ['array', {}]]) {
  assert.equal(isFormResult(form, { ...good, [key]: value }), false, key);
 }
 const missing = { ...good }; delete missing.flag;
 assert.equal(isFormResult(form, missing), false);
});

test('AiScript canvas preserves coordinates and rejects values of the wrong type', () => {
 const calls = [];
 const ctx = { fillRect: (...args) => calls.push(['fillRect', ...args]), fillText: (...args) => calls.push(['fillText', ...args]) };
 const api = createCanvasApi(ctx).value;
 api.get('fill_rect').native([values.NUM(0), values.NUM(-1), values.NUM(20), values.NUM(30)]);
 api.get('fill_text').native([values.STR('hello'), values.NUM(1), values.NUM(2)]);
 assert.deepEqual(calls, [['fillRect', 0, -1, 20, 30], ['fillText', 'hello', 1, 2, undefined]]);
 assert.throws(() => api.get('fill_rect').native([values.STR('0'), values.NUM(1), values.NUM(2), values.NUM(3)]));
 assert.equal(calls.length, 2);
});

test('storage listeners receive only their key, preserving object identity and registration order', async () => {
 const { StorageWatchers } = await import('../../packages/client/src/scripts/storage-watchers.ts');
 const listeners = new StorageWatchers();
 const object = { name: 'theme' };
 const seen = [];
 listeners.on('theme', value => seen.push(value));
 listeners.on('flag', value => seen.push(value));
 listeners.on('theme', value => seen.push(value));
 listeners.emit('theme', object);
 assert.equal(seen.length, 2);
 assert.equal(seen[0], object);
 assert.equal(seen[1], object);
 listeners.emit('flag', false);
 assert.equal(seen[2], false);
});

test('mouse and touch drags keep coordinates and release every listener on completion', async () => {
 const { listenDrag, getDragPoint } = await import('../../packages/client/src/scripts/drag.ts');
 const target = new EventTarget();
 const seen = [];
 let stops = 0;
 const stop = listenDrag(target, point => seen.push([point.clientX, point.clientY]), () => stops++);
 target.dispatchEvent(Object.assign(new Event('mousemove'), { clientX: 12, clientY: 34 }));
 target.dispatchEvent(Object.assign(new Event('touchmove'), { touches: [{ clientX: 56, clientY: 78 }], changedTouches: [] }));
 assert.equal(getDragPoint({ touches: [], changedTouches: [] }), null);
 target.dispatchEvent(new Event('mouseup'));
 target.dispatchEvent(Object.assign(new Event('mousemove'), { clientX: 90, clientY: 90 }));
 target.dispatchEvent(new Event('touchend'));
 stop();
 assert.deepEqual(seen, [[12, 34], [56, 78]]);
 assert.equal(stops, 1);
});

test('old locale caches retain translations, receive missing defaults and recover from malformed data', async () => {
 const { readLocale, isLocale } = await import('../../packages/shared/locale-runtime.ts');
 const { I18n } = await import('../../packages/shared/i18n.ts');
 const locale = readLocale(JSON.stringify({ password: 'My password', _ad: { like: 'My like' }, customLabel: 'Custom' }));
 assert.equal(isLocale(locale), true);
 assert.equal(locale.password, 'My password');
 assert.equal(locale._ad.like, 'My like');
 assert.equal(typeof locale._ad.reduceFrequencyOfThisAd, 'string');
 assert.equal(isLocale(readLocale('{broken')), true);
 assert.equal(isLocale(readLocale(null)), true);
 const i18n = new I18n(locale);
 assert.equal(i18n.t('customLabel'), 'Custom');
 assert.equal(i18n.t('_ad.like'), 'My like');
 assert.equal(i18n.t('missing.path'), 'missing.path');
 assert.equal(i18n.t('constructor.name'), 'constructor.name');
});

import { composeSettings } from '../../packages/client/src/scripts/compose-settings.ts';
test('composer honors explicit visibility, remembered local-only and default local-only independently', () => {
 for (const rememberNoteVisibility of [false, true]) for (const localOnly of [false, true]) for (const defaultNoteLocalOnly of [false, true]) {
  const preferences = { rememberNoteVisibility, localOnly, defaultNoteLocalOnly, visibility: 'followers', defaultNoteVisibility: 'home' };
  assert.deepEqual(composeSettings({}, preferences), { visibility: rememberNoteVisibility ? 'followers' : 'home', localOnly: rememberNoteVisibility ? localOnly : defaultNoteLocalOnly });
  for (const explicit of [false, true]) assert.deepEqual(composeSettings({ initialVisibility: 'specified', initialLocalOnly: explicit }, preferences), { visibility: 'specified', localOnly: explicit });
 }
 assert.throws(() => composeSettings({}, { rememberNoteVisibility: true, visibility: 'invalid', localOnly: true, defaultNoteVisibility: 'public', defaultNoteLocalOnly: false }), TypeError);
});

import { modalAnchorPosition } from '../../packages/client/src/scripts/modal-anchor.ts';
test('modal placement keeps center/right/bottom behavior and defines left/top anchors', () => {
 const source = { left: 100, top: 200, width: 40, height: 30 }, content = { width: 60, height: 80 };
 assert.deepEqual(modalAnchorPosition(source, content, { x: 'center', y: 'bottom' }), { left: 90, top: 230 });
 assert.deepEqual(modalAnchorPosition(source, content, { x: 'right', y: 'center' }), { left: 140, top: 160 });
 assert.deepEqual(modalAnchorPosition(source, content, { x: 'left', y: 'top' }), { left: 40, top: 120 });
});

import { noteRequest, requestPoll } from '../../packages/client/src/scripts/note-request.ts';
test('note requests retain content, audience and attachments and convert stored poll dates to API timestamps', () => {
 assert.equal(noteRequest({ text: '', fileIds: [], poll: null }), undefined);
 for (const content of [{ text: 'hello' }, { fileIds: ['file'] }, { mediaIds: ['old-file'] }, { renoteId: 'renote' }, { poll: { choices: ['A', 'B'] } }]) {
  const candidate = { ...content, visibility: 'specified', visibleUserIds: ['friend'], localOnly: true, cw: '' };
  assert.deepEqual(noteRequest(candidate), candidate);
 }
 const poll = { choices: ['A', 'B'], multiple: false, expiresAt: '2026-10-24T00:00:00.000Z' };
 assert.deepEqual(requestPoll(poll), { ...poll, expiresAt: Date.parse(poll.expiresAt) });
 assert.equal(poll.expiresAt, '2026-10-24T00:00:00.000Z');
 assert.equal(requestPoll(null), null);
});

import { isPreferencesProfile } from '../../packages/client/src/scripts/preferences-profile.ts';
test('preference backup round trips retain nested settings and reject wrong types before restoring', () => {
 const profile = {
  name: 'Home', createdAt: '2026-10-24T00:00:00Z', updatedAt: null, misskeyVersion: 'v12', host: 'example.test',
  settings: {
   hot: { visibility: 'specified', localOnly: true, widgets: [{ id: 'w', name: 'memo', place: null, data: { nested: { message: 'keep' } } }], tl: { src: 'local', arg: null } },
   cold: { plugins: [], sound_note: { type: null, volume: 0 } },
   fontSize: null, useSystemFont: 't', wallpaper: 'https://example.test/wallpaper',
  },
 };
 const copy = () => JSON.parse(JSON.stringify(profile));
 const restored = copy();
 assert.equal(isPreferencesProfile(restored), true);
 assert.deepEqual(restored, profile);
 for (const [name, mutate] of [
  ['audience', value => { value.settings.hot.visibility = 'public-ish'; }],
  ['local-only', value => { value.settings.hot.localOnly = 'true'; }],
  ['widget identity', value => { value.settings.hot.widgets[0].id = 1; }],
  ['sound volume', value => { value.settings.cold.sound_note.volume = '0'; }],
  ['theme color', value => { value.settings.cold.lightTheme = { id: 'x', name: 'x', author: 'x', props: { bg: 1 } }; }],
  ['timestamp', value => { value.createdAt = 'not a date'; }],
 ]) { const invalid = copy(); mutate(invalid); assert.equal(isPreferencesProfile(invalid), false, name); }
 const oldProfile = copy(); delete oldProfile.host; oldProfile.settings.hot = {}; oldProfile.settings.cold = {};
 assert.equal(isPreferencesProfile(oldProfile), true, 'older partial backups remain readable');
});

test('the unchanged streaming SDK preserves declared channel frames and event payloads', async () => {
 const { default: Stream } = require('misskey-js/built/streaming');
 const sockets = [];
 class FixtureWebSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  readyState = 0; bufferedAmount = 0; protocol = ''; extensions = ''; binaryType = 'blob';
  sent = [];
  constructor(url) {
   super(); this.url = url; sockets.push(this);
   setTimeout(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); }, 0);
  }
  send(data) { assert.equal(this.readyState, 1); this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; this.dispatchEvent(new Event('close')); }
 }
 const stream = new Stream('https://fixture.invalid', { token: 'fixture-token' }, { WebSocket: FixtureWebSocket });
 try {
  await new Promise((ok, fail) => { stream.once('_connected_', ok); setTimeout(() => fail(new Error('Fixture stream did not connect')), 1000).unref(); });
  const socket = sockets[0];
  const antenna = stream.useChannel('antenna', { antennaId: 'antenna' });
  const messaging = stream.useChannel('messaging', { otherparty: 'other-user' });
  assert.deepEqual(socket.sent, [
   { type: 'connect', body: { channel: 'antenna', id: antenna.id, params: { antennaId: 'antenna' } } },
   { type: 'connect', body: { channel: 'messaging', id: messaging.id, params: { otherparty: 'other-user' } } },
  ]);
  messaging.send('read', { id: 'message' });
  assert.deepEqual(socket.sent.at(-1), { type: 'ch', body: { id: messaging.id, type: 'read', body: { id: 'message' } } });
  const payload = { id: 'note', text: '日本語 🌱', visibility: 'followers', localOnly: false };
  const seen = [];
  antenna.on('note', note => seen.push(note));
  socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'channel', body: { id: antenna.id, type: 'note', body: payload } }) }));
  assert.deepEqual(seen, [payload]);
  assert.equal(antenna.inCount, 1); assert.equal(messaging.outCount, 1);
  antenna.dispose(); messaging.dispose();
  assert.deepEqual(socket.sent.slice(-2), [{ type: 'disconnect', body: { id: antenna.id } }, { type: 'disconnect', body: { id: messaging.id } }]);
 } finally { stream.close(); }
});

test('plugin metadata matches the stored contract and rejects malformed settings', async () => {
 const { isPlugin } = await import('../../packages/client/src/scripts/plugin-contract.ts');
 const { parse } = require('@syuilo/aiscript');
 const { serialize } = require('@syuilo/aiscript/built/serializer');
 const plugin = { id: 'plugin', name: 'Plugin', version: '1', author: 'Author', active: true, configData: {}, token: null, ast: serialize(parse('<: "contract"')),
  permissions: ['read:account'], config: { enabled: { type: 'boolean', label: 'Enabled', default: false } } };
 assert.equal(isPlugin(plugin), true);
 for (const change of [{ name: 1 }, { permissions: 'read:account' }, { config: { wrong: { type: 'invented' } } }, { configData: [] }, { token: 42 }]) {
  assert.equal(isPlugin({ ...plugin, ...change }), false);
 }
});
