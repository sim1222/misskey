import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Test-process IPC only; no debug route or application code is added. Reading
// after readiness also avoids evaluating the legacy circular module graph twice.
process.on('message', async message => {
	if (message === 'regression:metadata') {
		const { default: endpoints } = await import(pathToFileURL(resolve(process.cwd(), 'built/server/api/endpoints.js')));
		process.send({ kind: 'metadata', endpoints });
	}
});
