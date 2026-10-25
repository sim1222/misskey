import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { requireBackend, root, eventually } from './harness.mjs';
import { inboxScenarios } from './inbox.mjs';
import { featureScenarios } from './features.mjs';

export async function scenarios(f, o) {
	const api = o.api.bind(o);
	const password = 'regression-pass-24';
	const admin = await api('bootstrap administrator', 'admin/accounts/create', { username: 'regadmin', password });
	o.alias(admin.id, 'admin');
	await api('enable fixture registration', 'admin/update-meta', { disableRegistration: false, pinnedUsers: ['regalice', 'doesnotexist'] }, admin, 204);
	const users = {};
	for (const name of ['alice', 'bob', 'carol']) {
		users[name] = await api(`signup ${name}`, 'signup', { username: `reg${name}`, password });
		o.alias(users[name].id, name);
	}
	const { alice, bob, carol } = users;
	await api('duplicate signup refused', 'signup', { username: 'regalice', password }, null, 400);
	await api('malformed signup refused', 'signup', { username: ['regalice'], password }, null, 400);
	const signin = await api('signin real password', 'signin', { username: 'regalice', password });
	assert.equal(signin.i, alice.token);
	await api('own account', 'i', {}, alice);
	const publicAlice = await api('public profile hides credentials', 'users/show', { userId: alice.id });
	for (const secret of ['token', 'password', 'email', 'twoFactorSecret']) assert.ok(!Object.hasOwn(publicAlice, secret), secret);
	await api('profile update preserves unicode', 'i/update', { name: 'Alice 日本語 🐈', description: 'Hello **MFM** <script>not executed</script>', fields: [{ name: 'website', value: 'https://example.invalid/' }] }, alice);
	await api('pinned users omit missing accounts', 'pinned-users');
	const readToken = await api('issue restricted token', 'miauth/gen-token', { session: 'regression-read', permission: ['read:account', 'read:notes'] }, alice);
	await api('restricted token reads account', 'i', {}, readToken);
	await api('restricted token cannot post', 'notes/create', { text: 'must not exist' }, readToken, 400, 'PERMISSION_DENIED');
	await api('restricted token cannot mint tokens', 'miauth/gen-token', { session: null, permission: [] }, readToken, 400, 'ACCESS_DENIED');
	const checked = await api('miauth retrieves token once', 'miauth/regression-read/check');
	assert.equal(checked.token, readToken.token);
	await api('miauth second retrieval refused', 'miauth/regression-read/check');
	await api('follow alice', 'following/create', { userId: alice.id }, bob);
	await api('following relation', 'users/relation', { userId: alice.id }, bob);

	const notes = {};
	for (const visibility of ['public', 'home', 'followers', 'specified']) {
		const created = await api(`create ${visibility} note`, 'notes/create', { text: `contract ${visibility} 日本語 #regression`, visibility, ...(visibility === 'specified' ? { visibleUserIds: [bob.id] } : {}) }, alice);
		notes[visibility] = created.createdNote;
		o.alias(created.createdNote.id, `note-${visibility}`);
		for (const [viewer, user] of [['owner', alice], ['follower', bob], ['stranger', carol], ['anonymous', null]]) {
			const shown = await api(`${visibility} note seen by ${viewer}`, 'notes/show', { noteId: created.createdNote.id }, user);
			if (['followers', 'specified'].includes(visibility) && ['stranger', 'anonymous'].includes(viewer)) {
				assert.equal(shown.isHidden, true);
				assert.ok(shown.text == null, 'private text leaked');
			} else assert.equal(shown.text, created.createdNote.text);
		}
	}
	await api('public timeline', 'notes/local-timeline', { limit: 20 }, bob);
	// NFKC turns these characters into SQL quotes only after the legacy
	// blacklist runs. They must remain literal tag data at the database boundary.
	const sqlTag = 'nomatch＂}＇ <@ note.tags OR TRUE OR ＇{＂nomatch';
	assert.deepEqual(await api('tag search binds normalized tag values', 'notes/search-by-tag', { tag: sqlTag }, carol), []);
	assert.deepEqual(await api('tag query binds every normalized term', 'notes/search-by-tag', { query: [[sqlTag], ['another-nonmatching-tag']] }, carol), []);
	const home = await api('home timeline', 'notes/timeline', { limit: 20 }, bob);
	assert.ok(home.some(n => n.id === notes.followers.id));
	const outsider = await api('stranger timeline', 'notes/timeline', { limit: 20 }, carol);
	assert.ok(!outsider.some(n => n.id === notes.followers.id || n.id === notes.specified.id));
	await api('invalid visibility', 'notes/create', { text: 'invalid', visibility: 'world' }, alice, 400, 'INVALID_PARAM');
	await api('invalid note id', 'notes/show', { noteId: '../etc/passwd' }, alice, 400, 'INVALID_PARAM');
	await api('reply', 'notes/create', { text: 'reply contract', replyId: notes.public.id }, bob);
	await api('renote', 'notes/create', { renoteId: notes.public.id }, bob);
	await api('quote', 'notes/create', { text: 'quote contract', renoteId: notes.public.id }, carol);
	await api('note replies', 'notes/replies', { noteId: notes.public.id }, bob);
	await api('note renotes', 'notes/renotes', { noteId: notes.public.id }, bob);
	await api('react', 'notes/reactions/create', { noteId: notes.public.id, reaction: '👍' }, bob, 204);
	await api('read reactions', 'notes/reactions', { noteId: notes.public.id }, alice);
	await api('unreact', 'notes/reactions/delete', { noteId: notes.public.id }, bob, 204);
	await api('favorite', 'notes/favorites/create', { noteId: notes.public.id }, bob, 204);
	await api('list favorites', 'i/favorites', {}, bob);
	await api('unfavorite', 'notes/favorites/delete', { noteId: notes.public.id }, bob, 204);
	const poll = (await api('create poll', 'notes/create', { text: 'poll contract', poll: { choices: ['one', 'two'], multiple: false } }, alice)).createdNote;
	await api('poll vote', 'notes/polls/vote', { noteId: poll.id, choice: 1 }, bob, 204);
	const voted = await api('poll after vote', 'notes/show', { noteId: poll.id }, bob);
	assert.equal(voted.poll.choices[1].votes, 1);
	await api('duplicate vote refused', 'notes/polls/vote', { noteId: poll.id, choice: 0 }, bob, 400, 'ALREADY_VOTED');
	await api('mute user', 'mute/create', { userId: alice.id }, carol, 204);
	await api('list muted users', 'mute/list', {}, carol);
	await api('unmute user', 'mute/delete', { userId: alice.id }, carol, 204);
	await api('block user', 'blocking/create', { userId: carol.id }, alice);
	await api('blocked follow refused', 'following/create', { userId: alice.id }, carol, 400, 'BLOCKED');
	await api('blocked reply refused', 'notes/create', { text: 'blocked', replyId: notes.public.id }, carol, 400, 'YOU_HAVE_BEEN_BLOCKED');
	await api('list blocked users', 'blocking/list', {}, alice);
	await api('unblock user', 'blocking/delete', { userId: carol.id }, alice);
	await api('foreign note delete refused', 'notes/delete', { noteId: notes.public.id }, bob, 400);

	const folder = await api('drive folder create', 'drive/folders/create', { name: 'regression' }, alice);
	const form = new FormData();
	form.set('i', alice.token); form.set('folderId', folder.id);
	const image = await readFile(resolve(root, 'packages/backend/test/resources/with-alpha.png'));
	form.set('file', new Blob([image], { type: 'image/png' }), 'contract.png');
	const upload = await fetch(`${f.base}/api/drive/files/create`, { method: 'POST', body: form });
	const file = await upload.json();
	assert.equal(upload.status, 200, JSON.stringify(file));
	assert.equal(new URL(file.url).origin, f.base, 'Fixture media must remain on its own server');
	for (const key of ['url', 'thumbnailUrl', 'webpublicUrl']) if (file[key]) o.alias(file[key], `uploaded-${key}`);
	o.record('multipart image upload', { status: upload.status, body: file });
	o.calls.set('drive/files/create', [{ name: 'multipart image upload', status: upload.status }]);
	const downloaded = await fetch(file.url);
	assert.equal(downloaded.status, 200);
	const bytes = Buffer.from(await downloaded.arrayBuffer());
	assert.deepEqual(bytes, image, 'Original media bytes must survive upload/download');
	o.record('download original bytes', { sha256: createHash('sha256').update(bytes).digest('hex'), type: downloaded.headers.get('content-type') });
	await api('drive metadata', 'drive/files/show', { fileId: file.id }, alice);
	await api('foreign drive edit refused', 'drive/files/update', { fileId: file.id, name: 'stolen' }, bob, 400);
	await api('drive rename and sensitivity', 'drive/files/update', { fileId: file.id, name: '日本語.png', isSensitive: true }, alice);
	await api('note with attachment and cw', 'notes/create', { text: 'attachment', cw: 'content warning', fileIds: [file.id] }, alice);
	await api('drive files', 'drive/files', { folderId: folder.id }, alice);
	const message = await api('private message', 'messaging/messages/create', { userId: bob.id, text: 'private message contract' }, alice);
	const messages = await api('recipient sees message', 'messaging/messages', { userId: alice.id }, bob);
	assert.ok(messages.some(m => m.id === message.id));
	const strangerMessages = await api('stranger cannot see conversation', 'messaging/messages', { userId: alice.id }, carol);
	assert.ok(!strangerMessages.some(m => m.id === message.id));
	await api('foreign message delete refused', 'messaging/messages/delete', { messageId: message.id }, carol, 400);
	await api('delete message', 'messaging/messages/delete', { messageId: message.id }, alice, 204);
	const list = await api('create user list', 'users/lists/create', { name: 'contract list' }, alice);
	await api('add user to list', 'users/lists/push', { listId: list.id, userId: bob.id }, alice, 204);
	await api('show list', 'users/lists/show', { listId: list.id }, alice);
	await api('foreign list modification refused', 'users/lists/push', { listId: list.id, userId: carol.id }, bob, 400);
	const clip = await api('create clip', 'clips/create', { name: 'contract clip', isPublic: true }, alice);
	await api('add note to clip', 'clips/add-note', { clipId: clip.id, noteId: notes.public.id }, alice, 204);
	await api('read clip notes', 'clips/notes', { clipId: clip.id }, bob);
	const page = await api('create page', 'pages/create', { title: 'contract page', name: 'contract', content: [{ id: 'text-block', type: 'text', text: 'page 日本語' }], variables: [], script: '' }, alice);
	await api('show page', 'pages/show', { pageId: page.id }, bob);
    // Both values are supported by the handler; null previously failed its schema.
    for (const pinnedPageId of [page.id, null]) {
        const response = await fetch(`${f.base}/api/i/update`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ i: alice.token, pinnedPageId }),
        });
        assert.equal(response.status, 200, 'Own page can be pinned and unpinned');
        assert.equal((await response.json()).pinnedPageId, pinnedPageId);
    }

	await api('foreign page delete refused', 'pages/delete', { pageId: page.id }, bob, 400);
	const channel = await api('create channel', 'channels/create', { name: 'contract channel', description: 'contract' }, alice);
	await api('follow channel', 'channels/follow', { channelId: channel.id }, bob, 204);
	await api('post to channel', 'notes/create', { text: 'channel contract', channelId: channel.id }, alice);
	await api('channel timeline', 'channels/timeline', { channelId: channel.id }, bob);
	await api('registry set nested value', 'i/registry/set', { key: 'contract', value: { nested: ['日本語', false, null, 42] }, scope: ['regression'] }, alice, 204);
	await api('registry read', 'i/registry/get', { key: 'contract', scope: ['regression'] }, alice);
	await api('registry user isolation', 'i/registry/get', { key: 'contract', scope: ['regression'] }, bob, 400, 'NO_SUCH_KEY');
	await featureScenarios(f, o, { admin, alice, bob, carol, note: notes.public, file, list, clip, page, channel });
	await streaming(f, o, alice);
	await federation(f, o, alice, notes);
	await inboxScenarios(f, o, alice, notes.public.id);
	await api('notifications', 'i/notifications', {}, alice);
	await api('delete owned note', 'notes/delete', { noteId: poll.id }, alice, 204);
	await api('deleted note cannot be fetched', 'notes/show', { noteId: poll.id }, alice, 400, 'NO_SUCH_NOTE');
	return { admin, alice, bob, carol, readToken };
}

