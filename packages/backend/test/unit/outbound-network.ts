import { createServer, Agent } from 'node:http';
import type { Server } from 'node:http';
import { connect } from 'node:net';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import CacheableLookup from 'cacheable-lookup';
import { jest } from '@jest/globals';
import { loadConfig } from '@/config.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { OutboundAddressPolicy, guardOutboundAgent } from '@/misc/outbound-network.js';

describe('Outbound addresses are checked before connecting', () => {
	const policy = new OutboundAddressPolicy();
	it.each(['0.0.0.0', '127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '100.64.0.1', '169.254.169.254', '224.0.0.1', '255.255.255.255', '::', '::1', 'fc00::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:169.254.169.254', 'invalid'])('blocks non-public %s', address => expect(policy.allows(address)).toBe(false));
	it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8'])('preserves public %s', address => expect(policy.allows(address)).toBe(true));
	it('preserves explicit IPv4, IPv6 and mapped private-network exceptions', () => {
		const allowed = new OutboundAddressPolicy(['10.1.0.0/16', 'fd12::/32', '::ffff:192.168.1.0/120']);
		for (const address of ['10.1.2.3', '::ffff:10.1.2.3', 'fd12::1234', '::ffff:192.168.1.8']) expect(allowed.allows(address)).toBe(true);
		for (const address of ['10.2.0.1', 'fd13::1', '192.168.2.1']) expect(allowed.allows(address)).toBe(false);
	});
});

describe('Checked agent connection boundaries', () => {
	it.each([false, true])('pins IPv6 and preserves the original TLS identity (proxy=%s)', async proxy => {
		const agent = new Agent();
		const stream = new PassThrough();
		const captured = jest.fn<typeof agent.createConnection>().mockReturnValue(stream);
		agent.createConnection = captured;
		guardOutboundAgent(agent, { lookupAsync: async () => [{ address: '2606:4700:4700::1111', family: 6 }] }, new OutboundAddressPolicy(), proxy);
		await new Promise<void>((resolve, reject) => { agent.createConnection({ hostname: 'peer.example', family: 6 }, (error, socket) => { if (error) reject(error); else { expect(socket).toBe(stream); resolve(); } }); });
		expect(captured).toHaveBeenCalledWith(expect.objectContaining({ host: proxy ? '[2606:4700:4700::1111]' : 'peer.example', hostname: proxy ? '2606:4700:4700::1111' : 'peer.example', servername: 'peer.example', family: 6 }), expect.any(Function));
		if (!proxy) {
			const lookup = captured.mock.calls[0][0].lookup; if (!lookup) throw new Error('Expected pinned lookup');
			const one = jest.fn(); lookup('peer.example', { all: false }, one);
			expect(one).toHaveBeenCalledWith(null, '2606:4700:4700::1111', 6);
			const all = jest.fn(); lookup('peer.example', { all: true }, all);
			expect(all).toHaveBeenCalledWith(null, [{ address: '2606:4700:4700::1111', family: 6 }]);
		}
		stream.destroy(); agent.destroy();
	});
	it.each([false, true])('preserves explicit SNI and delivers each connection once (proxy=%s)', async proxy => {
		const agent = new Agent(); const stream = new PassThrough();
		agent.createConnection = (_options, callback) => { callback?.(null, stream); return stream; };
		guardOutboundAgent(agent, { lookupAsync: async () => { throw new Error('Literal addresses must not use DNS'); } }, new OutboundAddressPolicy(), proxy);
		const callback = jest.fn();
		const options = { host: '[2606:4700:4700::1111]', servername: 'explicit.example', family: 4 };
		agent.createConnection(options, callback);
		await new Promise(resolve => setImmediate(resolve));
		expect(callback).toHaveBeenCalledTimes(1); expect(callback).toHaveBeenCalledWith(null, stream);
		expect(() => agent.createConnection({ host: '1.1.1.1' })).toThrow(/callback/);
		stream.destroy(); agent.destroy();
	});
	it('filters a mixed DNS answer without changing the checked snapshot', async () => {
		const agent = new Agent(); const stream = new PassThrough(); const connect = jest.fn<typeof agent.createConnection>().mockReturnValue(stream); agent.createConnection = connect;
		guardOutboundAgent(agent, { lookupAsync: async () => [{ address: '127.0.0.1', family: 4 }, { address: '1.1.1.1', family: 4 }] }, new OutboundAddressPolicy());
		await new Promise<void>((resolve, reject) => agent.createConnection({ host: 'peer.example' }, error => error ? reject(error) : resolve()));
		const lookup = connect.mock.calls[0][0].lookup; if (!lookup) throw new Error('Expected fixed lookup');
		const result = jest.fn(); lookup('peer.example', { all: true }, result);
		expect(result).toHaveBeenCalledWith(null, [{ address: '1.1.1.1', family: 4 }]);
		stream.destroy(); agent.destroy();
	});
	it.each([new Error('Proxy setup failed'), 'Proxy setup failed'])('reports synchronous proxy failures', async failure => {
		const agent = new Agent(); agent.createConnection = () => { throw failure; };
		guardOutboundAgent(agent, { lookupAsync: async () => [{ address: '1.1.1.1', family: 4 }] }, new OutboundAddressPolicy(), true);
		await expect(new Promise((resolve, reject) => agent.createConnection({ host: 'peer.example' }, (error, socket) => error ? reject(error) : resolve(socket)))).rejects.toThrow('Proxy setup failed');
		agent.destroy();
	});
	it('closes a failed proxy stream before trying the next checked address', async () => {
		const agent = new Agent(); const failed = new PassThrough(); const winner = new PassThrough(); let attempts = 0;
		agent.createConnection = (_options, callback) => {
			if (attempts++ === 0) { callback?.(new Error('First target failed'), failed); return undefined; }
			return winner;
		};
		guardOutboundAgent(agent, { lookupAsync: async () => [{ address: '1.1.1.1', family: 4 }, { address: '8.8.8.8', family: 4 }] }, new OutboundAddressPolicy(), true);
		await new Promise<void>((resolve, reject) => agent.createConnection({ host: 'peer.example' }, (error, stream) => { if (error) reject(error); else { expect(stream).toBe(winner); resolve(); } }));
		expect(attempts).toBe(2); expect(failed.destroyed).toBe(true); winner.destroy(); agent.destroy();
	});
	it('does not invent a TLS server name for a literal IP destination', async () => {
		const agent = new Agent(); const stream = new PassThrough();
		const connect = jest.fn<typeof agent.createConnection>().mockReturnValue(stream); agent.createConnection = connect;
		guardOutboundAgent(agent, { lookupAsync: async () => { throw new Error('No DNS for literals'); } }, new OutboundAddressPolicy());
		await new Promise<void>((resolve, reject) => agent.createConnection({ host: '1.1.1.1' }, error => error ? reject(error) : resolve()));
		expect(connect).toHaveBeenCalledWith(expect.objectContaining({ host: '1.1.1.1', servername: undefined }), expect.any(Function));
		stream.destroy(); agent.destroy();
	});
	it.each(['host', 'dns', 'connect'])('reports %s failures without attempting a forbidden connection', async failure => {
		const agent = new Agent(); const connect = jest.fn<typeof agent.createConnection>().mockImplementation(() => { throw new Error('Connect failure'); }); agent.createConnection = connect;
		guardOutboundAgent(agent, { lookupAsync: async () => { if (failure === 'dns') throw 'DNS failure'; return [{ address: '1.1.1.1', family: 4 }]; } }, new OutboundAddressPolicy());
		await expect(new Promise((resolve, reject) => agent.createConnection(failure === 'host' ? {} : { host: 'peer.example' }, (error, socket) => error ? reject(error) : resolve(socket)))).rejects.toThrow(/required|DNS failure|Connect failure/);
		expect(connect).toHaveBeenCalledTimes(failure === 'connect' ? 1 : 0); agent.destroy();
	});
});

describe('HTTP requests preserve normal routing while refusing SSRF', () => {
	let server: Server;
	let port: number;
	const received: string[] = [];
	const services: HttpRequestService[] = [];
	const service = (networks: string[] = [], proxy?: string) => {
		const value = new HttpRequestService({ ...loadConfig(), allowedPrivateNetworks: networks, proxy }); services.push(value); return value;
	};
	beforeAll(async () => {
		server = createServer((req, res) => {
			received.push(req.url ?? '');
			if (req.url === '/redirect') { res.writeHead(302, { location: `http://127.0.0.2:${port}/private` }); res.end(); }
			else res.end(JSON.stringify({ host: req.headers.host, path: req.url, method: req.method }));
		});
		server.listen(0, '127.0.0.1'); await once(server, 'listening');
		const address = server.address(); if (!address || typeof address === 'string') throw new Error('Expected TCP fixture'); port = address.port;
	});
	afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
	beforeEach(() => received.splice(0));
	afterEach(() => {
		jest.restoreAllMocks();
		for (const value of services.splice(0)) for (const agent of new Set([value.httpAgent, value.httpsAgent, value.getAgentByUrl(new URL('http://example.com'), true), value.getAgentByUrl(new URL('https://example.com'), true)])) agent.destroy();
	});
	it.each(['127.0.0.1', '2130706433', '0177.0.0.1', '0x7f000001'])('blocks a literal/alternative loopback %s before any request reaches the target', async host => {
		await expect(service().getResponse({ url: `http://${host}:${port}/private`, method: 'GET', headers: {} })).rejects.toThrow(/Blocked outbound/);
		expect(received).toEqual([]);
	});
	it('checks DNS results before sending an HTTP request', async () => {
		jest.spyOn(CacheableLookup.prototype, 'query').mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
		await expect(service().getResponse({ url: `http://public.example:${port}/private`, method: 'GET', headers: {} })).rejects.toThrow(/Blocked outbound/);
		expect(received).toEqual([]);
	});
	it('pins the checked DNS answer and preserves the Host, method and query', async () => {
		const lookup = jest.spyOn(CacheableLookup.prototype, 'query').mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]).mockResolvedValueOnce([{ address: '127.0.0.2', family: 4 }]);
		const response = await service(['127.0.0.1/32']).getResponse({ url: `http://public.example:${port}/ok?q=value`, method: 'POST', headers: {}, body: 'original' });
		expect(await response.json()).toEqual({ host: `public.example:${port}`, path: '/ok?q=value', method: 'POST' });
		expect(lookup).toHaveBeenCalledTimes(1);
	});
	it.each(['::1', '127.0.0.2'])('preserves connection fallback when the first address %s is unavailable', async first => {
		const lookup = jest.spyOn(CacheableLookup.prototype, 'query').mockResolvedValue([
			{ address: first, family: first === '::1' ? 6 : 4 }, { address: '127.0.0.1', family: 4 },
		]);
		const response = await service(['127.0.0.0/8', '::1/128']).getResponse({ url: `http://public.example:${port}/fallback`, method: 'GET', headers: {} });
		expect(await response.json()).toEqual({ host: `public.example:${port}`, path: '/fallback', method: 'GET' });
		expect(lookup).toHaveBeenCalledTimes(1);
	});
	it('rechecks the destination after an HTTP redirect', async () => {
		await expect(service(['127.0.0.1/32']).getResponse({ url: `http://127.0.0.1:${port}/redirect`, method: 'GET', headers: {} })).rejects.toThrow(/Blocked outbound/);
		expect(received).toEqual(['/redirect']);
	});
	it.each(['data:text/plain,private', 'file:///etc/passwd'])('refuses a non-HTTP target %s', async url => {
		await expect(service().getResponse({ url, method: 'GET', headers: {} })).rejects.toThrow(/Unsupported outbound/);
		expect(() => service().getAgentByUrl(new URL(url))).toThrow(/Unsupported outbound/);
	});
	it('checks a proxy target before CONNECT and pins allowed destinations without changing Host', async () => {
		const targets: string[] = [];
		const proxy = createServer();
		const sockets = new Set<import('node:net').Socket>();
		proxy.on('connect', (req, socket, head) => {
			targets.push(req.url ?? ''); sockets.add(socket);
			if (req.url?.startsWith('127.0.0.2:')) { socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); return; }
			const upstream = connect(port, '127.0.0.1'); sockets.add(upstream);
			upstream.once('connect', () => { socket.write('HTTP/1.1 200 Connection Established\r\n\r\n'); upstream.write(head); socket.pipe(upstream).pipe(socket); });
		});
		proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
		const address = proxy.address(); if (!address || typeof address === 'string') throw new Error('Expected TCP proxy');
		try {
			const proxyUrl = `http://127.0.0.1:${address.port}`;
			await expect(service([], proxyUrl).getResponse({ url: `http://127.0.0.1:${port}/private`, method: 'GET', headers: {} })).rejects.toThrow(/Blocked outbound/);
			expect(targets).toEqual([]); expect(received).toEqual([]);
			const lookup = jest.spyOn(CacheableLookup.prototype, 'query').mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
			const response = await service(['127.0.0.1/32'], proxyUrl).getResponse({ url: `http://public.example:${port}/ok`, method: 'GET', headers: {} });
			expect(await response.json()).toEqual({ host: `public.example:${port}`, path: '/ok', method: 'GET' });
			expect(targets).toEqual([`127.0.0.1:${port}`]);
			lookup.mockResolvedValue([{ address: '127.0.0.2', family: 4 }, { address: '127.0.0.1', family: 4 }]);
			const fallback = await service(['127.0.0.0/8'], proxyUrl).getResponse({ url: `http://public.example:${port}/proxy-fallback`, method: 'GET', headers: {} });
			expect(await fallback.json()).toEqual({ host: `public.example:${port}`, path: '/proxy-fallback', method: 'GET' });
			expect(targets.slice(-2)).toEqual([`127.0.0.2:${port}`, `127.0.0.1:${port}`]);
			lookup.mockResolvedValue([{ address: '127.0.0.2', family: 4 }]);
			await expect(service(['127.0.0.0/8'], proxyUrl).getResponse({ url: `http://public.example:${port}/proxy-failure`, method: 'GET', headers: {} })).rejects.toThrow(/Bad response: 502/);
		} finally { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => proxy.close(() => resolve())); }
	});
});
