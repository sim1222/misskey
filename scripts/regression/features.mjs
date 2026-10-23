import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { eventually, requireBackend } from './harness.mjs';

export async function featureScenarios(f, o, { admin, alice, bob, carol, note, file, list, clip, page, channel }) {
	const api = o.api.bind(o);
	// Pagination must preserve identity and ordering across both cursor directions.
	const first = await api('user notes first page', 'users/notes', { userId: alice.id, limit: 2 }, alice);
	assert.equal(first.length, 2);
	const next = await api('user notes next page', 'users/notes', { userId: alice.id, limit: 2, untilId: first.at(-1).id }, alice);
	assert.ok(next.every(n => !first.some(previous => previous.id === n.id)));
	await api('user notes since cursor', 'users/notes', { userId: alice.id, sinceId: next[0].id }, alice);
	await api('lock account', 'i/update', { isLocked: true }, carol);
	await api('request locked follow', 'following/create', { userId: carol.id }, bob);
	const pending = await api('pending follow requests', 'following/requests/list', {}, carol);
	assert.ok(pending.some(request => request.follower.id === bob.id));
	await api('accept locked follow', 'following/requests/accept', { userId: bob.id }, carol, 204);
	await api('unfollow after approval', 'following/delete', { userId: carol.id }, bob);
	await api('request locked follow for rejection', 'following/create', { userId: carol.id }, alice);
	await api('reject locked follow', 'following/requests/reject', { userId: alice.id }, carol, 204);
	await api('unlock account', 'i/update', { isLocked: false }, carol);
	await api('pin note', 'i/pin', { noteId: note.id }, alice);
	await api('pinned profile', 'users/show', { userId: alice.id }, bob);
	await api('unpin note', 'i/unpin', { noteId: note.id }, alice);
	await api('mute thread', 'notes/thread-muting/create', { noteId: note.id }, bob, 204);
	await api('unmute thread', 'notes/thread-muting/delete', { noteId: note.id }, bob, 204);
	for (const [endpoint, params, user] of [
		['notes/children', { noteId: note.id }, bob], ['notes/conversation', { noteId: note.id }, bob],
		['notes/clips', { noteId: note.id }, bob], ['notes/state', { noteId: note.id }, bob],
		['notes/global-timeline', {}, bob], ['notes/hybrid-timeline', {}, bob], ['notes/mentions', {}, alice],
		['notes/search', { query: 'contract' }, alice], ['notes/search-by-tag', { tag: 'regression' }, alice],
		['notes/user-list-timeline', { listId: list.id }, alice],
		['users/followers', { userId: alice.id }, alice], ['users/following', { userId: bob.id }, bob],
		['users/reactions', { userId: bob.id }, bob], ['users/search', { query: 'regalice' }, bob],
		['users/search-by-username-and-host', { username: 'regalice' }, bob], ['users/stats', { userId: alice.id }, alice],
		['hashtags/search', { query: 'regression' }, bob], ['hashtags/show', { tag: 'regression' }, bob],
		['hashtags/users', { tag: 'regression', sort: '+follower' }, bob], ['hashtags/list', { sort: '+mentionedLocalUsers' }, bob],
		['username/available', { username: 'regunused' }, null], ['endpoints', {}, null], ['endpoint', { endpoint: 'notes/create' }, null],
		['drive', {}, alice], ['drive/folders', {}, alice], ['drive/stream', {}, alice],
		['drive/files/attached-notes', { fileId: file.id }, alice], ['drive/files/find', { name: '日本語.png' }, alice],
		['drive/files/find-by-hash', { md5: file.md5 }, alice], ['drive/files/check-existence', { md5: file.md5 }, alice],
		['messaging/history', {}, alice], ['users/lists/list', {}, alice], ['clips/list', {}, alice],
		['clips/show', { clipId: clip.id }, bob], ['users/clips', { userId: alice.id }, bob],
		['channels/show', { channelId: channel.id }, bob], ['channels/followed', {}, bob], ['channels/owned', {}, alice],
		['i/pages', {}, alice], ['users/pages', { userId: alice.id }, bob],
		['i/registry/get-all', { scope: ['regression'] }, alice], ['i/registry/get-detail', { key: 'contract', scope: ['regression'] }, alice],
		['i/registry/keys', { scope: ['regression'] }, alice], ['i/registry/keys-with-type', { scope: ['regression'] }, alice], ['i/registry/scopes', {}, alice],
		['admin/meta', {}, admin], ['admin/drive/files', {}, admin], ['admin/drive/show-file', { fileId: file.id }, admin],
		['admin/emoji/list', {}, admin], ['admin/emoji/list-remote', {}, admin], ['admin/relays/list', {}, admin],
	]) await api(`feature read ${endpoint}`, endpoint, params, user);
	await api('update list', 'users/lists/update', { listId: list.id, name: 'updated list' }, alice);
	await api('remove list member', 'users/lists/pull', { listId: list.id, userId: bob.id }, alice, 204);
	await api('update clip', 'clips/update', { clipId: clip.id, name: 'updated clip', description: '日本語', isPublic: true }, alice);
	await api('remove clipped note', 'clips/remove-note', { clipId: clip.id, noteId: note.id }, alice, 204);
	await api('update channel', 'channels/update', { channelId: channel.id, name: 'updated channel' }, alice);
	await api('unfollow channel', 'channels/unfollow', { channelId: channel.id }, bob, 204);
	await api('like page', 'pages/like', { pageId: page.id }, bob, 204);
	await api('page likes', 'i/page-likes', {}, bob);
	await api('unlike page', 'pages/unlike', { pageId: page.id }, bob, 204);
	await api('update page', 'pages/update', { pageId: page.id, title: 'updated page', name: 'contract', content: [], variables: [], script: '' }, alice, 204);
	const gallery = await api('create gallery', 'gallery/posts/create', { title: 'contract gallery', fileIds: [file.id], isSensitive: true }, alice);
	await api('read gallery', 'gallery/posts/show', { postId: gallery.id }, bob);
	await api('like gallery', 'gallery/posts/like', { postId: gallery.id }, bob, 204);
	await api('gallery likes', 'i/gallery/likes', {}, bob);
	await api('unlike gallery', 'gallery/posts/unlike', { postId: gallery.id }, bob, 204);
	await api('update gallery', 'gallery/posts/update', { postId: gallery.id, title: 'updated gallery', fileIds: [file.id], isSensitive: false }, alice);
	await api('own galleries', 'i/gallery/posts', {}, alice);
	await api('public user galleries', 'users/gallery/posts', { userId: alice.id }, bob);
	await api('foreign gallery delete refused', 'gallery/posts/delete', { postId: gallery.id }, bob, 400);
	await api('delete gallery', 'gallery/posts/delete', { postId: gallery.id }, alice, 204);
	const antennaParams = { name: 'contract antenna', src: 'all', keywords: [['contract']], excludeKeywords: [], users: [], caseSensitive: false, withReplies: true, withFile: false, notify: false };
	const antenna = await api('create antenna', 'antennas/create', antennaParams, alice);
	await api('show antenna', 'antennas/show', { antennaId: antenna.id }, alice);
	await api('list antennas', 'antennas/list', {}, alice);
	await api('antenna notes', 'antennas/notes', { antennaId: antenna.id }, alice);
	await api('update antenna', 'antennas/update', { ...antennaParams, antennaId: antenna.id, name: 'updated antenna' }, alice);
	await api('foreign antenna delete refused', 'antennas/delete', { antennaId: antenna.id }, bob, 400);
	await api('delete antenna', 'antennas/delete', { antennaId: antenna.id }, alice, 204);
	const group = await api('create group', 'users/groups/create', { name: 'contract group' }, alice);
	await api('invite group member', 'users/groups/invite', { groupId: group.id, userId: bob.id }, alice, 204);
	const invitations = await api('group invitations', 'i/user-group-invites', {}, bob);
	assert.equal(invitations.length, 1);
	await api('foreign group invitation refused', 'users/groups/invitations/accept', { invitationId: invitations[0].id }, carol, 400);
	await api('accept group invitation', 'users/groups/invitations/accept', { invitationId: invitations[0].id }, bob, 204);
	await api('group members', 'users/groups/show', { groupId: group.id }, bob);
	await api('joined groups', 'users/groups/joined', {}, bob);
	await api('owned groups', 'users/groups/owned', {}, alice);
	await api('group private message', 'messaging/messages/create', { groupId: group.id, text: 'private group contract' }, alice);
	await api('member reads group messages', 'messaging/messages', { groupId: group.id }, bob);
	await api('stranger denied group messages', 'messaging/messages', { groupId: group.id }, carol, 400, 'GROUP_ACCESS_DENIED');
	await api('rename group', 'users/groups/update', { groupId: group.id, name: 'updated group' }, alice);
	await api('leave group', 'users/groups/leave', { groupId: group.id }, bob, 204);
	await api('delete group', 'users/groups/delete', { groupId: group.id }, alice, 204);
	const webhookParams = { name: 'contract hook', url: 'https://hooks.example.invalid/', secret: 'fixture-secret', on: ['note'] };
	const hook = await api('create webhook', 'i/webhooks/create', webhookParams, alice);
	await api('read webhook', 'i/webhooks/show', { webhookId: hook.id }, alice);
	await api('list webhooks', 'i/webhooks/list', {}, alice);
	await api('foreign webhook denied', 'i/webhooks/show', { webhookId: hook.id }, bob, 400);
	await api('update webhook', 'i/webhooks/update', { ...webhookParams, webhookId: hook.id, active: false }, alice, 204);
	await api('delete webhook', 'i/webhooks/delete', { webhookId: hook.id }, alice, 204);
	const announcement = await api('create announcement', 'admin/announcements/create', { title: 'contract announcement', text: '日本語', imageUrl: null }, admin);
	await api('public announcements', 'announcements', {}, bob);
	await api('read announcement', 'i/read-announcement', { announcementId: announcement.id }, bob, 204);
	await api('update announcement', 'admin/announcements/update', { id: announcement.id, title: 'updated announcement', text: 'updated', imageUrl: null }, admin, 204);
	await api('admin announcements', 'admin/announcements/list', {}, admin);
	await api('delete announcement', 'admin/announcements/delete', { id: announcement.id }, admin, 204);
	await api('silence member', 'admin/silence-user', { userId: carol.id }, admin, 204);
	await api('unsilence member', 'admin/unsilence-user', { userId: carol.id }, admin, 204);
	await api('suspend member', 'admin/suspend-user', { userId: carol.id }, admin, 204);
	// Moderation invalidates worker caches through Redis asynchronously. Observe a
	// harmless authenticated read until the state propagates, without posting while
	// suspended or inserting arbitrary sleeps into the test.
	await eventually(async () => {
		const response = await fetch(`${f.base}/api/i`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ i: carol.token }) });
		assert.equal(response.status, 403);
	}, 'suspension propagated to authentication cache');
	await api('suspended member cannot post', 'notes/create', { text: 'must not exist' }, carol, 403, 'YOUR_ACCOUNT_SUSPENDED');
	await api('unsuspend member', 'admin/unsuspend-user', { userId: carol.id }, admin, 204);
	await api('promote moderator', 'admin/moderators/add', { userId: carol.id }, admin, 204);
	await api('demote moderator', 'admin/moderators/remove', { userId: carol.id }, admin, 204);
	await api('set custom drive quota', 'admin/drive-capacity-override', { userId: carol.id, overrideMb: 128 }, admin, 204);
	await api('restore custom drive quota', 'admin/drive-capacity-override', { userId: carol.id, overrideMb: null }, admin, 204);
	await legacyAuth(f, o, alice);
	await securitySettings(f, o);
	// All chart families are queried, but wall-clock bucket numbers are deliberately
	// not golden data. The chart unit suite checks exact numerical aggregation.
	for (const endpoint of f.endpoints.filter(ep => ep.name.startsWith('charts/'))) {
		const response = await fetch(`${f.base}/api/${endpoint.name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ span: 'hour', limit: 3, userId: alice.id, tag: 'regression', host: 'peer.example.invalid' }) });
		assert.equal(response.status, 200, endpoint.name);
		const body = await response.json();
		const describe = value => Array.isArray(value) ? { points: value.length, types: [...new Set(value.map(v => typeof v))] } : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, describe(v)]));
		o.record(`chart shape ${endpoint.name}`, describe(body));
		o.calls.set(endpoint.name, [{ name: `chart shape ${endpoint.name}`, status: 200 }]);
	}
}

async function securitySettings(f, o) {
	const api = o.api.bind(o);
	const account = await api('signup security fixture', 'signup', { username: 'regsecurity', password: 'old-fixture-pass' });
	o.alias(account.id, 'security-user');
	await api('change account password', 'i/change-password', { currentPassword: 'old-fixture-pass', newPassword: 'new-fixture-pass' }, account, 204);
	const settings = await api('register authenticator', 'i/2fa/register', { password: 'new-fixture-pass' }, account);
	assert.match(settings.qr, /^data:image\/png;base64,/);
	assert.equal(new URL(settings.url).protocol, 'otpauth:');
	const totp = requireBackend('speakeasy').totp({ secret: settings.secret, encoding: 'base32' });
	await api('enable authenticator', 'i/2fa/done', { token: totp }, account, 204);
	const enabled = await api('authenticator enabled profile', 'i', {}, account);
	assert.equal(enabled.twoFactorEnabled, true);
	await api('signin with password and TOTP', 'signin', { username: 'regsecurity', password: 'new-fixture-pass', token: totp });
	await api('signin rate limit enforced', 'signin', { username: 'regsecurity', password: 'new-fixture-pass', token: totp }, null, 429, 'TOO_MANY_AUTHENTICATION_FAILURES');
	await api('disable authenticator', 'i/2fa/unregister', { password: 'new-fixture-pass' }, account, 204);
	await api('regenerate native token', 'i/regenerate-token', { password: 'new-fixture-pass' }, account, 204);
	await eventually(async () => {
		const response = await fetch(`${f.base}/api/i`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ i: account.token }) });
		assert.equal(response.status, 403);
	}, 'native token invalidation propagated');
	await api('old native token refused', 'i', {}, account, 403, 'AUTHENTICATION_FAILED');
	const { rows: [row] } = await f.db.query('SELECT token FROM "user" WHERE id=$1', [account.id]);
	assert.notEqual(row.token, account.token);
	await api('new native token works', 'i', {}, { token: row.token });
}

async function legacyAuth(f, o, alice) {
	const api = o.api.bind(o);
	const app = await api('create legacy API app', 'app/create', { name: 'contract app', description: 'contract', permission: ['read:account'] }, alice);
	const session = await api('generate legacy auth session', 'auth/session/generate', { appSecret: app.secret });
	// The auth URL contains a random session token rather than a Misskey ID.
	o.alias(session.url, 'legacy-auth-url');
	await api('show legacy auth session', 'auth/session/show', { token: session.token }, alice);
	await api('accept legacy auth session', 'auth/accept', { token: session.token }, alice, 204);
	const userKey = await api('retrieve legacy user key', 'auth/session/userkey', { appSecret: app.secret, token: session.token });
	const token = createHash('sha256').update(userKey.accessToken + app.secret).digest('hex');
	await api('legacy delegated account access', 'i', {}, { token });
	await api('legacy delegated write denied', 'notes/create', { text: 'must not exist' }, { token }, 400, 'PERMISSION_DENIED');
	await api('authorized apps', 'i/authorized-apps', {}, alice);
	await api('own apps', 'my/apps', {}, alice);
	await api('show app', 'app/show', { appId: app.id }, alice);
	const { rows: [stored] } = await f.db.query('SELECT id FROM access_token WHERE "appId"=$1', [app.id]);
	await api('revoke delegated token', 'i/revoke-token', { tokenId: stored.id }, alice, 204);
	await api('revoked token refused', 'i', {}, { token }, 403, 'AUTHENTICATION_FAILED');
}