async function streaming(f, o, alice) {
	const { WebSocket } = requireBackend('ws');
	const socket = new WebSocket(`${f.base.replace('http:', 'ws:')}/streaming?i=${alice.token}`);
	try {
		await once(socket, 'open');
		const wait = predicate => new Promise((done, reject) => {
			const timer = setTimeout(() => { socket.off('message', handler); reject(new Error('WebSocket event timeout')); }, 10000);
			function handler(data) {
				const value = JSON.parse(data.toString());
				if (predicate(value)) { clearTimeout(timer); socket.off('message', handler); done(value); }
			}
			socket.on('message', handler);
		});
		const connected = wait(value => value.type === 'connected');
		socket.send(JSON.stringify({ type: 'connect', body: { channel: 'main', id: 'contract-main', pong: true } }));
		o.record('websocket main connected', await connected);
		const updated = wait(value => value.type === 'channel' && value.body.type === 'registryUpdated');
		await o.api('registry triggers stream', 'i/registry/set', { key: 'stream', value: 'stream contract', scope: ['regression'] }, alice, 204);
		o.record('websocket registry event', await updated);
	} finally { socket.close(); }
}

async function federation(f, o, alice, notes) {
	const headers = { accept: 'application/activity+json' };
	const actor = await o.http('activitypub actor', `/users/${alice.id}`, 200, { headers });
	assert.equal(actor.type, 'Person');
	assert.equal(actor.inbox, `${f.base}/users/${alice.id}/inbox`);
	for (const visibility of ['public', 'home']) {
		const note = await o.http(`activitypub ${visibility} note`, `/notes/${notes[visibility].id}`, 200, { headers });
		assert.equal(note.type, 'Note');
	}
	for (const visibility of ['followers', 'specified']) await o.http(`activitypub hides ${visibility}`, `/notes/${notes[visibility].id}`, 404, { headers });
	await o.http('activitypub followers collection', `/users/${alice.id}/followers`, 200, { headers });
	await o.http('activitypub following collection', `/users/${alice.id}/following`, 200, { headers });
	await o.http('activitypub outbox', `/users/${alice.id}/outbox?page=true`, 200, { headers });
	await o.http('webfinger local user', `/.well-known/webfinger?resource=acct:regalice@${new URL(f.base).host}`);
	await o.http('unsigned inbox refused', '/inbox', 401, { method: 'POST', headers: { 'content-type': 'application/activity+json' }, body: JSON.stringify({ type: 'Create', actor: 'https://remote.invalid/users/alice', object: {} }) });
	await o.api('hide follow graph', 'i/update', { ffVisibility: 'private' }, alice);
	await o.http('activitypub private followers denied', `/users/${alice.id}/followers`, 403, { headers });
	await o.api('restore follow graph', 'i/update', { ffVisibility: 'public' }, alice);
}

