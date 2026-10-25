import { isIP, Socket } from 'node:net';
import type { LookupFunction } from 'node:net';
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
}

type Address = { address: string; family: 4 | 6 };
type AddressLookup = { lookupAsync(host: string, options: { all: true; family?: 4 | 6; hints?: number }): Promise<readonly Address[]> };

/**
 * Resolve once and let Node choose only from that fixed, checked address list.
 * Keep Node's normal dual-stack and multi-address connection fallback.
 * This also pins proxy CONNECT targets, so neither a redirect nor a second DNS
 * lookup at the proxy can turn a permitted hostname into a private destination.
 * HTTP Host, TLS SNI and certificate verification still use the original name.
 */
export function guardOutboundAgent<T extends Agent>(agent: T, lookup: AddressLookup, policy: OutboundAddressPolicy, proxy = false): T {
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
			const literalFamily = isIP(host);
			const addresses = literalFamily ? [{ address: host, family: literalFamily }] : await lookup.lookupAsync(host, { all: true, family, hints: options.hints });
			const approved = addresses.filter(entry => policy.allows(entry.address));
			if (!approved.length) throw new Error(`Blocked outbound address: ${addresses.map(entry => entry.address).join(', ')}`);
			const explicitServerName = 'servername' in options && typeof options.servername === 'string' ? options.servername : undefined;
			const identity = { servername: explicitServerName ?? (literalFamily ? undefined : host) };
			if (!proxy) {
				const pinnedLookup: LookupFunction = (_name, request, resolve) => {
					if (request.all) resolve(null, approved.map(entry => ({ ...entry })));
					else resolve(null, approved[0].address, approved[0].family);
				};
				const socket = connect({ ...options, ...identity, host, hostname: host, lookup: pinnedLookup }, done);
				if (socket) done(null, socket);
				return;
			}
			// A CONNECT proxy resolves its own targets unless given an IP. Try
			// only the already checked IPs, retaining fallback on proxy failures.
			const attempt = (index: number) => {
				const target = approved[index];
				let settled = false;
				const connected = (error: Error | null, socket: Duplex | null) => {
					if (settled) return;
					settled = true;
					if (error && index + 1 < approved.length) {
						socket?.destroy();
						attempt(index + 1);
					} else done(error, socket ?? new Socket().destroy());
				};
				const destination: ClientRequestArgs & { servername?: string } = {
					...options, ...identity, host: target.family === 6 ? `[${target.address}]` : target.address, hostname: target.address, family: target.family,
				};
				try {
					const socket = connect(destination, connected);
					if (socket) connected(null, socket);
				} catch (error) { connected(error instanceof Error ? error : new Error(String(error)), null); }
			};
			attempt(0);
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
