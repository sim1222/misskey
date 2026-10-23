// Loaded before the application, including workers. Fixtures may use loopback TCP only.
const net = require('node:net');
const { syncBuiltinESMExports } = require('node:module');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
	const options = Array.isArray(args[0]) ? args[0][0] : args[0];
	const host = typeof options === 'object' ? (options.host ?? 'localhost') : (typeof args[1] === 'string' ? args[1] : 'localhost');
	if (typeof options === 'string' || options?.path || !['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(host)) {
		throw new Error(`Regression fixture blocked non-loopback connection: ${host}`);
	}
	return connect.apply(this, args);
};
syncBuiltinESMExports();
if (process.env.NODE_V8_COVERAGE) process.once('SIGTERM', () => {
	// The legacy HTTP server has no shutdown hook. Flush evidence before exiting
	// this disposable process; the parent waits for exit before deleting its data.
	require('node:v8').takeCoverage();
	process.exit(0);
});
