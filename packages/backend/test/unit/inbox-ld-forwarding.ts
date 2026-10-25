import { generateKeyPairSync } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { DI } from '@/di-symbols.js';
import { InboxProcessorService } from '@/queue/processors/InboxProcessorService.js';
import { QueueLoggerService } from '@/queue/QueueLoggerService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { MetaService } from '@/core/MetaService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { FetchInstanceMetadataService } from '@/core/FetchInstanceMetadataService.js';
import { ApRequestService } from '@/core/remote/activitypub/ApRequestService.js';
import { ApPersonService } from '@/core/remote/activitypub/models/ApPersonService.js';
import { ApDbResolverService } from '@/core/remote/activitypub/ApDbResolverService.js';
import { LdSignatureService } from '@/core/remote/activitypub/LdSignatureService.js';
import { ApInboxService } from '@/core/remote/activitypub/ApInboxService.js';
import InstanceChart from '@/core/chart/charts/instance.js';
import ApRequestChart from '@/core/chart/charts/ap-request.js';
import FederationChart from '@/core/chart/charts/federation.js';
import { validateActivity } from '@/core/remote/activitypub/validate-activity.js';

describe('Forwarded LD-signed activities use only the verified meaning', () => {
	const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
	const actor = 'https://signer.example/users/alice';
	const user = { id: 'remote-user', uri: actor, host: 'signer.example' };
	const perform = jest.fn().mockImplementation(async () => {});
	const logger = { debug: jest.fn(), createSubLogger: () => logger };
	const module = Test.createTestingModule({ providers: [InboxProcessorService, LdSignatureService,
		{ provide: DI.config, useValue: { url: 'https://local.example' } },
		{ provide: DI.instancesRepository, useValue: { update: async () => {} } }, { provide: DI.driveFilesRepository, useValue: {} },
		{ provide: UtilityService, useValue: { toPuny: (value: string) => value, extractDbHost: (value: string) => new URL(value).hostname } },
		{ provide: MetaService, useValue: { fetch: async () => ({ blockedHosts: [] }) } },
		{ provide: ApInboxService, useValue: { performActivity: perform } },
		{ provide: FederatedInstanceService, useValue: { registerOrFetchInstanceDoc: async () => ({ id: 'instance' }) } },
		{ provide: FetchInstanceMetadataService, useValue: { fetchInstanceMetadata: async () => {} } },
		{ provide: ApDbResolverService, useValue: { getAuthUserFromKeyId: async () => ({ user, key: { keyPem: keys.publicKey } }) } },
		{ provide: ApPersonService, useValue: { resolvePerson: async () => user } },
		{ provide: HttpRequestService, useValue: { getResponse: async () => { throw new Error('Context unavailable'); } } },
		{ provide: QueueLoggerService, useValue: { logger } }, { provide: ApRequestService, useValue: {} },
		{ provide: InstanceChart, useValue: { requestReceived: () => {} } }, { provide: ApRequestChart, useValue: { inbox: () => {} } }, { provide: FederationChart, useValue: { inbox: () => {} } },
	] }).compile();
	afterAll(async () => { await (await module).close(); });
	beforeEach(() => perform.mockClear());
	const signed = async () => (await module).get(LdSignatureService).use().signRsaSignature2017({
		'@context': 'https://www.w3.org/ns/activitystreams', type: 'Create', id: 'https://signer.example/activities/1', actor,
		object: { type: 'Note', id: 'https://signer.example/notes/1', attributedTo: actor, content: 'original' },
	}, keys.privateKey, `${actor}#key`);
	async function process(activity: unknown) {
		if (!validateActivity(activity)) throw new Error('Test activity must pass the inbox wire schema');
		return (await module).get(InboxProcessorService).process({ data: { activity, signature: {
			keyId: `${actor}#key`, algorithm: 'RSA-SHA256', signingString: 'a different HTTP transport',
			params: { keyId: `${actor}#key`, algorithm: 'rsa-sha256', headers: ['date'], signature: Buffer.alloc(256).toString('base64') },
		} } });
	}
	it('preserves valid forwarded activities', async () => {
		expect(await process(await signed())).toBe('ok');
		expect(perform).toHaveBeenCalledWith(user, expect.objectContaining({ actor, object: expect.objectContaining({ content: 'original' }) }));
	});
	it('never passes unsigned shadow fields to the activity handlers', async () => {
		const activity = await signed();
		activity['@context'] = ['https://www.w3.org/ns/activitystreams', { content: null, signedContent: 'https://www.w3.org/ns/activitystreams#content' }];
		activity.object = { ...activity.object, content: 'forged', signedContent: 'original' };
		expect(await process(activity)).toBe('ok');
		expect(JSON.stringify(perform.mock.calls)).not.toContain('forged');
		expect(perform).toHaveBeenCalledWith(user, expect.objectContaining({ object: expect.objectContaining({ content: 'original' }) }));
	});
	it('rejects a modified signature timestamp', async () => {
		const activity = await signed(); activity.signature.created = '2000-01-01T00:00:00Z';
		expect(await process(activity)).toContain('LD-Signatureの検証に失敗'); expect(perform).not.toHaveBeenCalled();
	});
	it('rejects context fetching errors without processing the original unnormalized input', async () => {
		const activity = await signed(); activity['@context'] = 'https://unavailable.example/context';
		expect(await process(activity)).toBe('skip: failed to compact LD-signature activity'); expect(perform).not.toHaveBeenCalled();
	});
	it('rejects a compacted object which has lost its ActivityPub type', async () => {
		const activity = await signed(); activity['@context'] = ['https://www.w3.org/ns/activitystreams', { type: 'https://untrusted.example/type' }];
		expect(await process(activity)).toBe('skip: invalid compacted LD-signature activity'); expect(perform).not.toHaveBeenCalled();
	});
});
