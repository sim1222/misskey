import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const errors = [];
function record(kind, reason) {
	errors.push({ kind, name: reason instanceof Error ? reason.name : typeof reason, message: reason instanceof Error ? reason.message : String(reason), origin: reason instanceof Error ? /\/built\/([^:)]+\.js)/.exec(reason.stack ?? '')?.[1] ?? '<external>' : '<external>' });
}
process.on('unhandledRejection', reason => record('unhandledRejection', reason));
process.on('uncaughtExceptionMonitor', reason => record('uncaughtException', reason));
// Test-process IPC only; no debug route or application code is added. Reading
// after readiness also avoids evaluating the legacy circular module graph twice.
process.on('message', async message => {
	if (message === 'regression:metadata') {
		const { default: endpoints } = await import(pathToFileURL(resolve(process.cwd(), 'built/server/api/endpoints.js')));
		process.send({ kind: 'metadata', endpoints });
	}
	if (message === 'regression:errors') process.send({ kind: 'runtimeErrors', errors });
});
