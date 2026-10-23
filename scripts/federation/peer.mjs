import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { chmodSync, readdirSync } from 'node:fs';

// V8 writes its files as 0600. Make only this peer's test evidence readable
// by the host runner after the child has flushed coverage and exited.
process.once('exit', () => {
	const directory = `/evidence/v8/${process.env.FEDERATION_PEER}`;
	for (const name of readdirSync(directory)) if (name.endsWith('.json')) chmodSync(`${directory}/${name}`, 0o644);
});

const config = JSON.parse(await readFile('/misskey/.config/default.yml', 'utf8'));
const { default: db } = await import('/misskey/packages/backend/ormconfig.js');
await db.initialize();
await db.runMigrations();
const [version] = await db.query("SELECT current_setting('server_version_num')::integer AS number");
if (version.number < 180000 || version.number >= 190000) throw new Error('Federation fixture requires PostgreSQL 18');
await db.destroy();

const child = spawn(process.execPath, ['--import', '/misskey/scripts/federation/runtime.mjs', 'built/boot/index.js'], { cwd: '/misskey/packages/backend', stdio: 'inherit', env: { ...process.env, NODE_V8_COVERAGE: `/evidence/v8/${process.env.FEDERATION_PEER}` } });
let failInbox = 0;
const server = createServer({ key: await readFile('/certs/key.pem'), cert: await readFile('/certs/cert.pem') }, (incoming, outgoing) => {
	const chunks = [];
	incoming.on('data', chunk => chunks.push(chunk));
	incoming.on('end', () => {
		const bytes = Buffer.concat(chunks);
		if (incoming.url === '/__fixture__/fail-next-inbox' && incoming.method === 'POST') {
			failInbox = 1; outgoing.writeHead(204); outgoing.end(); return;
		}
		const inbox = incoming.url === '/inbox' || incoming.url?.endsWith('/inbox');
		const evidence = status => {
			if (!inbox) return;
			let activity;
			try { activity = JSON.parse(bytes.toString()); } catch { activity = null; }
			appendFile(`/evidence/${process.env.FEDERATION_PEER}-wire.jsonl`, JSON.stringify({ method: incoming.method, path: incoming.url, status, signature: incoming.headers.signature ?? null, digest: incoming.headers.digest ?? null, bodyDigest: `SHA-256=${createHash('sha256').update(bytes).digest('base64')}`, date: incoming.headers.date, host: incoming.headers.host, activity }) + '\n').catch(error => { console.error(error); process.exitCode = 1; });
		};
		if (inbox && failInbox > 0) { failInbox--; evidence(503); outgoing.writeHead(503); outgoing.end('Injected temporary peer failure'); return; }
		const upstream = request({ host: '127.0.0.1', port: config.port, path: incoming.url, method: incoming.method, headers: { ...incoming.headers, 'x-forwarded-proto': 'https' } }, response => {
			outgoing.writeHead(response.statusCode, response.headers);
			response.pipe(outgoing);
			evidence(response.statusCode);
		});
		upstream.on('error', error => { outgoing.writeHead(502); outgoing.end(error.message); });
		upstream.end(bytes);
	});
});
server.listen(443, '0.0.0.0');
process.once('SIGTERM', () => { child.kill('SIGTERM'); server.close(); setTimeout(() => process.exit(0), 3000).unref(); });
const [code] = await once(child, 'exit');
server.close();
process.exit(code ?? 1);
