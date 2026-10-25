import { generateKeyPairSync } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { Response } from 'node-fetch';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { LdSignatureService } from '@/core/remote/activitypub/LdSignatureService.js';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const actor = 'https://signer.example/users/alice';
const document = () => ({
	'@context': 'https://www.w3.org/ns/activitystreams',
	type: 'Create', id: 'https://signer.example/activities/1', actor,
	object: { type: 'Note', id: 'https://signer.example/notes/1', attributedTo: actor, content: 'original 日本語', to: ['https://www.w3.org/ns/activitystreams#Public'] },
});

describe('LD-signatures bind the verified ActivityPub document', () => {
	const fetch = jest.fn<HttpRequestService['getResponse']>().mockRejectedValue(new Error('Unexpected external context request'));
	const module = Test.createTestingModule({ providers: [LdSignatureService, { provide: HttpRequestService, useValue: { getResponse: fetch } }] }).compile();
	const service = async () => (await module).get(LdSignatureService).use();
	afterAll(async () => { await (await module).close(); });
	beforeEach(() => fetch.mockClear());

	it('canonicalizes to N-Quads and binds changes to the document', async () => {
		const ld = await service();
		const original = await ld.normalize(document());
		expect(typeof original).toBe('string');
		expect(original).toContain('original 日本語');
		expect(await ld.normalize({ ...document(), actor: 'https://attacker.example/users/evil' })).not.toBe(original);
		expect(fetch).not.toHaveBeenCalled();
	});
	it('accepts a valid signature and JSON key reordering', async () => {
		const signed = await (await service()).signRsaSignature2017(document(), keys.privateKey, `${actor}#main-key`);
		expect(await (await service()).verifyRsaSignature2017(signed, keys.publicKey)).toBe(true);
		expect(await (await service()).verifyRsaSignature2017(Object.fromEntries(Object.entries(signed).reverse()), keys.publicKey)).toBe(true);
	});
	it.each(['actor', 'content', 'recipient', 'id', 'created', 'domain', 'nonce'])('rejects a signature replay with altered %s', async field => {
		const signed = await (await service()).signRsaSignature2017(document(), keys.privateKey, `${actor}#main-key`, 'https://recipient.example');
		if (field === 'actor') signed.actor = 'https://attacker.example/users/evil';
		if (field === 'content') signed.object.content = 'forged';
		if (field === 'recipient') signed.object.to = ['https://attacker.example/users/evil'];
		if (field === 'id') signed.object.id = 'https://signer.example/notes/forged';
		if (field === 'created') signed.signature.created = '2000-01-01T00:00:00Z';
		if (field === 'domain') signed.signature.domain = 'https://attacker.example';
		if (field === 'nonce') signed.signature.nonce = 'changed';
		expect(await (await service()).verifyRsaSignature2017(signed, keys.publicKey)).toBe(false);
	});
	it('processes the signed meaning instead of an unsigned field hidden by a context override', async () => {
		const signed = await (await service()).signRsaSignature2017(document(), keys.privateKey, `${actor}#main-key`);
		const forged = { ...signed, '@context': ['https://www.w3.org/ns/activitystreams', { content: null, signedContent: 'https://www.w3.org/ns/activitystreams#content' }], object: { ...signed.object, content: 'forged', signedContent: signed.object.content } };
		const ld = await service();
		// Safe canonicalization rejects the discarded field. Compaction must
		// restore the signed meaning before any application code can consume it.
		await expect(ld.verifyRsaSignature2017(forged, keys.publicKey)).rejects.toThrow();
		const { signature, ...unsigned } = forged;
		const compacted = await ld.compact(unsigned);
		expect(compacted).toMatchObject({ object: { content: 'original 日本語' } });
		expect(JSON.stringify(compacted)).not.toContain('forged');
		expect(await ld.verifyRsaSignature2017({ ...compacted, signature }, keys.publicKey)).toBe(true);
	});
	it('loads each context once and freezes the interpretation used for compaction and verification', async () => {
		const url = 'https://contexts.example/one';
		const data = { ...document(), '@context': ['https://www.w3.org/ns/activitystreams', url] };
		const context = () => new Response(JSON.stringify({ '@context': { extra: 'https://contexts.example/extra' } }));
		fetch.mockResolvedValueOnce(context());
		const signed = await (await service()).signRsaSignature2017(data, keys.privateKey, `${actor}#main-key`);
		fetch.mockClear(); fetch.mockResolvedValueOnce(context());
		const ld = await service();
		const { signature, ...unsigned } = signed;
		const compacted = await ld.compact(unsigned);
		ld.freeze();
		expect(await ld.verifyRsaSignature2017({ ...compacted, signature }, keys.publicKey)).toBe(true);
		expect(await ld.verifyRsaSignature2017(signed, keys.publicKey)).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(1);
		await expect(ld.normalize({ '@context': 'https://contexts.example/new', type: 'Create' })).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(1);
	});
	it.each(['@included', '@graph', '@reverse'])('rejects nested %s that can change which signed node is processed', async directive => {
		const ld = await service();
		expect(() => ld.checkForForbiddenDirectives({ object: [{ [directive]: { content: 'hidden' } }] })).toThrow(/Forbidden JSON-LD/);
		expect(() => ld.checkForForbiddenDirectives(document())).not.toThrow();
	});
	it('rejects an aliased graph directive after compaction', async () => {
		const ld = await service();
		const compacted = await ld.compact({ ...document(), '@context': ['https://www.w3.org/ns/activitystreams', { hidden: '@graph' }], hidden: document() });
		expect(() => ld.checkForForbiddenDirectives(compacted)).toThrow(/Forbidden JSON-LD/);
	});
	it('refuses context URLs outside HTTP(S)', async () => {
		await expect((await service()).normalize({ '@context': 'file:///etc/passwd' })).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
	it('bounds the number of cached external contexts', async () => {
		fetch.mockImplementation(async () => new Response(JSON.stringify({ '@context': {} })));
		const ld = await service();
		for (let i = 0; i < 256; i++) await ld.normalize({ ...document(), '@context': ['https://www.w3.org/ns/activitystreams', `https://contexts.example/${i}`] });
		await expect(ld.normalize({ ...document(), '@context': ['https://www.w3.org/ns/activitystreams', 'https://contexts.example/overflow'] })).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(256);
	});
	it('bounds the canonicalizer work for symmetric blank-node graphs', async () => {
		const graph = Array.from({ length: 9 }, (_, i) => ({ '@id': `_:b${i}`, link: Array.from({ length: 9 }, (_, j) => j).filter(j => j !== i).map(j => `_:b${j}`) }));
		await expect((await service()).normalize({ '@context': { link: { '@id': 'https://example.test/link', '@type': '@id' } }, '@graph': graph })).rejects.toThrow(/Maximum deep iterations/);
	});
});
