// Loaded before the application, including workers. Fixtures may use loopback TCP only.
const net = require('node:net');
const dns = require('node:dns');
const { promisify } = require('node:util');
const { syncBuiltinESMExports } = require('node:module');
const connect = net.Socket.prototype.connect;
const localNames = new Set(['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1']);
net.Socket.prototype.connect = function (...args) {
	const options = Array.isArray(args[0]) ? args[0][0] : args[0];
	const host = typeof options === 'object' ? (options.host ?? 'localhost') : (typeof args[1] === 'string' ? args[1] : 'localhost');
	if (typeof options === 'string' || options?.path || !localNames.has(host)) {
		throw new Error(`Regression fixture blocked non-loopback connection: ${host}`);
	}
	return connect.apply(this, args);
};

// Pre-connect address checking resolves DNS before Socket.connect. Keep those
// lookups isolated too, rather than depending on an external resolver's timing.
const checkDns = host => {
	if (!localNames.has(host)) throw new Error(`Regression fixture blocked external DNS: ${host}`);
};
const guardDns = (owner, key, asynchronous) => {
	const original = owner[key];
	if (typeof original !== 'function') return;
	const wrapped = asynchronous ? async function (...args) { checkDns(args[0]); return original.apply(this, args); }
		: function (...args) { checkDns(args[0]); return original.apply(this, args); };
	for (const symbol of Object.getOwnPropertySymbols(original)) {
		if (symbol !== promisify.custom) Object.defineProperty(wrapped, symbol, Object.getOwnPropertyDescriptor(original, symbol));
	}
	if (typeof original[promisify.custom] === 'function') wrapped[promisify.custom] = async function (...args) {
		checkDns(args[0]); return original[promisify.custom].apply(this, args);
	};
	owner[key] = wrapped;
};
for (const [owner, asynchronous] of [[dns, false], [dns.promises, true], [dns.Resolver.prototype, false], [dns.promises.Resolver.prototype, true]]) {
	for (const key of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse']) guardDns(owner, key, asynchronous);
}
syncBuiltinESMExports();
if (process.env.NODE_V8_COVERAGE) process.once('SIGTERM', () => {
	// The legacy HTTP server has no shutdown hook. Flush evidence before exiting
	// this disposable process; the parent waits for exit before deleting its data.
	require('node:v8').takeCoverage();
	process.exit(0);
});
