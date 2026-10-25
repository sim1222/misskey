import { createHash, generateKeyPairSync } from 'node:crypto';
import { request } from 'node:http';
import type { Server } from 'node:http';
import Koa from 'koa';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import httpSignature from '@peertube/http-signature';
import { DI } from '@/di-symbols.js';
import { ActivityPubServerService } from '@/server/ActivityPubServerService.js';
import { QueueService } from '@/core/QueueService.js';
import { QueryService } from '@/core/QueryService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { UserKeypairStoreService } from '@/core/UserKeypairStoreService.js';
import { ApRendererService } from '@/core/remote/activitypub/ApRendererService.js';

describe('ActivityPub HTTP authentication envelope (GHSA-3f39-6537-3cgc)', () => {
	const keys = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
	const enqueue = jest.fn();
	const config = { url: 'https://local.example', host: 'local.example' };
	const module = Test.createTestingModule({ providers: [ActivityPubServerService,
		{ provide: DI.config, useValue: config }, { provide: QueueService, useValue: { inbox: enqueue } },
		...[DI.usersRepository, DI.userProfilesRepository, DI.notesRepository, DI.noteReactionsRepository, DI.emojisRepository, DI.userNotePiningsRepository, DI.followingsRepository, UtilityService, UserEntityService, ApRendererService, UserKeypairStoreService, QueryService].map(provide => ({ provide, useValue: {} })),
	] }).compile();
	let server: Server;
	let port: number;
	beforeAll(async () => {
		const app = new Koa();
		app.use((await module).get(ActivityPubServerService).createRouter().routes());
		await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Expected a TCP fixture');
		port = address.port;
	});
	afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await (await module).close(); });
	beforeEach(() => enqueue.mockClear());
	const body = JSON.stringify({ type: 'Create', actor: 'https://peer.example/alice', object: { type: 'Note', content: '日本語' } });
	const send = (options: { path?: string; signedHeaders?: string[]; body?: string; host?: string; date?: string; xDate?: string; digest?: string; authorization?: boolean } = {}) => new Promise<number>((resolve, reject) => {
		const req = request({ host: '127.0.0.1', port, path: options.path ?? '/inbox', method: 'POST', headers: {
			host: options.host ?? config.host, date: options.date ?? new Date().toUTCString(),
			digest: options.digest ?? `SHA-256=${createHash('sha256').update(body).digest('base64')}`, 'content-type': 'application/activity+json',
		} }, res => { res.resume(); res.once('end', () => resolve(res.statusCode ?? 0)); });
		req.once('error', reject);
		if (options.xDate) req.setHeader('x-date', options.xDate);
		httpSignature.sign(req, { key: keys.privateKey, keyId: 'https://peer.example/alice#key', headers: options.signedHeaders ?? ['(request-target)', 'host', 'date', 'digest'] });
		if (!options.authorization) { req.setHeader('signature', String(req.getHeader('authorization')).replace(/^Signature /i, '')); req.removeHeader('authorization'); }
		req.end(options.body ?? body);
	});
	it.each(['/inbox', '/users/alice/inbox'])('accepts the existing correctly signed UTF-8 request on %s', async path => {
		expect(await send({ path })).toBe(202); expect(enqueue).toHaveBeenCalledTimes(1);
	});
	it('rejects a body substituted after signing its digest', async () => { expect(await send({ body: body.replace('日本語', 'forged') })).toBe(401); expect(enqueue).not.toHaveBeenCalled(); });
	it('preserves the signed X-Date alternative', async () => { expect(await send({ xDate: new Date().toUTCString(), signedHeaders: ['(request-target)', 'host', 'x-date', 'digest'] })).toBe(202); expect(enqueue).toHaveBeenCalledTimes(1); });
	it('preserves HTTP Signature in Authorization', async () => { expect(await send({ authorization: true })).toBe(202); expect(enqueue).toHaveBeenCalledTimes(1); });
	it.each(['(request-target)', 'host', 'date', 'digest'])('rejects an unsigned %s', async missing => { expect(await send({ signedHeaders: ['(request-target)', 'host', 'date', 'digest'].filter(h => h !== missing) })).toBe(401); expect(enqueue).not.toHaveBeenCalled(); });
	it('rejects a signature made for a different receiving host', async () => { expect(await send({ host: 'another.example' })).toBe(401); expect(enqueue).not.toHaveBeenCalled(); });
	it('rejects an expired request', async () => { expect(await send({ date: new Date(Date.now() - 60 * 60 * 1000).toUTCString() })).toBe(401); });
	it.each(['SHA-1=YWJj', 'SHA-256=bad', 'unparseable'])('rejects a malformed/unsupported digest %s', async digest => { expect(await send({ digest })).toBe(401); expect(enqueue).not.toHaveBeenCalled(); });
});
