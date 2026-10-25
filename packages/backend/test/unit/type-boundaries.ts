import { createServer } from 'node:http';
import { once } from 'node:events';
import { loadConfig } from '@/config.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { validateActivity } from '@/core/remote/activitypub/validate-activity.js';
import { I18n } from '@/misc/i18n.js';
import { genOpenapiSpec } from '@/server/api/openapi/gen-spec.js';
import endpoints from '@/server/api/endpoints.js';
import { refs } from '@/misc/schema.js';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { AppLockService } from '@/core/AppLockService.js';

describe('Validated boundaries and generated API contracts', () => {
	const actor = 'https://remote.example/users/friend';
	const note = {
		type: 'Note', id: `${actor}/notes/1`, attributedTo: actor,
		content: '<p>hello</p>', summary: null, name: null,
		to: ['https://www.w3.org/ns/activitystreams#Public'], cc: [],
		inReplyTo: null, attachment: [], tag: [],
		replies: { id: `${actor}/notes/1/replies`, type: 'Collection', first: { type: 'CollectionPage', items: [] } },
	};

	it('accepts Mastodon-style Create notes without modifying extension data', () => {
		const value = { '@context': ['https://www.w3.org/ns/activitystreams', { toot: 'http://joinmastodon.org/ns#' }], type: 'Create', actor, object: note, extension: { value: '日本語' } };
		const before = JSON.stringify(value);
		expect(validateActivity(value)).toBe(true);
		expect(JSON.stringify(value)).toBe(before);
	});
	it('accepts report URI arrays, Like URIs, and inbox collections', () => {
		expect(validateActivity({ type: 'Flag', actor, object: [actor, note.id] })).toBe(true);
		expect(validateActivity({ type: 'Like', actor, object: note.id })).toBe(true);
		expect(validateActivity({ type: 'OrderedCollection', actor, orderedItems: [{ type: 'Create', actor, object: note }] })).toBe(true);
	});
	it.each([null, '2030-01-01T00:00:00.000Z', undefined])('accepts federated polls with endTime %j without rewriting their deadline', endTime => {
		const value = { type: 'Create', actor, object: { ...note, type: 'Question', endTime, oneOf: [{ type: 'Note', name: 'one', replies: { type: 'Collection', totalItems: 0 } }] } };
		const before = JSON.stringify(value);
		expect(validateActivity(value)).toBe(true);
		expect(JSON.stringify(value)).toBe(before);
	});
	it.each([123, {}, []])('rejects a malformed poll endTime %j', endTime => {
		expect(validateActivity({ type: 'Create', actor, object: { ...note, type: 'Question', endTime } })).toBe(false);
	});
	it.each([undefined, null, [], {}, { type: 'Create', actor }, { type: 12, actor, object: note }, { type: 'Create', actor: 12, object: note }, { type: 'Create', actor, object: { type: 'Note', to: [12] } }])('rejects malformed inbox data: %j', value => {
		expect(validateActivity(value)).toBe(false);
	});
	it('keeps translated text and interpolation, and handles missing/non-string locale paths', () => {
		const locale = new I18n({ mail: { subject: 'Hello {name}' } });
		expect(locale.t('mail.subject', { name: '友人' })).toBe('Hello 友人');
		expect(locale.t('missing')).toBe('missing');
		expect(locale.t('mail')).toBe('mail');
	});
	it('restores /api.json generation without mutating endpoint validators or response schemas', () => {
		const before = JSON.stringify({ params: endpoints.map(endpoint => endpoint.params), refs });
		const document = genOpenapiSpec(loadConfig());
		expect(document.openapi).toBe('3.0.0');
		const upload = document.paths['/drive/files/create'].post.requestBody.content['multipart/form-data'].schema;
		expect(upload.properties?.file).toMatchObject({ type: 'string', format: 'binary' });
		expect(upload.required).toContain('file');
		expect(upload.required).toContain('i');
		expect(JSON.stringify({ params: endpoints.map(endpoint => endpoint.params), refs })).toBe(before);
		expect(genOpenapiSpec(loadConfig())).toEqual(document);
	});
	it('uses the configured HTTP agent and aborts slow requests', async () => {
		const service = new HttpRequestService({ ...loadConfig(), allowedPrivateNetworks: ['127.0.0.1/32'] });
		const server = createServer((request, response) => {
			if (request.url === '/slow') {
				setTimeout(() => { response.end('{}'); }, 200);
			} else if (request.url === '/within-legacy-deadline') {
				setTimeout(() => { response.end('{}'); }, 100);
			} else {
				response.setHeader('Content-Type', 'application/json');
				response.end(JSON.stringify({ message: '日本語' }));
			}
		});
		server.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const address = server.address();
		if (address == null || typeof address === 'string') throw new Error('Expected a TCP fixture');
		try {
			expect(await service.getJson(`http://127.0.0.1:${address.port}/`)).toEqual({ message: '日本語' });
			// The old AbortController allowed six times the supplied timeout.
			expect(await service.getJson(`http://127.0.0.1:${address.port}/within-legacy-deadline`, 'application/json', 50)).toEqual({});
			await expect(service.getJson(`http://127.0.0.1:${address.port}/slow`, 'application/json', 10)).rejects.toMatchObject({ name: 'AbortError' });
		} finally {
			service.httpAgent.destroy();
			service.httpsAgent.destroy();
			server.closeAllConnections();
			await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
		}
	});
	it('honors the Redis lock custom promisifier and releases competing locks', async () => {
		const config = loadConfig();
		const client = new Redis({ host: config.redis.host, port: config.redis.port, db: config.redis.db ?? 0, password: config.redis.pass });
		const service = new AppLockService(client);
		const key = randomUUID();
		try {
			const unlock = await service.getApLock(key, 2000);
			let acquired = false;
			const next = service.getApLock(key, 2000).then(release => { acquired = true; return release; });
			await new Promise(resolve => setTimeout(resolve, 20));
			expect(acquired).toBe(false);
			expect(await unlock()).toBe(1);
			const release = await next;
			expect(acquired).toBe(true);
			expect(await release()).toBe(1);
		} finally { await client.quit(); }
	});
});
