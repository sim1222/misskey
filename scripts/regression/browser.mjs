import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

export async function browserScenarios(f, o) {
	const browser = await chromium.launch({
		...(process.env.REGRESSION_CHROMIUM ? { executablePath: process.env.REGRESSION_CHROMIUM } : {}),
		headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
	});
	const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Asia/Tokyo', viewport: { width: 1280, height: 900 } });
	const errors = [];
	const failures = [];
	const requests = [];
	await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
	// Decorative entrance animations otherwise keep moving the login button while
	// Playwright waits for a stable hit target. Application actions remain real.
	await context.addInitScript(() => {
		document.addEventListener('DOMContentLoaded', () => {
			const style = document.createElement('style');
			style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
			document.head.append(style);
		});
	});
	await context.route('**/*', route => {
		const url = new URL(route.request().url());
		return url.origin === f.base || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
	});
	const page = await context.newPage();
	page.setDefaultTimeout(15000);
	page.on('pageerror', error => errors.push(error.message));
	page.on('response', response => {
		if (response.url().startsWith(f.base)) {
			requests.push({ path: new URL(response.url()).pathname, status: response.status() });
			if (response.status() >= 500) failures.push({ path: new URL(response.url()).pathname, status: response.status() });
		}
	});
	try {
		for (const path of ['/', '/about', '/explore']) {
			await page.goto(f.base + path);
			await page.waitForFunction(() => (document.querySelector('#misskey_app')?.textContent?.trim().length ?? 0) > 10);
			const font = await page.evaluate(() => getComputedStyle(document.documentElement).fontFamily);
			assert.match(font, /Arial|Roboto/);
			o.record(`browser anonymous ${path}`, { rendered: true, cssApplied: true });
		}
		await page.goto(f.base);
		await page.locator('[data-cy-signin]').click();
		await page.locator('[data-cy-signin-username] input').fill('regalice');
		await page.locator('[data-cy-signin-password] input').fill('regression-pass-24');
		const signin = page.waitForResponse(response => response.url() === `${f.base}/api/signin`);
		await page.locator('[data-cy-signin-password] input').press('Enter');
		assert.equal((await signin).status(), 200);
		await page.locator('[data-cy-open-post-form]').first().waitFor({ state: 'visible' });
		o.record('browser signin', { status: 200, composerVisible: true });
		await page.locator('[data-cy-open-post-form]').first().click();
		await page.locator('[data-cy-post-form-text]').last().fill('Browser regression 日本語 🌱');
		const submitted = page.waitForResponse(response => response.url() === `${f.base}/api/notes/create`);
		await page.locator('[data-cy-open-post-form-submit]').last().click();
		const response = await submitted;
		assert.equal(response.status(), 200);
		const note = (await response.json()).createdNote;
		o.alias(note.id, 'browser-note');
		await page.getByText('Browser regression 日本語', { exact: false }).first().waitFor({ state: 'visible' });
		o.record('browser post appears in timeline', { text: note.text, visibility: note.visibility });
		for (const path of ['/settings', '/my/drive', '/my/notifications']) {
			await page.goto(f.base + path);
			await page.locator('[data-cy-open-post-form]').first().waitFor({ state: 'visible' });
			assert.ok((await page.locator('#misskey_app').innerText()).trim().length > 10);
			o.record(`browser signed-in ${path}`, { rendered: true });
		}
		await page.screenshot({ path: resolve(f.output, 'browser.png'), fullPage: true });
		assert.deepEqual(errors, [], 'Uncaught browser exceptions');
		assert.deepEqual(failures, [], 'Browser HTTP 5xx');
	} finally {
		await writeFile(resolve(f.output, 'browser.json'), JSON.stringify({ errors, failures, requests }, null, 2) + '\n');
		await page.screenshot({ path: resolve(f.output, 'browser-final.png'), fullPage: true }).catch(() => {});
		await context.tracing.stop({ path: resolve(f.output, 'browser-trace.zip') });
		await browser.close();
	}
}
