import fetch from 'node-fetch';
import Ajv from 'ajv';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { UsersRepository } from '@/models/index.js';
import type { Config } from '@/config.js';
import { HttpRequestService } from './HttpRequestService.js';

type CaptchaResponse = {
	success: boolean;
	'error-codes'?: string[];
};

const validateCaptchaResponse = new Ajv().compile<CaptchaResponse>({
	type: 'object',
	properties: {
		success: { type: 'boolean' },
		'error-codes': { type: 'array', items: { type: 'string' } },
	},
	required: ['success'],
});

@Injectable()
export class CaptchaService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		private httpRequestService: HttpRequestService,
	) {
	}

	private async getCaptchaResponse(url: string, secret: string, response: string): Promise<CaptchaResponse> {
		const params = new URLSearchParams({
			secret,
			response,
		});
	
		const res = await fetch(url, {
			method: 'POST',
			body: params,
			headers: {
				'User-Agent': this.config.userAgent,
			},
			// TODO
			//timeout: 10 * 1000,
			agent: url => this.httpRequestService.getAgentByUrl(url),
		}).catch(err => {
			throw `${err.message ?? err}`;
		});
	
		if (!res.ok) {
			throw `${res.status}`;
		}
	
		const result: unknown = await res.json();
		if (!validateCaptchaResponse(result)) throw new Error('Invalid CAPTCHA response');
		return result;
	}	
	
	public async verifyRecaptcha(secret: string, response: string): Promise<void> {
		const result = await this.getCaptchaResponse('https://www.recaptcha.net/recaptcha/api/siteverify', secret, response).catch(e => {
			throw `recaptcha-request-failed: ${e}`;
		});

		if (result.success !== true) {
			const errorCodes = result['error-codes'] ? result['error-codes'].join(', ') : '';
			throw `recaptcha-failed: ${errorCodes}`;
		}
	}

	public async verifyHcaptcha(secret: string, response: string): Promise<void> {
		const result = await this.getCaptchaResponse('https://hcaptcha.com/siteverify', secret, response).catch(e => {
			throw `hcaptcha-request-failed: ${e}`;
		});

		if (result.success !== true) {
			const errorCodes = result['error-codes'] ? result['error-codes'].join(', ') : '';
			throw `hcaptcha-failed: ${errorCodes}`;
		}
	}
}

