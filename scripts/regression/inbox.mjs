import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import http from 'node:http';
import { requireBackend, eventually } from './harness.mjs';
import { CONTEXTS } from '../../packages/backend/built/core/remote/activitypub/misc/contexts.js';

export async function inboxScenarios(f, o, alice, localNoteId) {
	const signature = requireBackend('@peertube/http-signature');
	const Bull = requireBackend('bull');
	const remoteId = 'zzzzzzzz01';
	const remote = 'https://peer.example.invalid/users/remote';
	const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
	const invalidTransportKey = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }).privateKey;
	const ldSign = async value => {
		const options = { type: 'RsaSignature2017', creator: `${remote}#main-key`, created: '2024-01-02T03:04:05Z' };
		const normalize = value => requireBackend('jsonld').canonize(value, { algorithm: 'URDNA2015', format: 'application/n-quads', documentLoader: async url => {
			assert.ok(Object.hasOwn(CONTEXTS, url), `Reference signer must not fetch ${url}`);
			return { contextUrl: null, documentUrl: url, document: CONTEXTS[url] };
		} });
		const hash = value => createHash('sha256').update(value).digest('hex');
		const { type: _type, ...proof } = options;
		const input = hash(await normalize({ ...proof, '@context': 'https://w3id.org/identity/v1' })) + hash(await normalize(value));
		return { ...value, signature: { ...options, signatureValue: sign('sha256', Buffer.from(input), privateKey).toString('base64') } };
	};
	// Seed a previously discovered peer. No production identity or private data is
	// required, and public-key resolution cannot trigger an external fetch.
	const { rows: [row] } = await f.db.query('SELECT to_jsonb(u) AS value FROM "user" u WHERE id=$1', [alice.id]);
	const actor = { ...row.value, id: remoteId, username: 'regremote', usernameLower: 'regremote', host: 'peer.example.invalid', uri: remote, inbox: 'https://peer.example.invalid/inbox', sharedInbox: 'https://peer.example.invalid/inbox', token: null, lastFetchedAt: new Date().toISOString(), followersCount: 0, followingCount: 0, notesCount: 0, isAdmin: false, isModerator: false };
	await f.db.query('INSERT INTO "user" SELECT * FROM jsonb_populate_record(NULL::"user", $1::jsonb)', [JSON.stringify(actor)]);
	const { rows: [profile] } = await f.db.query('SELECT to_jsonb(p) AS value FROM user_profile p WHERE "userId"=$1', [alice.id]);
	await f.db.query('INSERT INTO user_profile SELECT * FROM jsonb_populate_record(NULL::user_profile, $1::jsonb)', [JSON.stringify({ ...profile.value, userId: remoteId, password: null })]);
	await f.db.query('INSERT INTO user_publickey ("userId", "keyId", "keyPem") VALUES ($1,$2,$3)', [remoteId, `${remote}#main-key`, publicKey]);
	await f.db.query('INSERT INTO instance (id,host,"caughtAt","lastCommunicatedAt","infoUpdatedAt") VALUES ($1,$2,now(),now(),now())', ['zzzzzzzz02', 'peer.example.invalid']);
	o.alias(remoteId, 'remote-user');
	const prefix = `${f.name}:queue`;
	const queues = ['inbox', 'deliver'].map(name => new Bull(name, { prefix, redis: { host: '127.0.0.1', port: Number(process.env.REGRESSION_REDIS_PORT ?? 56318) } }));
	const [inbox, deliver] = queues;
	const send = async (name, activity, expected = 202, tamper = false, signingKey = privateKey) => {
		let completed;
		let timer;
		const processed = expected === 202 ? new Promise((done, reject) => {
			completed = (_id, result) => { clearTimeout(timer); done(JSON.parse(result)); };
			inbox.once('global:completed', completed);
			timer = setTimeout(() => { inbox.off('global:completed', completed); reject(new Error(`Inbox worker timeout: ${name}`)); }, 15000);
		}) : null;
		const body = JSON.stringify(activity);
		const headers = { host: new URL(f.base).host, date: new Date().toUTCString(), digest: `SHA-256=${createHash('sha256').update(body).digest('base64')}`, 'content-type': 'application/activity+json' };
		const result = await new Promise((done, reject) => {
			const request = http.request(`${f.base}/inbox`, { method: 'POST', headers }, response => {
				response.resume(); response.on('end', () => done(response.statusCode));
			});
			request.on('error', reject);
			request.setTimeout(10000, () => request.destroy(new Error('Signed inbox request timed out')));
			signature.sign(request, { key: signingKey, keyId: `${remote}#main-key`, headers: ['(request-target)', 'host', 'date', 'digest'] });
			if (tamper) request.setHeader('host', 'tampered.invalid');
			request.end(body);
		});
		if (result !== expected) { clearTimeout(timer); if (completed) inbox.off('global:completed', completed); }
		assert.equal(result, expected, name);
		const workerResult = processed ? await processed : null;
		o.record(name, { status: result, workerResult });
		if (expected === 202) await eventually(async () => {
			assert.equal(await inbox.getWaitingCount(), 0);
			assert.equal(await inbox.getActiveCount(), 0);
			assert.equal(await inbox.getDelayedCount(), 0, 'Inbox processing failed and scheduled a retry');
		}, `inbox processed: ${name}`);
	};
	const activity = (type, object, suffix) => ({ '@context': 'https://www.w3.org/ns/activitystreams', id: `https://peer.example.invalid/activities/${suffix}`, type, actor: remote, object });
	try {
		const follow = activity('Follow', `${f.base}/users/${alice.id}`, 'follow');
		await send('signed remote follow', follow);
		await eventually(async () => assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM following WHERE "followerId"=$1 AND "followeeId"=$2', [remoteId, alice.id])).rows[0].n, 1), 'remote following persisted');
		const accepts = await eventually(async () => {
			const jobs = await deliver.getJobs(['waiting', 'active', 'delayed']);
			const accept = jobs.find(job => job.data.content.type === 'Accept');
			assert.ok(accept, 'Follow must enqueue Accept');
			return accept.data;
		}, 'Accept delivery queued');
		o.record('queued activitypub accept', accepts);
		const remoteNote = { id: 'https://peer.example.invalid/notes/contract', type: 'Note', attributedTo: remote, to: ['https://www.w3.org/ns/activitystreams#Public'], cc: [], content: '<p>Remote <strong>日本語</strong> contract</p>', name: null, summary: null, published: '2024-01-02T03:04:05.000Z', attachment: [], tag: [] };
		await send('signed remote create', activity('Create', remoteNote, 'create'));
		const stored = await eventually(async () => {
			const { rows } = await f.db.query('SELECT id,text,visibility,uri,"userId","createdAt" FROM note WHERE uri=$1', [remoteNote.id]);
			assert.equal(rows.length, 1);
			assert.equal(rows[0].createdAt.toISOString(), remoteNote.published);
			return rows[0];
		}, 'remote Note persisted');
		o.record('received remote note row', stored);
		await send('replayed remote create', activity('Create', remoteNote, 'create'));
		const ldSigned = await ldSign(activity('Create', remoteNote, 'create-ld'));
		await send('valid forwarded LD-signed create', ldSigned, 202, false, invalidTransportKey);
		await send('LD-signed content tampering rejected', { ...ldSigned, object: { ...remoteNote, content: 'forged' } }, 202, false, invalidTransportKey);
		await send('LD-signed actor tampering rejected', { ...ldSigned, actor: `${remote}-forged` }, 202, false, invalidTransportKey);
		await send('LD context fetch failure rejected', { ...ldSigned, '@context': `${f.base}/api/__unavailable_ld_context__` }, 202, false, invalidTransportKey);
		await send('LD context hiding activity type rejected', { ...ldSigned, '@context': ['https://www.w3.org/ns/activitystreams', { type: 'https://untrusted.example/type' }] }, 202, false, invalidTransportKey);
		await send('LD graph directive rejected', { ...ldSigned, '@graph': [{ type: 'Note', content: 'hidden' }] }, 202, false, invalidTransportKey);
		const retained = (await f.db.query('SELECT text FROM note WHERE uri=$1', [remoteNote.id])).rows;
		assert.equal(retained.length, 1);
		assert.equal(retained[0].text, stored.text);
		assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM note WHERE uri=$1', [remoteNote.id])).rows[0].n, 1);
		const like = activity('Like', `${f.base}/notes/${localNoteId}`, 'like');
		await send('signed remote like', like);
		await eventually(async () => assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM note_reaction WHERE "userId"=$1 AND "noteId"=$2', [remoteId, localNoteId])).rows[0].n, 1), 'remote reaction persisted');
		await send('signed remote undo like', activity('Undo', like, 'undo-like'));
		await eventually(async () => assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM note_reaction WHERE "userId"=$1', [remoteId])).rows[0].n, 0), 'reaction undone');
		const before = (await f.db.query('SELECT count(*)::integer AS n FROM following WHERE "followerId"=$1', [remoteId])).rows[0].n;
		await send('tampered signature rejected before queue', activity('Undo', follow, 'forged-undo'), 401, true);
		assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM following WHERE "followerId"=$1', [remoteId])).rows[0].n, before);
		await send('signed malformed activity rejected', { type: 'Create', actor: 123, object: {} }, 400);
		await send('signed remote delete', activity('Delete', { type: 'Tombstone', id: remoteNote.id, formerType: 'Note' }, 'delete'));
		await eventually(async () => assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM note WHERE uri=$1', [remoteNote.id])).rows[0].n, 0), 'remote Note deleted');
		await send('signed remote undo follow', activity('Undo', follow, 'undo-follow'));
		await eventually(async () => assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM following WHERE "followerId"=$1', [remoteId])).rows[0].n, 0), 'remote follow undone');
		o.record('federation final effects', { following: 0, remoteNotes: 0, remoteReactions: 0, replayCreatedOneNote: true, invalidSignatureChangedNothing: true });
	} finally { await Promise.all(queues.map(queue => queue.close())); }
}
