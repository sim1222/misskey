import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createVerify } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire('/misskey/packages/backend/package.json');
const { Client } = require('pg');
const Bull = require('bull');
const peers = ['alpha', 'beta', 'gamma'].map(name => ({ name, base: `https://${name}.federation.test`, db: new Client({ host: 'postgres', user: 'postgres', database: `federation_${name}` }), queues: ['deliver', 'inbox'].map(queue => new Bull(queue, { prefix: `federation_${name}:queue`, redis: { host: 'redis', port: 6379 } })) }));
const [alpha, beta, gamma] = peers;
const results = [];

async function eventually(check, description, timeout = 30000) {
	let error;
	const deadline = Date.now() + timeout;
	do {
		try { return await check(); } catch (reason) { error = reason; }
		await delay(100);
	} while (Date.now() < deadline);
	throw new Error(`Timed out: ${description}`, { cause: error });
}
async function api(peer, endpoint, params = {}, user = peer.user, expected = 200) {
	const response = await fetch(`${peer.base}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...params, ...(user ? { i: user.token } : {}) }), signal: AbortSignal.timeout(15000) });
	const text = await response.text();
	assert.equal(response.status, expected, `${peer.name} ${endpoint}: ${text.slice(0, 1500)}`);
	return text ? JSON.parse(text) : null;
}
async function observed(name, action) {
	try { const detail = await action(); results.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
	catch (error) { results.push({ name, passed: false, error: error.stack, cause: String(error.cause?.stack ?? error.cause ?? '') }); throw error; }
}
async function quiet() {
	let consecutive = 0;
	await eventually(async () => {
		for (const peer of peers) for (const queue of peer.queues) {
			const counts = await queue.getJobCounts();
			if ((counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0) + (counts.failed ?? 0) > 0) { consecutive = 0; assert.fail(`${peer.name}/${queue.name}: ${JSON.stringify(counts)}`); }
		}
		assert.ok(++consecutive >= 3, 'Queue drain must remain stable over consecutive observations');
	}, 'all peers delivered and processed their queues');
}
async function remoteNote(peer, uri) {
	return eventually(async () => {
		const { rows } = await peer.db.query('SELECT id,uri,text,visibility,"userId","replyId","renoteId","fileIds" FROM note WHERE uri=$1', [uri]);
		assert.equal(rows.length, 1, `${peer.name} must persist ${uri}`);
		return rows[0];
	}, `remote note on ${peer.name}`);
}
const uri = (peer, note) => `${peer.base}/notes/${note.id}`;
async function post(peer, params) { return (await api(peer, 'notes/create', params)).createdNote; }
async function wire(peer) {
	try { return (await readFile(`/evidence/${peer.name}-wire.jsonl`, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
	catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

try {
	for (const peer of peers) {
		await peer.db.connect();
		const { rows: [version] } = await peer.db.query("SELECT current_setting('server_version_num')::integer AS number");
		assert.ok(version.number >= 180000 && version.number < 190000);
		await eventually(() => api(peer, 'meta', {}, null), `${peer.name} HTTPS readiness`, 60000);
		peer.admin = await api(peer, 'admin/accounts/create', { username: 'admin', password: 'federation-admin-password' }, null);
		await api(peer, 'admin/update-meta', { disableRegistration: false }, peer.admin, 204);
		peer.user = await api(peer, 'signup', { username: peer.name === 'alpha' ? 'alice' : peer.name === 'beta' ? 'bob' : 'carol', password: 'federation-user-password' }, null);
		peer.actor = `${peer.base}/users/${peer.user.id}`;
	}
	const actors = {};
	await observed('HTTPS discovery obtains real actors and distinct keys', async () => {
		for (const [source, destination] of [[alpha, beta], [beta, alpha], [gamma, alpha]]) {
			const resolved = await api(source, 'ap/show', { uri: destination.actor });
			assert.equal(resolved.type, 'User');
			assert.equal(resolved.object.host, `${destination.name}.federation.test`);
			actors[`${source.name}:${destination.name}`] = resolved.object.id;
		}
		const keys = await Promise.all(peers.map(async peer => (await peer.db.query('SELECT "publicKey" FROM user_keypair WHERE "userId"=$1', [peer.user.id])).rows[0].publicKey));
		assert.equal(new Set(keys).size, 3);
		return { peers: peers.length, distinctKeys: keys.length, postgresMajor: 18 };
	});
	await observed('Follow and Accept complete in both directions and on a third peer', async () => {
		for (const [source, destination] of [[alpha, beta], [beta, alpha], [gamma, alpha]]) {
			await api(source, 'following/create', { userId: actors[`${source.name}:${destination.name}`] });
			await eventually(async () => {
				const { rows } = await source.db.query('SELECT "followerId","followeeId" FROM following WHERE "followerId"=$1 AND "followeeId"=$2', [source.user.id, actors[`${source.name}:${destination.name}`]]);
				assert.equal(rows.length, 1);
			}, 'follow accepted');
		}
		await quiet();
		assert.ok((await wire(beta)).some(row => row.activity?.type === 'Follow'));
		assert.ok((await wire(alpha)).some(row => row.activity?.type === 'Accept'));
	});
	let publicNote;
	await observed('Create is delivered, verified and stored on two real peers', async () => {
		publicNote = await post(alpha, { text: 'Federation 日本語 public 🌱', visibility: 'public' });
		for (const peer of [beta, gamma]) {
			const note = await remoteNote(peer, uri(alpha, publicNote));
			assert.equal(note.text, publicNote.text); assert.equal(note.visibility, 'public');
		}
		await quiet();
	});
	await observed('Reply travels from beta back to alpha', async () => {
		const target = await remoteNote(beta, uri(alpha, publicNote));
		const reply = await post(beta, { text: 'Federation reply 日本語', replyId: target.id });
		const received = await remoteNote(alpha, uri(beta, reply));
		assert.equal(received.replyId, publicNote.id); assert.equal(received.text, reply.text);
		await quiet();
	});
	await observed('Like and Undo change the originating server reaction rows', async () => {
		const target = await remoteNote(beta, uri(alpha, publicNote));
		await api(beta, 'notes/reactions/create', { noteId: target.id, reaction: '👍' }, beta.user, 204);
		await eventually(async () => assert.equal((await alpha.db.query('SELECT count(*)::integer AS n FROM note_reaction WHERE "noteId"=$1', [publicNote.id])).rows[0].n, 1), 'remote Like stored');
		await quiet();
		await api(beta, 'notes/reactions/delete', { noteId: target.id }, beta.user, 204);
		await eventually(async () => assert.equal((await alpha.db.query('SELECT count(*)::integer AS n FROM note_reaction WHERE "noteId"=$1', [publicNote.id])).rows[0].n, 0), 'remote Like undone');
		await quiet();
	});
	await observed('Announce becomes a renote on the receiving server', async () => {
		const target = await remoteNote(beta, uri(alpha, publicNote));
		const renote = await post(beta, { renoteId: target.id });
		// A pure Announce is identified by its Activity URI, unlike a Note.
		const received = await remoteNote(alpha, `${uri(beta, renote)}/activity`);
		assert.equal(received.renoteId, publicNote.id);
		await quiet();
	});
	await observed('Direct note reaches beta and never reaches following peer gamma', async () => {
		const direct = await post(alpha, { text: 'Only beta can read this 日本語', visibility: 'specified', visibleUserIds: [actors['alpha:beta']] });
		const received = await remoteNote(beta, uri(alpha, direct));
		assert.equal(received.visibility, 'specified'); assert.equal(received.text, direct.text);
		const shown = await api(beta, 'notes/show', { noteId: received.id });
		assert.equal(shown.text, direct.text);
		const anonymous = await api(beta, 'notes/show', { noteId: received.id }, null);
		assert.equal(anonymous.isHidden, true); assert.ok(anonymous.text == null);
		await quiet();
		assert.equal((await gamma.db.query('SELECT count(*)::integer AS n FROM note WHERE uri=$1', [uri(alpha, direct)])).rows[0].n, 0);
		assert.ok(!(await wire(gamma)).some(row => row.activity?.object?.id === uri(alpha, direct)));
		const response = await fetch(uri(alpha, direct), { headers: { accept: 'application/activity+json' } });
		assert.equal(response.status, 404);
	});
	await observed('Undo Follow stops followers-only delivery to gamma', async () => {
		await api(gamma, 'following/delete', { userId: actors['gamma:alpha'] });
		await quiet();
		await eventually(async () => assert.equal((await alpha.db.query('SELECT count(*)::integer AS n FROM following f JOIN "user" u ON u.id=f."followerId" WHERE f."followeeId"=$1 AND u.host=$2', [alpha.user.id, 'gamma.federation.test'])).rows[0].n, 0), 'gamma unfollow propagated');
		const note = await post(alpha, { text: 'Followers-only 日本語', visibility: 'followers' });
		const received = await remoteNote(beta, uri(alpha, note));
		assert.equal(received.text, note.text); assert.equal(received.visibility, 'followers');
		await quiet();
		assert.equal((await gamma.db.query('SELECT count(*)::integer AS n FROM note WHERE uri=$1', [uri(alpha, note)])).rows[0].n, 0);
		assert.ok(!(await wire(gamma)).some(row => row.activity?.object?.id === uri(alpha, note)));
	});
	await observed('Home note preserves audience and text over federation', async () => {
		const note = await post(alpha, { text: 'Home federation note', visibility: 'home' });
		const received = await remoteNote(beta, uri(alpha, note));
		assert.equal(received.visibility, 'home'); assert.equal(received.text, note.text);
		await quiet();
	});
	await observed('Following again restores delivery after Undo Follow', async () => {
		await api(gamma, 'following/create', { userId: actors['gamma:alpha'] });
		await eventually(async () => assert.equal((await gamma.db.query('SELECT count(*)::integer AS n FROM following WHERE "followerId"=$1 AND "followeeId"=$2', [gamma.user.id, actors['gamma:alpha']])).rows[0].n, 1), 'gamma follow accepted again');
		await quiet();
		const note = await post(alpha, { text: 'Following again 日本語', visibility: 'followers' });
		assert.equal((await remoteNote(gamma, uri(alpha, note))).visibility, 'followers');
		await quiet();
	});
	await observed('Poll vote returns over federation and updates the original poll', async () => {
		const poll = await post(alpha, { text: 'Federated poll', poll: { choices: ['one', 'two'], multiple: false } });
		const received = await remoteNote(beta, uri(alpha, poll));
		await api(beta, 'notes/polls/vote', { noteId: received.id, choice: 1 }, beta.user, 204);
		await eventually(async () => assert.equal((await alpha.db.query('SELECT votes FROM poll WHERE "noteId"=$1', [poll.id])).rows[0].votes[1], 1), 'federated poll vote');
		await quiet();
	});
	await observed('Remote attachment is fetched over HTTPS with intact original bytes', async () => {
		const image = await readFile('/misskey/packages/backend/test/resources/with-alpha.png');
		const form = new FormData(); form.set('i', alpha.user.token);
		form.set('file', new Blob([image], { type: 'image/png' }), 'federation.png');
		const upload = await fetch(`${alpha.base}/api/drive/files/create`, { method: 'POST', body: form });
		assert.equal(upload.status, 200);
		const file = await upload.json();
		const note = await post(alpha, { text: 'Federated attachment', fileIds: [file.id] });
		const received = await remoteNote(beta, uri(alpha, note));
		const shown = await api(beta, 'notes/show', { noteId: received.id });
		assert.equal(shown.files.length, 1);
		assert.equal(shown.files[0].type, 'image/png');
		assert.equal(shown.files[0].md5, file.md5);
		const downloaded = await fetch(shown.files[0].url);
		assert.equal(downloaded.status, 200);
		assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), image);
		await quiet();
	});
	await observed('Profile Update refreshes the remote account', async () => {
		await api(alpha, 'i/update', { name: 'Alice updated 日本語' });
		await eventually(async () => assert.equal((await beta.db.query('SELECT name FROM "user" WHERE uri=$1', [alpha.actor])).rows[0].name, 'Alice updated 日本語'), 'remote profile update');
		await quiet();
	});
	await observed('A temporary peer 503 is retried without duplicate notes', async () => {
		const response = await fetch(`${beta.base}/__fixture__/fail-next-inbox`, { method: 'POST' });
		assert.equal(response.status, 204);
		const note = await post(alpha, { text: 'Retry federation contract' });
		const job = await eventually(async () => {
			const delayed = await alpha.queues[0].getDelayed();
			const target = delayed.find(candidate => candidate.data.to.startsWith(beta.base) && candidate.data.content.object?.id === uri(alpha, note));
			assert.ok(target); assert.equal(target.attemptsMade, 1); return target;
		}, 'failed delivery scheduled for retry');
		// Exercise the real retry processor immediately; production backoff duration
		// is not changed or replaced in the application configuration.
		await job.promote();
		await remoteNote(beta, uri(alpha, note));
		await quiet();
		assert.equal((await beta.db.query('SELECT count(*)::integer AS n FROM note WHERE uri=$1', [uri(alpha, note)])).rows[0].n, 1);
		const attempts = (await wire(beta)).filter(row => row.activity?.object?.id === uri(alpha, note));
		assert.deepEqual(attempts.map(attempt => attempt.status), [503, 202]);
	});
	await observed('Delete removes the federated note from both recipients', async () => {
		await api(alpha, 'notes/delete', { noteId: publicNote.id }, alpha.user, 204);
		for (const peer of [beta, gamma]) await eventually(async () => assert.equal((await peer.db.query('SELECT count(*)::integer AS n FROM note WHERE uri=$1', [uri(alpha, publicNote)])).rows[0].n, 0), 'remote deletion');
		await quiet();
	});
	await observed('Every peer inbox request has an intact digest and verifiable HTTP signature', async () => {
		let messages = 0;
		const keys = new Map();
		for (const peer of peers) for (const entry of await wire(peer)) {
			assert.equal(entry.digest, entry.bodyDigest);
			assert.ok(entry.signature, 'Missing HTTP signature');
			const keyId = /keyId="([^"]+)"/.exec(entry.signature)?.[1];
			const signature = /signature="([^"]+)"/.exec(entry.signature)?.[1];
			const headers = /headers="([^"]+)"/.exec(entry.signature)?.[1].split(' ');
			assert.ok(keyId && signature && headers);
			if (!keys.has(keyId)) {
				const actor = await (await fetch(keyId.split('#')[0], { headers: { accept: 'application/activity+json' } })).json();
				keys.set(keyId, actor.publicKey.publicKeyPem);
			}
			const signingString = headers.map(name => `${name}: ${name === '(request-target)' ? `${entry.method.toLowerCase()} ${entry.path}` : entry[name]}`).join('\n');
			assert.ok(createVerify('RSA-SHA256').update(signingString).verify(keys.get(keyId), signature, 'base64'), `Invalid signature: ${entry.activity?.type}`);
			messages++;
		}
		assert.ok(messages >= 15);
		return { signedMessages: messages, actorKeys: keys.size };
	});
	await observed('No unhandled server exceptions occurred on any peer', async () => {
		for (const peer of peers) {
			let text = '';
			try { text = await readFile(`/evidence/${peer.name}-errors.jsonl`, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
			assert.equal(text.trim(), '', `${peer.name}: ${text}`);
		}
	});
} finally {
	await writeFile('/evidence/scenarios.json', JSON.stringify(results, null, 2) + '\n');
	await writeFile('/evidence/summary.md', ['# Multi-container federation', '', ...results.map(result => `- ${result.passed ? 'PASS' : 'FAIL'} ${result.name}`), ''].join('\n'));
	for (const peer of peers) { await Promise.all(peer.queues.map(queue => queue.close())); await peer.db.end(); }
}
