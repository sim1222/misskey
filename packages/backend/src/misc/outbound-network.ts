import { isIP, Socket } from 'node:net';
import type { Agent, ClientRequestArgs } from 'node:http';
import type { Duplex } from 'node:stream';
import ipaddr from 'ipaddr.js';

/** Apply the explicit private-network exceptions before opening any socket. */
export class OutboundAddressPolicy {
	private readonly networks: ReturnType<typeof ipaddr.parseCIDR>[];
	constructor(networks: readonly string[] = []) {
		this.networks = networks.map(network => ipaddr.parseCIDR(network));
	}
	public allows(value: string): boolean {
		if (!isIP(value)) return false;
		const address = ipaddr.process(value);
		const original = ipaddr.parse(value);
		if (this.networks.some(([network, bits]) => (address.kind() === network.kind() && address.match(network, bits)) || (original.kind() === network.kind() && original.match(network, bits)))) return true;
		return address.range() === 'unicast';
	}
	public assert(value: string): void {
		if (!this.allows(value)) throw new Error(`Blocked outbound address: ${value}`);
	}
}

/**
 * Resolve once, check that address, then connect to the checked IP itself.
 * This also pins proxy CONNECT targets, so neither a redirect nor a second DNS
 * lookup at the proxy can turn a permitted hostname into a private destination.
 * HTTP Host, TLS SNI and certificate verification still use the original name.
 */
export function guardOutboundAgent<T extends Agent>(agent: T, lookup: { lookupAsync(host: string, options: { family?: 4 | 6 }): Promise<{ address: string; family: 4 | 6 }> }, policy: OutboundAddressPolicy, proxy = false): T {
	const connect = agent.createConnection.bind(agent);
	agent.createConnection = (options, callback) => {
		if (!callback) throw new Error('Outbound agent requires a connection callback');
		let delivered = false;
		const done = (error: Error | null, socket: Duplex) => {
			if (delivered) return;
			delivered = true;
			callback(error, socket);
		};
		const open = async () => {
			const name = options.hostname ?? options.host;
			if (typeof name !== 'string' || !name) throw new Error('Outbound host is required');
			const host = name.replace(/^\[|\]$/g, '');
			const family = options.family === 4 || options.family === 6 ? options.family : undefined;
			const target = isIP(host) ? { address: host, family: isIP(host) } : await lookup.lookupAsync(host, { family });
			policy.assert(target.address);
			const explicitServerName = 'servername' in options && typeof options.servername === 'string' ? options.servername : undefined;
			const destination: ClientRequestArgs & { servername?: string } = {
				...options, host: proxy && target.family === 6 ? `[${target.address}]` : target.address, hostname: target.address, family: target.family,
				servername: explicitServerName ?? (isIP(host) ? undefined : host),
			};
			const socket = connect(destination, done);
			if (socket) done(null, socket);
		};
		void open().catch(error => {
			// Node's Agent callback requires a stream also on a connection error.
			// Return a failed, unopened socket; no network connection is attempted.
			done(error instanceof Error ? error : new Error(String(error)), new Socket().destroy());
		});
		return undefined;
	};
	return agent;
}
