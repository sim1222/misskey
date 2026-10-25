import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { once } from 'node:events';
import Koa from 'koa';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { DI } from '@/di-symbols.js';
import { loadConfig } from '@/config.js';
import { MetaService } from '@/core/MetaService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { UrlPreviewService } from '@/server/web/UrlPreviewService.js';

describe('URL preview preserves metadata and rejects unsafe network/content', () => {
	let target: Server;
	let server: Server;
	let base: string;
	let targetBase: string;
	const paths: string[] = [];
	const metadata = { summalyProxy: null as string | null };
	const getJson = jest.fn<HttpRequestService['getJson']>();
	const network = new HttpRequestService({ ...loadConfig(), allowedPrivateNetworks: ['127.0.0.1/32'] });
	const logger = { info: jest.fn(), succ: jest.fn(), warn: jest.fn() };
	const module = Test.createTestingModule({ providers: [UrlPreviewService,
		{ provide: DI.config, useValue: { url: 'https://local.example' } }, { provide: DI.usersRepository, useValue: {} },
		{ provide: MetaService, useValue: { fetch: async () => metadata } },
		{ provide: HttpRequestService, useValue: { httpAgent: network.httpAgent, httpsAgent: network.httpsAgent, getJson } },
		{ provide: LoggerService, useValue: { getLogger: () => logger } },
	] }).compile();
	beforeAll(async () => {
		target = createServer((req, res) => {
			paths.push(req.url ?? '');
			res.setHeader('content-type', req.url === '/article' ? 'text/html; charset=utf-8' : 'image/png');
			res.end(req.url === '/article' ? '<html><title>Article 日本語</title><meta property="og:description" content="Some &amp; text"><meta property="og:site_name" content="Site"><meta property="og:image" content="/image.png"><meta property="twitter:player" content="https://player.example/embed?keep=1"><meta property="twitter:player:width" content="640"><meta property="twitter:player:height" content="360"><link rel="icon" href="/icon.png"></html>' : 'image');
		});
		target.listen(0, '127.0.0.1'); await once(target, 'listening');
		const targetAddress = target.address(); if (!targetAddress || typeof targetAddress === 'string') throw new Error('TCP fixture required');
		targetBase = `http://127.0.0.1:${targetAddress.port}`;
		const app = new Koa(); app.use(ctx => (module.then(m => m.get(UrlPreviewService).handle(ctx))));
		await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
		const address = server.address(); if (!address || typeof address === 'string') throw new Error('TCP fixture required'); base = `http://127.0.0.1:${address.port}`;
	});
	afterAll(async () => {
		network.httpAgent.destroy(); network.httpsAgent.destroy();
		await Promise.all([target, server].map(value => new Promise<void>((resolve, reject) => value.close(error => error ? reject(error) : resolve()))));
		await (await module).close();
	});
	beforeEach(() => { paths.splice(0); metadata.summalyProxy = null; getJson.mockReset(); logger.warn.mockClear(); });
	const fetchPreview = (url = `${targetBase}/article`) => fetch(`${base}/url?url=${encodeURIComponent(url)}`).then(res => res.json());
	it('retains v12 scraping, Unicode, entities, dimensions and proxy image URLs', async () => {
		const summary = await fetchPreview();
		expect(logger.warn.mock.calls).toEqual([]);
		expect(summary).toEqual({ title: 'Article 日本語', description: 'Some & text', sitename: 'Site', sensitive: false,
			url: `${targetBase}/article`, icon: `https://local.example/proxy/preview.webp?url=${encodeURIComponent(targetBase + '/icon.png')}&preview=1`,
			thumbnail: `https://local.example/proxy/preview.webp?url=${encodeURIComponent(targetBase + '/image.png')}&preview=1`,
			player: { url: 'https://player.example/embed?keep=1', width: 640, height: 360 } });
		expect(paths).toContain('/article'); expect(paths).toContain('/icon.png');
	});
	it('applies the guarded agents to the scraper before any private request is made', async () => {
		expect(await fetchPreview('http://127.0.0.2/private')).toEqual({}); expect(paths).toEqual([]);
	});
	it.each(['javascript:alert(1)', 'data:text/html,script', 'ftp://example.com/x', 'file:///etc/passwd', 'not a URL'])('rejects unsafe preview media/player %s', async url => {
		metadata.summalyProxy = 'https://proxy.example'; getJson.mockResolvedValue({ title: 'Example', url: 'https://article.example/', icon: url, thumbnail: url, player: { url, width: 640, height: 360 } });
		expect(await fetchPreview()).toEqual({ title: 'Example', url: 'https://article.example/', icon: null, thumbnail: null, player: { url: null, width: 640, height: 360 } });
	});
	it('retains safe proxy responses byte for byte apart from existing image wrapping', async () => {
		metadata.summalyProxy = 'https://proxy.example';
		const summary = { title: 'Example', url: 'https://article.example/', icon: null, thumbnail: null, player: { url: 'https://player.example/?keep=1#fragment', width: 0, height: null } };
		getJson.mockResolvedValue(summary); expect(await fetchPreview()).toEqual(summary);
	});
});
