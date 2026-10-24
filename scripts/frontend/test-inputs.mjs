import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../', import.meta.url));
const client = resolve(root, 'packages/client');
const require = createRequire(resolve(client, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: vue } = await import(pathToFileURL(require.resolve('@vitejs/plugin-vue')).href);
const directory = await mkdtemp(join(tmpdir(), 'misskey-input-contracts-'));
let browser, server;
const observations = [];
try {
 const referenceButton = await readFile(new URL('fixtures/button-v12.vue.txt', import.meta.url), 'utf8');
 const referenceInput = (await readFile(new URL('fixtures/input-v12.vue.txt', import.meta.url), 'utf8')).replace("'@/components/MkButton.vue'", "'./reference-button.vue'");
 await writeFile(join(directory, 'reference-button.vue'), referenceButton);
 await writeFile(join(directory, 'reference-input.vue'), referenceInput);
 await writeFile(join(directory, 'fixture.mjs'), `
import { createApp, h, ref, nextTick } from 'vue';
import TextInput from ${JSON.stringify(resolve(client, 'src/components/form/input.vue'))};
import NumberInput from ${JSON.stringify(resolve(client, 'src/components/form/number-input.vue'))};
import ReferenceInput from './reference-input.vue';
let app, model, events, component;
const encoded = value => value === undefined ? { kind: 'undefined' } : Number.isNaN(value) ? { kind: 'NaN' } : value;
window.inputFixture = {
 mount(reference, kind, props) {
  app?.unmount(); document.body.innerHTML = '<div id="host"></div>';
  model = ref(props.modelValue); events = []; component = ref();
  const target = reference ? ReferenceInput : kind === 'number' ? NumberInput : TextInput;
  app = createApp({ setup: () => () => h(target, { ...props, ref: component, modelValue: model.value,
   'onUpdate:modelValue': value => { events.push({ type: 'update', value: encoded(value) }); model.value = value; },
   onChange: event => events.push({ type: 'change', event: event.type }),
   onKeydown: event => events.push({ type: 'keydown', key: event.key }),
   onEnter: () => events.push({ type: 'enter' }),
  }, { label: () => 'Fixture label' }) });
  app.mount('#host');
 },
 async tick() { await nextTick(); await nextTick(); },
 focus() { component.value.focus(); },
 read() {
  const input = document.querySelector('#host input');
  const attributes = Object.fromEntries([...input.attributes].filter(item => !item.name.startsWith('data-v-')).map(item => [item.name, item.name === 'list' ? '<generated-list-id>' : item.value]).sort(([a], [b]) => a.localeCompare(b)));
  const rect = input.getBoundingClientRect();
  return { model: encoded(model.value), value: input.value, type: input.type, attributes, events,
   dimensions: { width: rect.width, height: rect.height },
   saveVisible: !!document.querySelector('#host .save'), hasFocusMethod: typeof component.value.focus === 'function' };
 }
};`);
 const meta = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
 await build({ configFile: false, root: client, logLevel: 'error', plugins: [vue()],
  resolve: { alias: { '@': resolve(client, 'src'), vue: resolve(client, 'node_modules/vue/dist/vue.runtime.esm-bundler.js') }, dedupe: ['vue', 'throttle-debounce'] },
  define: { 'process.env.NODE_ENV': '"production"', _VERSION_: JSON.stringify(meta.version), _LANGS_: '[]', _ENV_: '"test"', _DEV_: 'false', _PERF_PREFIX_: '"Misskey:"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false' },
  build: { outDir: join(directory, 'dist'), emptyOutDir: true, minify: false, lib: { entry: join(directory, 'fixture.mjs'), name: 'InputContracts', formats: ['iife'], fileName: () => 'fixture.js', cssFileName: 'fixture' } },
 });
 const dist = join(directory, 'dist');
 const assets = new Map();
 for (const file of await readdir(dist)) assets.set('/' + file, await readFile(join(dist, file)));
 server = createServer((request, response) => {
  if (request.url === '/') { response.setHeader('content-type', 'text/html'); response.end('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/fixture.css"><script defer src="/fixture.js"></script>'); return; }
  const asset = assets.get(request.url);
  if (!asset) { response.statusCode = 404; response.end(); return; }
  response.setHeader('content-type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(asset);
 });
 await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
 const base = `http://127.0.0.1:${server.address().port}`;
 browser = await chromium.launch({ ...(process.env.REGRESSION_CHROMIUM ? { executablePath: process.env.REGRESSION_CHROMIUM } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
 const page = await browser.newPage();
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
 await page.goto(base);
 try { await page.waitForFunction(() => !!window.inputFixture, undefined, { timeout: 5000 }); } catch (error) { throw new Error('Input fixture failed to initialize: ' + JSON.stringify(errors), { cause: error }); }
 const cases = [
  { name: 'text', kind: 'text', props: { modelValue: 'before' }, value: '日本語 <text> & emoji 🌱', enter: true },
  { name: 'nullable text', kind: 'text', props: { modelValue: null }, value: 'after' },
  { name: 'empty text', kind: 'text', props: { modelValue: 'before' }, value: '' },
  { name: 'number zero', kind: 'number', props: { modelValue: 0, type: 'number' }, value: '12.5', enter: true },
  { name: 'negative number', kind: 'number', props: { modelValue: 1, type: 'number' }, value: '-23' },
  { name: 'empty number keeps NaN', kind: 'number', props: { modelValue: 1, type: 'number' }, value: '' },
  { name: 'manual text save', kind: 'text', props: { modelValue: 'before', manualSave: true }, value: 'saved' },
  { name: 'manual number save', kind: 'number', props: { modelValue: 0, type: 'number', manualSave: true }, value: '45' },
  { name: 'debounced text', kind: 'text', props: { modelValue: 'before', debounce: true }, value: 'later', debounce: true },
  { name: 'readonly', kind: 'text', props: { modelValue: 'unchanged', readonly: true } },
  { name: 'disabled', kind: 'number', props: { modelValue: 0, type: 'number', disabled: true } },
  { name: 'attributes and datalist', kind: 'text', props: { modelValue: '', autocomplete: 'off', required: true, placeholder: 'Hint', datalist: ['one', 'two'] }, value: 'one' },
 ];
 async function exercise(reference, scenario) {
  await page.evaluate(({ reference, scenario }) => window.inputFixture.mount(reference, scenario.kind, scenario.props), { reference, scenario });
  await page.evaluate(() => window.inputFixture.tick());
  if (scenario.value !== undefined) {
   await page.locator('#host input').fill(scenario.value);
   if (scenario.enter) await page.locator('#host input').press('Enter');
   if (scenario.props.manualSave) await page.locator('#host button.save').click();
   if (scenario.debounce) await page.waitForTimeout(1100);
  }
  await page.evaluate(() => window.inputFixture.tick());
  return page.evaluate(() => window.inputFixture.read());
 }
 for (const scenario of cases) {
  const before = await exercise(true, scenario), after = await exercise(false, scenario);
  delete before.hasFocusMethod; delete after.hasFocusMethod;
  // An invalid autocomplete token uses the browser's default (on). Compare that
  // effective setting, and retain the original attributes in the report.
  const effective = observation => ({ ...observation, attributes: { ...observation.attributes, autocomplete: observation.attributes.autocomplete === 'false' ? 'on' : observation.attributes.autocomplete } });
  assert.deepEqual(effective(after), effective(before), scenario.name);
  observations.push({ name: scenario.name, before, after, effectiveBehaviorIdentical: true });
 }
 await page.evaluate(() => window.inputFixture.mount(false, 'text', { modelValue: 'secret', type: 'password', withPasswordToggle: true }));
 await page.locator('#host button.password-toggle').click();
 assert.equal(await page.locator('#host input').getAttribute('type'), 'text');
 assert.equal(await page.locator('#host input').inputValue(), 'secret');
 await page.locator('#host button.password-toggle').click();
 assert.equal(await page.locator('#host input').getAttribute('type'), 'password');
 await page.evaluate(() => window.inputFixture.focus());
 assert.equal(await page.locator('#host input').evaluate(input => input === document.activeElement), true);
 observations.push({ name: 'password toggle and exposed focus', fixed: true });
 await page.evaluate(() => window.inputFixture.mount(false, 'text', { modelValue: '', autocomplete: false }));
 assert.equal(await page.locator('#host input').getAttribute('autocomplete'), 'off');
 observations.push({ name: 'boolean autocomplete false means off', fixed: true });
 assert.deepEqual(errors, []);
 const reportDirectory = process.env.FRONTEND_REPORT_DIR ?? resolve(root, '.maintenance-frontend/latest');
 await mkdir(reportDirectory, { recursive: true });
 await writeFile(join(reportDirectory, 'input-compatibility.json'), JSON.stringify({ reference: 'a2bf98497eedc02a43c9fcce7d3f58eb169a26cb', observations, errors }, null, 2) + '\n');
 console.log(`Frontend inputs: ${cases.length} reference comparisons, 2 explicit bug-fix scenarios passed`);
} finally {
 await browser?.close();
 if (server) await new Promise(ok => server.close(ok));
 await rm(directory, { recursive: true, force: true });
}