export async function database(f, o) {
	// Migrations, columns, defaults, constraints and indexes are compared independently
	// of fixture data. Production catalogs and sequences are never read.
	const columns = await f.db.query("SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position");
	o.record('database schema columns', columns.rows);
	const constraints = await f.db.query("SELECT c.relname AS table_name, con.conname AS name, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname, con.conname");
	o.record('database schema constraints', constraints.rows);
	const indexes = await f.db.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
	o.record('database schema indexes', indexes.rows);
	await eventually(async () => {
		const { rows } = await f.db.query('SELECT count(*)::integer AS count FROM note');
		assert.ok(rows[0].count >= 8);
	}, 'persisted notes');
	for (const table of ['note', 'poll', 'poll_vote', 'note_reaction', 'note_favorite', 'following', 'blocking', 'muting', 'messaging_message', 'registry_item', 'user_list', 'user_list_joining', 'clip', 'clip_note', 'page', 'channel', 'channel_following']) {
		const result = await f.db.query(`SELECT * FROM "${table}" t ORDER BY COALESCE(to_jsonb(t)->>'id', to_jsonb(t)->>'noteId'), to_jsonb(t)->>'userId'`);
		o.record(`database rows ${table}`, result.rows);
	}
	const { rows } = await f.db.query('SELECT id, username, "isAdmin", "isModerator", "isSuspended", "notesCount", "followersCount", "followingCount" FROM "user" ORDER BY id');
	o.record('database account counters', rows);
	const profiles = await f.db.query('SELECT "userId",description,fields,lang,location,birthday,"ffVisibility","twoFactorEnabled","usePasswordLessLogin","emailVerified" FROM user_profile ORDER BY "userId"');
	o.record('database profile settings', profiles.rows);
}
