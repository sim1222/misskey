// These inputs deliberately use the APIs exercised by Misskey, rather than
// snapshotting dependency internals. The expected results came from 5d53b9aa7.
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function dependencyContracts(require) {
	const results = {};
	const QRCode = require('qrcode');
	results.qr = ['otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&issuer=example.test', '日本語 🙂'].map(value => {
		const code = QRCode.create(value);
		return { version: code.version, size: code.modules.size, matrix: digest(code.modules.data) };
	});
	const CIDR = require('ip-cidr');
	results.cidr = ['192.0.2.0/24', '2001:db8::/64', '::ffff:192.0.2.0/120'].map(network => {
		const cidr = new CIDR(network);
		return { network, range: cidr.toRange(), contains: ['192.0.2.0', '192.0.2.255', '192.0.3.0', '2001:db8::', '2001:db8::ffff', '2001:db9::'].map(ip => cidr.contains(ip)) };
	});
	results.ipHashPrefix = CIDR.createAddress('2001:db8:1234:5678:abcd::1').mask(64);
	results.svg = ['<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>', '<?xml version="1.0"?><svg/>', '<html><svg/></html>', '<p>svg</p>', '', '<!DOCTYPE svg><svg/>'].map(require('is-svg'));
	const { JSDOM } = require('jsdom');
	const parse5 = require('parse5');
	results.html = ['<p>日本語 &amp; 🙂<br><b>bold</b>', '<table><tr><td>x', '<a href="https://example.test/?a=1&amp;b=2" rel="me">@alice</a>', '<p><div>x</div>y'].map(html => {
		const dom = new JSDOM(html);
		try { return { parsed: parse5.serialize(parse5.parseFragment(html)), html: dom.window.document.body.innerHTML, text: dom.window.document.body.textContent }; }
		finally { dom.window.close(); }
	});
	const date = require('date-fns');
	results.dates = ['2024-02-29T23:59:59Z', '2024-03-10T09:59:59Z', '2024-11-03T08:59:59Z'].map(value => {
		const parsed = date.parseISO(value);
		return { days: date.addDays(parsed, 1).toISOString(), months: date.addMonths(parsed, 1).toISOString(), distance: date.differenceInSeconds(date.addMinutes(parsed, 3), parsed) };
	});
	const { of, lastValueFrom, map, filter, toArray } = require('rxjs');
	results.observable = await lastValueFrom(of(1, 2, 3, 4).pipe(filter(value => value % 2 === 0), map(value => value * 3), toArray()));
	const archive = require('archiver')('zip', { zlib: { level: 9 }, forceLocalTime: false });
	const chunks = [];
	archive.on('data', chunk => chunks.push(chunk));
	const ended = once(archive, 'end');
	for (const [name, content] of [['notes.json', '{"text":"日本語 🙂"}\n'], ['files/添付.txt', 'attachment\n']]) {
		archive.append(content, { name, date: new Date('2024-01-02T03:04:06Z'), mode: 0o644 });
	}
	await archive.finalize();
	await ended;
	const zip = Buffer.concat(chunks);
	const entries = await require('unzipper').Open.buffer(zip);
	results.zip = { digest: digest(zip), entries: await Promise.all(entries.files.map(async file => ({ name: file.path, content: (await file.buffer()).toString() }))) };
	results.proxy = await proxyContract(require);
	return results;
}

async function proxyContract(require) {
	const sockets = new Set();
	const track = socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); };
	const target = http.createServer((request, response) => {
		response.writeHead(201, { 'content-type': 'text/plain; charset=utf-8' });
		response.end(`${request.method} ${request.url} ${request.headers['x-fixture']} 日本語`);
	});
	const routes = [];
	const proxy = http.createServer();
	proxy.on('connect', (request, downstream, head) => {
		track(downstream);
		const [host, port] = request.url.split(':');
		routes.push(host === '127.0.0.1' && Number(port) === target.address().port);
		// This fixture may only connect to its own loopback target.
		if (!routes.at(-1)) { downstream.destroy(); return; }
		const upstream = net.connect(Number(port), host);
		track(upstream);
		upstream.on('error', () => downstream.destroy());
		downstream.on('error', () => upstream.destroy());
		upstream.once('connect', () => { downstream.write('HTTP/1.1 200 Connection Established\r\n\r\n'); upstream.write(head); downstream.pipe(upstream).pipe(downstream); });
	});
	let agent;
	try {
		target.listen(0, '127.0.0.1'); await once(target, 'listening');
		proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
		agent = new (require('hpagent').HttpProxyAgent)({ keepAlive: true, proxy: `http://127.0.0.1:${proxy.address().port}` });
		const response = await new Promise((resolve, reject) => {
			const request = http.get(`http://127.0.0.1:${target.address().port}/attachment?q=a%20b`, { agent, headers: { 'x-fixture': 'contract' } }, resolve);
			request.on('error', reject);
			request.setTimeout(5000, () => request.destroy(new Error('Proxy contract timed out')));
		});
		const chunks = [];
		for await (const chunk of response) chunks.push(chunk);
		return { status: response.statusCode, contentType: response.headers['content-type'], body: Buffer.concat(chunks).toString(), routes };
	} finally {
		agent?.destroy();
		for (const socket of sockets) socket.destroy();
		await Promise.all([target, proxy].map(server => new Promise((resolve, reject) => {
			if (!server.listening) return resolve();
			server.close(error => error ? reject(error) : resolve());
		})));
	}
}
