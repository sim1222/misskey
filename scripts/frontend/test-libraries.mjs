import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../', import.meta.url));
const client = resolve(root, 'packages/client');
const require = createRequire(resolve(client, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: vue } = await import(pathToFileURL(require.resolve('@vitejs/plugin-vue')).href);
const directory = await mkdtemp(join(client, '.frontend-library-contracts-'));
let browser, server;
try {
 await writeFile(join(directory, 'fixture.mjs'), `
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { createApp, h, ref, nextTick } from 'vue';
import Draggable from 'vuedraggable';
Chart.register(zoomPlugin);
let chart, app, items, events;
const rounded = value => Math.round(value * 100) / 100;
window.libraryFixture = {
 chart(type) {
  chart?.destroy(); document.body.innerHTML = '<canvas width="640" height="320"></canvas>';
  chart = new Chart(document.querySelector('canvas'), {
   type, data: { labels: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'], datasets: [{ label: 'Contract', data: [-2, 0, 4, 8], borderColor: '#123456', backgroundColor: '#abcdef', tension: 0.3 }] },
   options: { responsive: false, animation: false, plugins: { legend: { display: false }, zoom: { zoom: { mode: 'x', wheel: { enabled: true } } } }, scales: { x: { type: 'time', time: { unit: 'day' } }, y: { beginAtZero: true } } },
  });
 },
 readChart() {
  return { data: [...chart.data.datasets[0].data], labels: [...chart.data.labels],
   scales: Object.fromEntries(['x','y'].map(key => [key, { min: chart.scales[key].min, max: chart.scales[key].max, ticks: chart.scales[key].ticks.map(tick => tick.label) }])),
   points: chart.getDatasetMeta(0).data.map(point => ({ x: rounded(point.x), y: rounded(point.y) })),
  };
 },
 zoom() { chart.zoom(1.25); }, resetZoom() { chart.resetZoom(); },
 tooltip() { chart.tooltip.setActiveElements([{ datasetIndex: 0, index: 2 }], { x: 320, y: 160 }); chart.update(); return { title: [...chart.tooltip.title], body: chart.tooltip.body.map(item => item.lines) }; },
 mountDrag() {
  chart?.destroy(); chart = undefined; app?.unmount(); document.body.innerHTML = '<div id="host"></div>'; items = ref([{ id:'a' },{ id:'b' },{ id:'c' }]); events=[];
  app = createApp({ setup: () => () => h(Draggable, { modelValue: items.value, itemKey:'id', animation: 0, forceFallback: true,
   'onUpdate:modelValue': value => { items.value = value; }, onChange: change => { if(change.moved) events.push({ id: change.moved.element.id, oldIndex: change.moved.oldIndex, newIndex: change.moved.newIndex }); },
  }, { item: ({element}) => h('div', { class:'drag-item', 'data-id':element.id, style:'width:160px;height:50px;border:1px solid black;' }, element.id) }) }); app.mount('#host');
 },
 async tick() { await nextTick(); await nextTick(); },
 readDrag() { return { order: items.value.map(item => item.id), dom: [...document.querySelectorAll('.drag-item')].map(item => item.dataset.id), events: [...events] }; },
};
`);
 const result = await build({ configFile: false, root: client, logLevel: 'error', plugins: [vue()], resolve: { alias: { vue: require.resolve('vue/dist/vue.runtime.esm-bundler.js') }, dedupe: ['vue'] }, define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false' }, build: { write: false, minify: false, lib: { entry: join(directory, 'fixture.mjs'), formats: ['iife'], name: 'LibraryContracts', fileName: 'fixture' } } });
 const outputs = Array.isArray(result) ? result.flatMap(item => item.output) : result.output;
 const assets = new Map(outputs.map(asset => ['/' + asset.fileName, asset.type === 'asset' ? asset.source : asset.code]));
 const script = outputs.find(asset => asset.type === 'chunk' && asset.isEntry).fileName;
 server = createServer((request, response) => {
  if (request.url === '/') { response.setHeader('content-type', 'text/html'); response.end(`<script defer src="/${script}"></script>`); return; }
  const asset=assets.get(request.url); if(asset==null){ response.statusCode=404; response.end(); return; }
  response.setHeader('content-type','text/javascript'); response.end(asset);
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({...(process.env.REGRESSION_CHROMIUM?{executablePath:process.env.REGRESSION_CHROMIUM}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'UTC',locale:'en-US'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base);try{await page.waitForFunction(()=>!!window.libraryFixture,undefined,{timeout:5000});}catch(error){throw new Error('Library fixture failed: '+JSON.stringify(errors),{cause:error});}
 const observations={};
 for(const type of ['line','bar']){
  await page.evaluate(type=>window.libraryFixture.chart(type),type);
  const initial=await page.evaluate(()=>window.libraryFixture.readChart());
  assert.deepEqual(initial.data,[-2,0,4,8]);
  const tooltip=await page.evaluate(()=>window.libraryFixture.tooltip());
  await page.evaluate(()=>window.libraryFixture.zoom());
  const zoomed=await page.evaluate(()=>window.libraryFixture.readChart());
  assert.ok(zoomed.scales.x.min>initial.scales.x.min);assert.ok(zoomed.scales.x.max<initial.scales.x.max);
  await page.evaluate(()=>window.libraryFixture.resetZoom());
  const reset=await page.evaluate(()=>window.libraryFixture.readChart());assert.deepEqual(reset,initial);
  observations[type]={initial,tooltip,zoomed,reset};
 }
 await page.evaluate(()=>window.libraryFixture.mountDrag());await page.evaluate(()=>window.libraryFixture.tick());
 const first=await page.locator('.drag-item').first().boundingBox();const last=await page.locator('.drag-item').last().boundingBox();
 await page.mouse.move(first.x+30,first.y+25);await page.mouse.down();await page.mouse.move(first.x+35,first.y+30,{steps:3});await page.waitForTimeout(100);await page.mouse.move(last.x+30,last.y+45,{steps:20});await page.waitForTimeout(100);await page.mouse.up();await page.evaluate(()=>window.libraryFixture.tick());
 observations.drag=await page.evaluate(()=>window.libraryFixture.readDrag());assert.deepEqual(observations.drag.order,['b','c','a']);assert.deepEqual(observations.drag.dom,['b','c','a']);assert.deepEqual(observations.drag.events,[{id:'a',oldIndex:0,newIndex:2}]);
 assert.deepEqual(errors,[]);
 const baseline=new URL('library-baseline.json',import.meta.url);
 if(process.argv.includes('--record'))await writeFile(baseline,JSON.stringify(observations,null,2)+'\n');
 else assert.deepEqual(observations,JSON.parse(await readFile(baseline,'utf8')),'Frontend dependency behavior changed');
 const reportDirectory=process.env.FRONTEND_REPORT_DIR??resolve(root,'.maintenance-frontend/latest');await mkdir(reportDirectory,{recursive:true});
 await writeFile(join(reportDirectory,'library-compatibility.json'),JSON.stringify({observations,errors},null,2)+'\n');
 console.log('Frontend libraries: line/bar rendering, tooltips, zoom/reset and actual drag reorder passed');
}finally{await browser?.close();if(server)await new Promise(ok=>server.close(ok));await rm(directory,{recursive:true,force:true});}
