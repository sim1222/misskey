// Investigation evidence, not a passing security gate. Some observations below
// intentionally demonstrate unfixed behavior. Reassess after security fixes.
// No application server, database, Redis, SMTP or external HTTP peer is used.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, rmSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
import { Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { ServerResponse } from 'node:http';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.ok(process.argv[2] && process.argv[3], 'Pass an isolated dependency directory and output JSON path');
const requireProbe = createRequire(resolve(process.argv[2], 'package.json'));
const versions = { typescript: '5.6.3', unzipper: '0.12.5', '@bull-board/koa': '4.3.1', koa: '2.16.4', speakeasy: '2.0.0' };
const manifest = JSON.parse(readFileSync(resolve(root, 'packages/backend/package.json'), 'utf8'));
for (const [name, version] of Object.entries(versions)) {
 assert.equal(manifest.dependencies[name] ?? manifest.devDependencies[name], version, `Reassess probes after updating ${name}`);
 assert.equal(requireProbe(`${name}/package.json`).version, version);
}
assert.equal(process.version.replace(/^v/, ''), readFileSync(resolve(root, '.node-version'), 'utf8').trim().replace(/^v/, ''), 'Use the application Node version');
const ts = requireProbe('typescript');
const sources = new Map();
for (const path of ['.node-version', 'packages/backend/package.json', 'packages/backend/yarn.lock']) sources.set(path, createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex'));
const results = {};
const temporary = mkdtempSync(join(tmpdir(), 'misskey-impact-probe-'));
class ApiError extends Error { constructor(info) { super(info.message); this.code = info.code; } }
function source(path) {
 const text = readFileSync(resolve(root, path), 'utf8');
 sources.set(path, createHash('sha256').update(text).digest('hex'));
 return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
}
function find(node, predicate) {
 if (predicate(node)) return node;
 return ts.forEachChild(node, child => find(child, predicate));
}
function evaluate(text, context = {}) {
 const compiled = ts.transpileModule(`globalThis.probe = (${text});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
 const sandbox = { URL, Buffer, Date, performance, console, ApiError, ...context };
 runInNewContext(compiled, sandbox, { timeout: 1000 });
 return sandbox.probe;
}
function method(path, name, context) {
 const sf = source(path);
 const member = find(sf, n => ts.isMethodDeclaration(n) && n.name.getText(sf) === name);
 assert.ok(member, `${path} ${name}`);
 return evaluate(`(class { ${member.getText(sf)} }).prototype.${name}`, context);
}
function variable(path, name, context) {
 const sf = source(path);
 const node = find(sf, n => ts.isVariableDeclaration(n) && n.name.getText(sf) === name);
 assert.ok(node?.initializer, `${path} ${name}`);
 return evaluate(node.initializer.getText(sf), context);
}
function declaration(path, name, context) {
 const sf = source(path);
 const node = find(sf, n => ts.isFunctionDeclaration(n) && n.name?.text === name && n.body);
 assert.ok(node, `${path} ${name}`);
 return evaluate(node.getText(sf).replace(/^export\s+/, ''), context);
}
function endpoint(path, instance, context = {}) {
 const sf = source(path);
 const call = find(sf, n => ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.SuperKeyword);
 assert.ok(ts.isArrowFunction(call.arguments[2]));
 return evaluate(`function() { return ${call.arguments[2].getText(sf)}; }`, { meta: variable(path, 'meta', { ms: () => 1 }), ...context }).call(instance);
}
const B = 'packages/backend/src/';
const C = 'packages/client/src/';
try {
 // The real sign-in method, with repository/password/transport boundaries faked.
 const speakeasy = requireProbe('speakeasy');
 let successes = 0;
 const profile = { password: 'fixture-only', twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' };
 const signin = method(B + 'server/api/SigninApiService.ts', 'signin', { speakeasy, bcrypt: { compare: async () => true }, IsNull: () => null, getIpHash: x => x });
 const loginService = { config: { url: 'https://fixture.invalid' }, usersRepository: { findOneBy: async () => ({ id: 'alice' }) }, userProfilesRepository: { findOneByOrFail: async () => profile }, rateLimiterService: { limit: async () => {} }, signinService: { signin: () => successes++ } };
 const token = speakeasy.totp({ secret: profile.twoFactorSecret, encoding: 'base32' });
 for (let i = 0; i < 2; i++) await signin.call(loginService, { set() {}, ip: '127.0.0.1', request: { body: { username: 'alice', password: 'fixture-only', token } } });
 assert.equal(successes, 2);
 results.totpReuse = { successfulSigninsWithSameCode: successes };
 const challengeLookups = [], challengeDeletes = [];
 Object.assign(loginService, { twoFactorAuthenticationService: { hash: () => ({ toString: () => 'fixture-hash' }) }, attestationChallengesRepository: { findOneBy: async where => { challengeLookups.push(where); return null; }, delete: async where => challengeDeletes.push(where) }, signinsRepository: { insert: async () => {} }, idService: { genId: () => 'signin-fixture' } });
 const keyContext = { set() {}, ip: '127.0.0.1', request: { body: { username: 'alice', password: 'fixture-only', credentialId: 'not-used', challengeId: 'bobs-challenge', clientDataJSON: Buffer.from('{"challenge":"fixture"}').toString('hex') } } };
 await signin.call(loginService, keyContext);
 assert.equal(keyContext.status, 403); assert.equal(challengeLookups[0].userId, 'alice'); assert.equal(challengeDeletes.length, 0);
 results.securityKeyChallenge = { crossUserLookupBoundToRequester: true, rejectedBeforeDeletion: true };

 // Real endpoint and real reaction serializer; fake rows represent a private note.
 const pack = method(B + 'core/entities/NoteReactionEntityService.ts', 'pack');
 const row = { id: 'reaction1', userId: 'private-reactor', noteId: 'private-note', reaction: 'like', createdAt: new Date(0) };
 const packer = { userEntityService: { pack: async id => ({ id }) }, reactionService: { convertLegacyReaction: x => x } };
 let reactionSelector;
 const reactions = endpoint(B + 'server/api/endpoints/notes/reactions.ts', { noteReactionsRepository: { find: async options => { reactionSelector = options.where; return [row]; } }, noteReactionEntityService: { pack: (r, me) => pack.call(packer, r, me) } });
 const exposed = await reactions({ noteId: 'private-note', limit: 10, offset: 0 }, null);
 assert.equal(exposed[0].user.id, 'private-reactor');
 results.privateReactions = { anonymousResult: exposed, selector: reactionSelector };

 let queryIndex = 0;
 const replyQueries = [];
 const frequent = endpoint(B + 'server/api/endpoints/users/get-frequently-replied-users.ts', { getterService: { getUser: async () => ({ id: 'victim' }) }, notesRepository: { find: async query => { replyQueries.push(query.where); return queryIndex++ ? [{ userId: 'private-correspondent' }] : [{ replyId: 'private-reply' }]; } }, userEntityService: { pack: async id => ({ id }) } }, { Not: x => ({ not: x }), IsNull: () => null, In: x => x, maximum: a => Math.max(...a) });
 const frequentResult = await frequent({ userId: 'victim', limit: 10 }, null);
 assert.equal(frequentResult[0].user.id, 'private-correspondent');
 results.privateReplyFrequency = { anonymousResult: frequentResult, selectors: replyQueries };

 const imports = {};
 for (const [route, job] of [['following', 'createImportFollowingJob'], ['blocking', 'createImportBlockingJob'], ['muting', 'createImportMutingJob'], ['user-lists', 'createImportUserListsJob']]) {
  let selector, queued;
  const run = endpoint(B + `server/api/endpoints/i/import-${route}.ts`, { driveFilesRepository: { findOneBy: async q => { selector = q; return { id: 'otherfile', userId: 'bob', size: 1 }; } }, queueService: { [job]: (me, id) => { queued = { importingUser: me.id, file: id }; } } });
  await run({ fileId: 'otherfile' }, { id: 'alice' });
  assert.equal(queued.importingUser, 'alice'); assert.ok(!('userId' in selector));
  imports[route] = { selector, queued };
 }
 results.foreignFileImports = imports;

 const adminMeta = variable(B + 'server/api/endpoints/admin/meta.ts', 'meta');
 const apiCall = method(B + 'server/api/ApiCallService.ts', 'call', { ApiError, accessDenied: { message: 'denied' } });
 const leaked = await apiCall.call({}, { meta: adminMeta }, async () => ({ objectStorageSecretKey: 'fixture-secret' }), { id: 'admin', isAdmin: true }, { permission: [] }, {}, {});
 assert.equal(leaked.objectStorageSecretKey, 'fixture-secret');
 results.thirdPartyAdminMeta = { emptyPermissionTokenReachedExecutor: true, secure: adminMeta.secure ?? null, kind: adminMeta.kind ?? null };
 const uploadPath = join(temporary, 'rejected-upload.txt'); writeFileSync(uploadPath, 'own-fixture');
 class AuthenticationError extends Error {}
 const handle = method(B + 'server/api/ApiCallService.ts', 'handleRequest', { AuthenticationError });
 const uploadContext = { is: () => true, method: 'POST', request: { body: { i: 'invalid-fixture' } }, file: { path: uploadPath } };
 await handle.call({ authenticateService: { authenticate: async () => { throw new AuthenticationError(); } } }, { name: 'drive/files/create', meta: { requireFile: true } }, () => { throw new Error('Must not enter executor'); }, uploadContext);
 assert.equal(uploadContext.status, 403); assert.equal(existsSync(uploadPath), true);
 results.legacyUploadCleanup = { rejectedStatus: uploadContext.status, ownTemporaryUploadRemains: true };

 const stream = B + 'server/api/stream/index.ts';
 const subscriber = new EventEmitter(), events = [];
 const connection = { subscribingNotes: {}, subscriber, sendMessageToWs: (type, body) => events.push({ type, body }) };
 connection.onNoteStreamMessage = method(stream, 'onNoteStreamMessage').bind(connection);
 method(stream, 'onSubscribeNote').call(connection, { id: 'private-note' });
 subscriber.emit('noteStream:private-note', { type: 'reacted', body: { id: 'private-note', body: { reaction: 'like', userId: 'private-reactor' } } });
 assert.equal(events.length, 1);
 results.privateNoteEvents = { anonymousEvents: events };
 const antennaEvents = [];
 await method(B + 'server/api/stream/channels/antenna.ts', 'init').call({ subscriber: { on: name => antennaEvents.push(name) }, onEvent() {} }, { antennaId: 'another-users-antenna' });
 assert.equal(antennaEvents[0], 'antennaStream:another-users-antenna');
 results.antennaSubscription = { anonymousSubscriptions: antennaEvents };

 const apTypeSource = source(B + 'core/remote/activitypub/type.ts');
 const typeModule = { exports: {} };
 const typeJs = ts.transpileModule(apTypeSource.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
 runInNewContext(typeJs, { exports: typeModule.exports }, { timeout: 1000 });
 const types = typeModule.exports;
 const actorWithLink = { type: 'Person', id: 'https://peer.invalid/alice', inbox: 'https://peer.invalid/inbox', preferredUsername: 'alice', url: 'javascript:fixture()' };
 const validateActor = method(B + 'core/remote/activitypub/models/ApPersonService.ts', 'validateActor', types);
 const actorInstance = { utilityService: { toPuny: x => x } };
 assert.equal(validateActor.call(actorInstance, actorWithLink, actorWithLink.id).url, 'javascript:fixture()');
 assert.equal(validateActor.call(actorInstance, { ...actorWithLink, url: 'https://unrelated.invalid/phishing' }, actorWithLink.id).url, 'https://unrelated.invalid/phishing');
 results.originLinks = { acceptedJavascriptScheme: true, acceptedUnrelatedHttpsOrigin: true };
 const fakeQuestion = { type: 'Question', id: 'https://victim.invalid/poll', attributedTo: 'https://victim.invalid/alice', oneOf: [{ name: 'A', replies: { totalItems: 999 } }] };
 let votes;
 const questionInstance = { config: { url: 'https://local.invalid' }, notesRepository: { findOneBy: async () => ({ id: 'pollnote' }) }, pollsRepository: { findOneBy: async () => ({ choices: ['A'], votes: [0] }), update: async (_selector, update) => { votes = update.votes; } }, apResolverService: { createResolver: () => ({ resolve: async value => value }) }, logger: { debug() {} } };
 const updateQuestion = method(B + 'core/remote/activitypub/models/ApQuestionService.ts', 'updateQuestion');
 const inboxInstance = { apResolverService: { createResolver: () => ({ resolve: async value => value }) }, logger: { debug() {} }, apQuestionService: { updateQuestion: q => updateQuestion.call(questionInstance, q) } };
 const pollStatus = await method(B + 'core/remote/activitypub/ApInboxService.ts', 'update', types).call(inboxInstance, { uri: 'https://attacker.invalid/actor' }, { actor: 'https://attacker.invalid/actor', object: fakeQuestion });
 assert.equal(votes[0], 999);
 results.spoofedPoll = { status: pollStatus, changedVotes: votes };

 // signedGet accepts a response with an unrelated final URL and media type.
 const forged = { '@context': 'https://www.w3.org/ns/activitystreams', type: 'Person', id: 'https://victim.invalid/alice' };
 const signedGet = method(B + 'core/remote/activitypub/ApRequestService.ts', 'signedGet');
 const fetched = await signedGet.call({ config: { url: 'https://local.invalid', userAgent: 'fixture' }, userKeypairStoreService: { getUserKeypair: async () => ({ privateKey: 'not-used' }) }, createSignedGet: () => ({ request: { method: 'GET', headers: {} } }), httpRequestService: { getResponse: async () => ({ url: 'https://attacker.invalid/upload.json', headers: { get: () => 'application/octet-stream' }, json: async () => forged }) } }, 'https://victim.invalid/redirect', { id: 'instance' });
 assert.equal(fetched.id, forged.id);
 results.activityFetch = { rejectedMismatchedFinalUrl: false, rejectedWrongMediaType: false };

 const compileSource = source(C + 'scripts/theme.ts');
 const compile = find(compileSource, n => ts.isFunctionDeclaration(n) && n.name?.text === 'compile');
 let themeError;
 try { evaluate(compile.getText(compileSource), { genValue: x => x, tinycolor: x => x })({ props: { loop: '@loop' } }); } catch (e) { themeError = e; }
 assert.equal(themeError?.name, 'RangeError');
 results.recursiveTheme = { error: themeError.name };
 let requested;
 const rawApi = declaration(C + 'os.ts', 'rawApi', { pendingApiRequestsCount: { value: 0 }, $i: null, apiUrl: 'https://local.invalid/api', fetch: async url => { requested = url; return { status: 200, json: async () => ({}) }; } });
 await rawApi('../proxy/avatar.webp', {}, null);
 assert.equal(new URL(requested).pathname, '/proxy/avatar.webp');
 results.aiscriptRequestPath = { normalizedPathOutsideApi: new URL(requested).pathname };
 const cookieAssignments = [];
 const document = { set cookie(text) { cookieAssignments.push(text); } };
 const accountContext = { document, requireAccount: () => ({ id: 'alice', token: 'fixture-token' }), waiting() {}, localStorage: { setItem() {}, removeItem() {} }, removeAccount: async () => {}, getAccounts: async () => [], navigator: { serviceWorker: { controller: null, getRegistrations: async () => [] } }, unisonReload() {}, fetchAccount: async () => ({ id: 'alice' }), addAccount: async () => {}, _DEV_: false };
 await declaration(C + 'account.ts', 'login', accountContext)('fixture-token');
 await declaration(C + 'account.ts', 'signout', accountContext)();
 assert.ok(cookieAssignments[0].startsWith('token=')); assert.equal(cookieAssignments.filter(x => x.startsWith('token=')).length, 1);
 results.dashboardCookie = { loginSetsSecure: /;\s*secure/i.test(cookieAssignments[0]), loginSetsSameSite: /;\s*samesite=/i.test(cookieAssignments[0]), logoutClearsTokenCookie: false };

 // Execute the real importer callback, but replace network, extraction, DB and
 // Drive storage with fixtures. It reads only a sentinel created in this test.
 const sentinel = join(temporary, 'sentinel.txt'); writeFileSync(sentinel, 'fixture-only-local-file');
 let capturedFile;
 let finished;
 const complete = new Promise(resolveDone => { finished = resolveDone; });
 const log = { info() {}, succ() {}, error() {} };
 const importer = method(B + 'queue/processors/ImportCustomEmojisProcessorService.ts', 'process', {
  fs: { ...requireProbe('node:fs') }, createTempDir: async () => { const directory = join(temporary, 'import'); mkdirSync(directory); return [directory, () => {}]; },
  unzipper: { Extract: ({ path }) => { mkdirSync(path); writeFileSync(join(path, 'meta.json'), JSON.stringify({ emojis: [{ downloaded: true, fileName: '../../sentinel.txt', emoji: { name: 'fixture' } }] })); return new Writable({ write(_chunk, _encoding, callback) { callback(); } }); } },
 });
 await importer.call({ logger: log, driveFilesRepository: { findOneBy: async () => ({ url: 'fixture' }) }, downloadService: { downloadUrl: async () => {} }, emojisRepository: { delete: async () => {} }, driveService: { addFile: async ({ path }) => { capturedFile = readFileSync(path, 'utf8'); return {}; } }, customEmojiService: { add: async () => {} } }, { data: { fileId: 'fixture' } }, finished);
 await Promise.race([complete, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Fixture importer timeout')), 2000); timer.unref(); })]);
 assert.equal(capturedFile, 'fixture-only-local-file');
 results.legacyEmojiMetadataRead = { readOutsideExtractionDirectory: true, valueWasOwnSentinel: true };

 const extractDir = join(temporary, 'extract'); mkdirSync(extractDir);
 const archive = join(temporary, 'fixture.zip');
 execFileSync('python3', ['-c', 'import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],"w") as z:\n for n in ["safe.txt","../outside.txt","../extract-sibling/outside.txt","..\\\\outside2.txt"]: z.writestr(n,"fixture")\n i=zipfile.ZipInfo("link");i.create_system=3;i.external_attr=0o120777<<16;z.writestr(i,"../sentinel.txt")', archive]);
 const extractor = requireProbe('unzipper').Extract({ path: extractDir });
 createReadStream(archive).pipe(extractor); await extractor.promise();
 assert.equal(readFileSync(join(extractDir, 'safe.txt'), 'utf8'), 'fixture');
 assert.equal(existsSync(join(temporary, 'outside.txt')), false);
 assert.equal(existsSync(join(temporary, 'extract-sibling/outside.txt')), false);
 assert.equal(existsSync(join(temporary, 'outside2.txt')), false);
 assert.equal(requireProbe('node:fs').lstatSync(join(extractDir, 'link')).isSymbolicLink(), false);
 results.zipExtraction = { ordinaryFilePreserved: true, testedTraversalWrites: 3, escapedWrites: 0, symlinkCreated: false };

 const Koa = requireProbe('koa');
 const { KoaAdapter } = requireProbe('@bull-board/koa');
 const clientFile = source(B + 'server/web/ClientServerService.ts');
 const authUse = find(clientFile, n => ts.isCallExpression(n) && n.expression.getText(clientFile) === 'app.use' && n.arguments[0]?.getText(clientFile).includes('ctx.path === bullBoardPath'));
 const middleware = evaluate(`function() { return ${authUse.arguments[0].getText(clientFile)}; }`, { bullBoardPath: '/queue' }).call({ usersRepository: { findOneBy: async ({ token }) => token === 'fixture-admin' ? { isAdmin: true } : null } });
 const adapter = new KoaAdapter(); adapter.setBasePath('/queue'); adapter.setViewsPath(temporary); adapter.setStaticPath('/static', temporary); adapter.setEntryRoute({ method: 'get', route: '/', handler: () => ({ name: 'index.ejs' }) }); adapter.setQueues({}); adapter.setErrorHandler(() => ({ status: 500, body: {} })); adapter.setApiRoutes([{ method: 'get', route: '/api/queues', handler: async () => ({ status: 200, body: { fixtureQueue: true } }) }]);
 const app = new Koa(); app.use(middleware); app.use(adapter.registerPlugin());
 const context = (path, headers = {}) => { const req = { url: path, method: 'GET', headers, socket: { remoteAddress: '127.0.0.1' } }; const ctx = app.createContext(req, new ServerResponse(req)); ctx.status = 404; return ctx; };
 const routing = requireProbe('koa-compose')(app.middleware);
 const statuses = {};
 for (const path of ['/queue/api/queues', '/Queue/api/queues', '/%71ueue/api/queues', '/queuex/api/queues', '//queue/api/queues']) {
  const ctx = context(path); await routing(ctx, async () => {}); statuses[path] = ctx.status;
  assert.notEqual(ctx.status, 200, path);
 }
 const admin = context('/queue/api/queues', { cookie: 'token=fixture-admin' }); await routing(admin, async () => {}); assert.equal(admin.status, 200);
 results.dashboardPaths = { unauthenticatedStatuses: statuses, authenticatedControl: admin.status };

 app.proxy = true;
 const ips = ['198.51.100.1', '198.51.100.2'].map(ip => app.createContext({ url: '/', method: 'POST', headers: { 'x-forwarded-for': ip }, socket: { remoteAddress: '127.0.0.1' } }, {}).ip);
 assert.notEqual(ips[0], ips[1]);
 results.forwardedFor = { sameSocketDifferentReportedIPs: ips };

 const reset = endpoint(B + 'server/api/endpoints/admin/reset-password.ts', { usersRepository: { findOneBy: async () => ({ isAdmin: true }) } });
 await assert.rejects(reset({ userId: 'admin' }, { isModerator: true }), /cannot reset password of admin/);
 results.adminPasswordReset = { administratorTargetRejected: true };
 writeFileSync(resolve(process.argv[3]), JSON.stringify({ revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), node: process.version, dependencyVersions: versions, scriptSha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'), method: 'Exact source methods and callbacks extracted with TypeScript AST; injected repositories, credentials, rate limiter and HTTP responses; real pinned ZIP/Koa adapter libraries; not full-stack tests.', sources: Object.fromEntries(sources), results }, null, 2) + '\n');
 console.log(`Recorded ${Object.keys(results).length} bounded impact probes`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
