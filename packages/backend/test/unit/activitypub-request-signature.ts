import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { Response } from 'node-fetch';
import { DI } from '@/di-symbols.js';
import { ApRequestService } from '@/core/remote/activitypub/ApRequestService.js';
import { UserKeypairStoreService } from '@/core/UserKeypairStoreService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';

describe('ActivityPub request signatures preserve complete target authorities', () => {
	const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
	const send = jest.fn<HttpRequestService['getResponse']>().mockImplementation(async () => new Response('{}'));
	const module = Test.createTestingModule({ providers: [ApRequestService,
		{ provide: DI.config, useValue: { url: 'https://local.example', userAgent: 'Misskey fixture' } },
		{ provide: HttpRequestService, useValue: { getResponse: send } },
		{ provide: UserKeypairStoreService, useValue: { getUserKeypair: async () => ({ privateKey: keys.privateKey, publicKey: keys.publicKey }) } },
	] }).compile();
	afterAll(async () => { await (await module).close(); });
	beforeEach(() => send.mockClear());
	it.each(['GET', 'POST'])('keeps %s signatures valid for default ports and query targets', async method => {
		for (const address of ['https://peer.example/inbox', 'https://peer.example/inbox?shared=1%20two&mode=3', 'https://peer.example:8443/inbox?shared=1%20two&mode=3']) {
			const service = (await module).get(ApRequestService);
			if (method === 'GET') await service.signedGet(address, { id: 'local' });
			else await service.signedPost({ id: 'local' }, address, { type: 'Create', content: '日本語' });
			const args = send.mock.calls.at(-1)?.[0]; if (!args) throw new Error('Expected an outgoing request');
			const url = new URL(address); const headers = args.headers;
			expect(headers.host).toBe(url.host);
			const signature = /signature="([^"]+)"/.exec(headers.signature)?.[1]; if (!signature) throw new Error('Missing signature');
			const final = method === 'GET' ? `accept: ${headers.accept}` : `digest: ${headers.digest}`;
			const input = [`(request-target): ${method.toLowerCase()} ${url.pathname}${url.search}`, `date: ${headers.date}`, `host: ${url.host}`, final].join('\n');
			expect(verify('sha256', Buffer.from(input), keys.publicKey, Buffer.from(signature, 'base64'))).toBe(true);
			if (method === 'POST') expect(headers.digest).toBe(`SHA-256=${createHash('sha256').update(args.body ?? '').digest('base64')}`);
		}
	});
});
