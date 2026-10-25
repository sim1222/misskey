import { Inject, Injectable } from '@nestjs/common';
import summaly from 'summaly';
import Ajv from 'ajv';
import { DI } from '@/di-symbols.js';
import type { UsersRepository } from '@/models/index.js';
import type { Config } from '@/config.js';
import { MetaService } from '@/core/MetaService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import type Logger from '@/logger.js';
import { query } from '@/misc/prelude/url.js';
import { LoggerService } from '@/core/LoggerService.js';
import type Koa from 'koa';

interface PreviewSummary {
	title?: string | null;
	icon?: string | null;
	thumbnail?: string | null;
	player?: { url?: string | null } | null;
}
const validateSummary = new Ajv().compile<PreviewSummary>({
	type: 'object', properties: {
		title: { type: ['string', 'null'] },
		icon: { type: ['string', 'null'] },
		thumbnail: { type: ['string', 'null'] },
		player: { type: ['object', 'null'], properties: { url: { type: ['string', 'null'] } } },
	},
});

@Injectable()
export class UrlPreviewService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private metaService: MetaService,
		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('url-preview');
	}

	private wrap(url?: string | null): string | null {
		if (!this.isHttpUrl(url)) return null;
		return `${this.config.url}/proxy/preview.webp?${query({ url, preview: '1' })}`;
	}

	private isHttpUrl(value: unknown): value is string {
		if (typeof value !== 'string') return false;
		try {
			const url = new URL(value);
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	public async handle(ctx: Koa.Context) {
		const url = ctx.query.url;
		if (typeof url !== 'string') {
			ctx.status = 400;
			return;
		}
	
		const lang = ctx.query.lang;
		if (Array.isArray(lang)) {
			ctx.status = 400;
			return;
		}
	
		const meta = await this.metaService.fetch();
	
		this.logger.info(meta.summalyProxy
			? `(Proxy) Getting preview of ${url}@${lang} ...`
			: `Getting preview of ${url}@${lang} ...`);
	
		try {
			const summary = meta.summalyProxy ? await this.httpRequestService.getJson(`${meta.summalyProxy}?${query({
				url: url,
				lang: lang ?? 'ja-JP',
			})}`) : await summaly.default(url, {
				followRedirects: false,
				lang: lang ?? 'ja-JP',
				agents: { http: this.httpRequestService.httpAgent, https: this.httpRequestService.httpsAgent },
			});
	
			if (!validateSummary(summary)) throw new Error('Invalid preview response');

			this.logger.succ(`Got preview of ${url}: ${summary.title}`);
	
			summary.icon = this.wrap(summary.icon);
			summary.thumbnail = this.wrap(summary.thumbnail);
			if (summary.player && !this.isHttpUrl(summary.player.url)) summary.player.url = null;
	
			// Cache 7days
			ctx.set('Cache-Control', 'max-age=604800, immutable');
	
			ctx.body = summary;
		} catch (err) {
			this.logger.warn(`Failed to get preview of ${url}: ${err}`);
			ctx.status = 200;
			ctx.set('Cache-Control', 'max-age=86400, immutable');
			ctx.body = '{}';
		}
	}
}
