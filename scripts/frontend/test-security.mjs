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
const directory = await mkdtemp(join(tmpdir(), 'misskey-preview-security-'));
let browser, server;
const observations = [];
try {
	await writeFile(join(directory, 'window.vue'), '<template><div style="width:640px;height:402px"><slot/></div></template>');
	await writeFile(join(directory, 'os.ts'), 'export function popup() {}');
	await writeFile(join(directory, 'config.ts'), "export const url='https://local.example'; export const lang='en-US';");
	await writeFile(join(directory, 'i18n.ts'), "export const i18n={ts:{disablePlayer:'Disable',enablePlayer:'Enable',expandTweet:'Expand'}};");
	await writeFile(join(directory, 'device.ts'), "export const deviceKind='smartphone';");
	await writeFile(join(directory, 'entry.ts'), `
import { createApp, h, nextTick } from 'vue';
import Preview from ${JSON.stringify(resolve(client, 'src/components/MkUrlPreview.vue'))};
import Player from ${JSON.stringify(resolve(client, 'src/components/MkYoutubePlayer.vue'))};
import ReferencePreview from ${JSON.stringify(resolve(root, 'scripts/frontend/fixtures/security-v12/MkUrlPreview.vue'))};
import ReferencePlayer from ${JSON.stringify(resolve(root, 'scripts/frontend/fixtures/security-v12/MkYoutubePlayer.vue'))};
let app;
window.fixture = { async mount(reference, kind, summary) {
 app?.unmount(); document.body.innerHTML='<main id="app"></main>'; window.__previewPwned=false;
 window.fetch=async()=>({json:async()=>summary});
 const component=kind==='preview'?(reference?ReferencePreview:Preview):(reference?ReferencePlayer:Player);
 app=createApp({render:()=>h(component,{url:'https://article.example/post'})});
 app.config.globalProperties.$store={state:{animation:false,darkMode:false}};
 app.directive('size',()=>{}); app.mount('#app'); await nextTick(); await nextTick();
} };
`);
	const output = join(directory, 'dist');
	await build({ configFile: false, root: directory, plugins: [vue()], define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false' }, resolve: { alias: [
		{ find: '@/components/MkWindow.vue', replacement: join(directory, 'window.vue') },
		{ find: '@/config', replacement: join(directory, 'config.ts') }, { find: '@/i18n', replacement: join(directory, 'i18n.ts') },
		{ find: '@/os', replacement: join(directory, 'os.ts') }, { find: '@/scripts/device-kind', replacement: join(directory, 'device.ts') },
		{ find: '@', replacement: resolve(client, 'src') }, { find: 'vue', replacement: require.resolve('vue/dist/vue.runtime.esm-bundler.js') },
	] }, build: { outDir: output, emptyOutDir: true, minify: false, lib: { entry: join(directory, 'entry.ts'), formats: ['es'], cssFileName: 'fixture', fileName: () => 'fixture.js' }, rollupOptions: { output: { inlineDynamicImports: true } } }, logLevel: 'warn' });
	server = createServer(async (request, response) => {
		if (request.url === '/fixture.js') { response.setHeader('content-type', 'application/javascript'); response.end(await readFile(join(output, 'fixture.js'))); }
		else if (request.url === '/fixture.css') { response.setHeader('content-type', 'text/css'); response.end(await readFile(join(output, 'fixture.css'))); }
		else response.end('<!doctype html><link rel="stylesheet" href="/fixture.css"><meta charset="utf-8"><main id="app"></main><script type="module" src="/fixture.js"></script>');
	});
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const base = `http://127.0.0.1:${server.address().port}`;
	browser = await chromium.launch({ ...(process.env.REGRESSION_CHROMIUM ? { executablePath: process.env.REGRESSION_CHROMIUM } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
	const page = await browser.newPage();
	page.on('pageerror', error => console.error('Preview fixture:', error.message));
	await page.route('**/*', route => route.request().url().startsWith(base) || route.request().url().startsWith('javascript:') ? route.continue() : route.abort());
	await page.goto(base); await page.waitForFunction(() => window.fixture);
	const summary = { url: 'https://article.example/post', title: 'Article', description: 'normal description', sitename: 'Example', icon: null, thumbnail: 'https://image.example/normal.png', player: { url: 'https://player.example/embed?keep=1', width: 640, height: 360 } };
	const mount = async (reference, kind, value = summary) => {
		await page.evaluate(async ({ reference, kind, value }) => window.fixture.mount(reference, kind, value), { reference, kind, value });
		await page.locator(kind === 'preview' ? '.mk-url-preview .link' : '.player iframe').waitFor();
	};
	for (const kind of ['preview', 'player']) {
		const results = [];
		for (const reference of [true, false]) {
			await mount(reference, kind);
			if (kind === 'preview') await page.locator('.thumbnail button').click();
			const frame = page.locator('iframe').first(); await frame.waitFor();
			results.push(await frame.evaluate(element => ({ src: element.getAttribute('src'), width: element.getAttribute('width'), height: element.getAttribute('height'), allow: element.getAttribute('allow') })));
		}
		assert.deepEqual(results[1], results[0], `Valid ${kind} behavior changed`); observations.push({ kind, validPlayerPreserved: true });
	}
	for (const reference of [true, false]) {
		await mount(reference, 'preview', { ...summary, thumbnail: "https://image.example/');position:fixed;inset:0;background:red;/*" });
		const position = await page.locator('.thumbnail').evaluate(element => getComputedStyle(element).position);
		if (reference) assert.equal(position, 'fixed', 'The old CSS injection must reproduce');
		else assert.notEqual(position, 'fixed', 'CSS injection escaped into another property');
		observations.push({ reference, cssInjection: position === 'fixed' });
	}
	for (const kind of ['preview', 'player']) {
		for (const reference of [true, false]) {
			const malicious = { ...summary, player: { ...summary.player, url: 'javascript:parent.__previewPwned=true//' } };
			await page.evaluate(async ({ reference, kind, value }) => window.fixture.mount(reference, kind, value), { reference, kind, value: malicious });
			if (reference) {
				if (kind === 'preview') await page.locator('.thumbnail button').click();
				await page.waitForFunction(() => window.__previewPwned === true);
			} else {
				await page.waitForFunction(() => !document.querySelector('iframe'));
				assert.equal(await page.evaluate(() => window.__previewPwned), false);
			}
			observations.push({ reference, kind, scriptExecuted: await page.evaluate(() => window.__previewPwned) });
		}
	}
	await mkdir(resolve(root, '.maintenance-frontend/latest'), { recursive: true });
	await writeFile(resolve(root, '.maintenance-frontend/latest/security-compatibility.json'), JSON.stringify(observations, null, 2) + '\n');
	console.log('Preview security: valid v12 players preserved; CSS/script attacks reproduce only on the frozen reference');
} finally {
	await browser?.close();
	if (server) await new Promise(resolve => server.close(resolve));
	await rm(directory, { recursive: true, force: true });
}
