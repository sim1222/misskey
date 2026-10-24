import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
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
const directory = await mkdtemp(join(tmpdir(), 'misskey-ui-contracts-'));
let browser, server;
const observations = [];
try {
 for (const name of ['tab', 'radios', 'date-list']) {
  const source = (await readFile(new URL(`fixtures/${name}-v12.vue.txt`, import.meta.url), 'utf8')).replace("'./radio.vue'", JSON.stringify(resolve(client, 'src/components/form/radio.vue')));
  await writeFile(join(directory, `reference-${name}.vue`), source);
 }
 await writeFile(join(directory, 'store.mjs'), "import { reactive } from 'vue'; export const defaultStore = { state: reactive({ animation: false }) };\n");
 await writeFile(join(directory, 'i18n.mjs'), "export const i18n = { t: (key, params) => `${params.month}/${params.day}` };\n");
 await writeFile(join(directory, 'ad.mjs'), "import { h } from 'vue'; export default { props: ['prefer'], setup: props => () => h('aside', { 'data-ad': props.prefer.join(',') }, 'Advertisement') };\n");
 await writeFile(join(directory, 'fixture.mjs'), `
import { createApp, h, ref, nextTick } from 'vue';
import Tab from ${JSON.stringify(resolve(client, 'src/components/MkTab.vue'))};
import Radios from ${JSON.stringify(resolve(client, 'src/components/form/radios.vue'))};
import DateList from ${JSON.stringify(resolve(client, 'src/components/MkDateSeparatedList.vue'))};
import ReferenceTab from './reference-tab.vue';
import ReferenceRadios from './reference-radios.vue';
import ReferenceDateList from './reference-date-list.vue';
import { defaultStore } from './store.mjs';
let app, state, events;
window.uiFixture = {
 mount(reference, kind, options) {
  app?.unmount(); document.body.innerHTML = '<div id="host"></div>'; events = [];
  state = ref(options.modelValue ?? null); defaultStore.state.animation = options.animation ?? false;
  const component = kind === 'tab' ? (reference ? ReferenceTab : Tab) : kind === 'radios' ? (reference ? ReferenceRadios : Radios) : reference ? ReferenceDateList : DateList;
  const { choices, ...componentOptions } = options;
  app = createApp({ setup: () => () => h(component, { ...componentOptions, ...(!reference && (kind === 'tab' || kind === 'radios') ? { choices } : {}), modelValue: state.value,
   class: 'fixture-class', 'data-fixture': 'kept', 'onUpdate:modelValue': value => { events.push(value); state.value = value; },
  }, kind === 'date-list' ? { default: ({ item }) => [h('article', { class: 'note' }, item.id)] } : {
   default: () => options.choices.map((value, index) => h('option', { value }, String(value))), label: () => 'Label', caption: () => 'Caption',
  }) });
  for (const name of ['click-anime', 'size', 'adaptive-border']) app.directive(name, {});
  app.mount('#host');
 },
 async tick() { await nextTick(); await nextTick(); },
 read() {
  const host = document.querySelector('#host');
  function tree(node) {
   if (node.nodeType === Node.COMMENT_NODE) return null;
   if (node.nodeType === Node.TEXT_NODE) return node.textContent;
   return { tag: node.tagName, attrs: Object.fromEntries([...node.attributes].filter(attr => !attr.name.startsWith('data-v-')).map(attr => [attr.name, attr.value]).sort()), children: [...node.childNodes].map(tree).filter(value => value !== null) };
  }
  return { model: state.value, events: [...events], dom: [...host.childNodes].map(tree).filter(value => value !== null) };
 },
};
`);
 const output = await build({ configFile: false, root: directory, logLevel: 'error', plugins: [vue()], define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false' }, resolve: {
  alias: [
   { find: '@/store', replacement: join(directory, 'store.mjs') },
   { find: '@/i18n', replacement: join(directory, 'i18n.mjs') },
   { find: '@/components/global/MkAd.vue', replacement: join(directory, 'ad.mjs') },
   { find: 'vue', replacement: require.resolve('vue/dist/vue.runtime.esm-bundler.js') },
  ],
 }, build: { write: false, minify: false, lib: { entry: join(directory, 'fixture.mjs'), formats: ['es'], fileName: 'fixture' }, rollupOptions: { output: { inlineDynamicImports: true } } } });
 const outputs = Array.isArray(output) ? output.flatMap(item => item.output) : output.output;
 const assets = new Map(outputs.map(asset => ['/' + asset.fileName, asset.type === 'asset' ? asset.source : asset.code]));
 const script = outputs.find(asset => asset.type === 'chunk' && asset.isEntry).fileName;
 const styles = outputs.filter(asset => asset.fileName.endsWith('.css')).map(asset => `<link rel="stylesheet" href="/${asset.fileName}">`).join('');
 server = createServer((request, response) => {
  if (request.url === '/') { response.setHeader('content-type', 'text/html'); response.end(`${styles}<script type="module" src="/${script}"></script>`); return; }
  const asset = assets.get(request.url); if (asset == null) { response.statusCode = 404; response.end(); return; }
  response.setHeader('content-type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(asset);
 });
 await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
 const base = `http://127.0.0.1:${server.address().port}`;
 browser = await chromium.launch({ ...(process.env.REGRESSION_CHROMIUM ? { executablePath: process.env.REGRESSION_CHROMIUM } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
 await page.goto(base);
 try { await page.waitForFunction(() => !!window.uiFixture, undefined, { timeout: 5000 }); } catch (error) { throw new Error('UI fixture failed to initialize: ' + JSON.stringify(errors), { cause: error }); }
 const items = [
  { id: 'new', createdAt: '2026-01-03T01:00:00Z' },
  { id: 'middle', createdAt: '2026-01-03T00:00:00Z', _shouldInsertAd_: true },
  { id: 'old', createdAt: '2026-01-02T00:00:00Z', _shouldInsertAd_: true },
 ];
 const cases = [
  { name: 'string tabs', kind: 'tab', options: { modelValue: 'one', choices: ['one', 'two'] }, click: '#host button:last-child' },
  { name: 'nullable tabs', kind: 'tab', options: { modelValue: null, choices: [null, 'replies', 'files'] }, click: '#host button:last-child' },
  { name: 'string radio choices', kind: 'radios', options: { modelValue: 'one', choices: ['one', 'two'] }, click: '#host .novjtctn:last-child' },
  { name: 'numeric radio choices', kind: 'radios', options: { modelValue: 0, choices: [0, 1] }, click: '#host .novjtctn:last-child' },
  ...[false, true].flatMap(animation => [false, true].map(ad => ({ name: `date separators animation=${animation} ad=${ad}`, kind: 'date-list', options: { items, animation, ad, noGap: true, direction: 'up', reversed: true } }))),
 ];
 for (const testCase of cases) {
  const seen = [];
  for (const reference of [true, false]) {
   await page.evaluate(({ reference, testCase }) => window.uiFixture.mount(reference, testCase.kind, testCase.options), { reference, testCase });
   await page.evaluate(() => window.uiFixture.tick());
   const before = await page.evaluate(() => window.uiFixture.read());
   if (testCase.click) { await page.locator(testCase.click).click(); await page.evaluate(() => window.uiFixture.tick()); }
   const after = await page.evaluate(() => window.uiFixture.read());
   seen.push({ before, after });
  }
  assert.deepEqual(seen[1], seen[0], testCase.name);
  observations.push({ name: testCase.name, reference: seen[0], current: seen[1] });
 }
 assert.deepEqual(errors, []);
 const reportDirectory = process.env.FRONTEND_REPORT_DIR ?? resolve(root, '.maintenance-frontend/latest');
 await mkdir(reportDirectory, { recursive: true });
 await writeFile(join(reportDirectory, 'ui-compatibility.json'), JSON.stringify({ reference: 'a2bf98497eedc02a43c9fcce7d3f58eb169a26cb', observations, errors }, null, 2) + '\n');
 console.log(`Frontend UI: ${cases.length} reference comparisons passed`);
} finally {
 await browser?.close(); if (server) await new Promise(ok => server.close(ok)); await rm(directory, { recursive: true, force: true });
}
