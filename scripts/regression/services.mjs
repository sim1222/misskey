import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const label = 'io.misskey.regression.services';
const services = [
	{ name: 'misskey-regression-postgres18', image: 'postgres:18-alpine', args: ['--tmpfs', '/var/lib/postgresql', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=test-misskey', '-p', '127.0.0.1:54318:5432'], health: ['pg_isready', '-U', 'postgres', '-d', 'test-misskey'] },
	{ name: 'misskey-regression-redis', image: 'redis:7-alpine', args: ['-p', '127.0.0.1:56318:6379'], health: ['redis-cli', 'ping'] },
];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
for (const service of services) {
	let existing;
	try { existing = JSON.parse(docker('inspect', service.name))[0]; } catch (error) { if (!String(error.stderr).includes('No such')) throw error; }
	if (existing) {
		assert.equal(existing.Config.Labels?.[label], 'true', `Unowned container: ${service.name}`);
		assert.equal(existing.Config.Image, service.image, 'Do not upgrade an existing data directory in place');
	}
	if (process.argv.includes('--down')) {
		if (existing) docker('rm', '-f', '-v', service.name);
		continue;
	}
	if (existing) docker('start', service.name);
	else docker('run', '-d', '--name', service.name, '--label', `${label}=true`, ...service.args, service.image);
	let ready = false;
	for (let attempt = 0; attempt < 60; attempt++) {
		try { docker('exec', service.name, ...service.health); ready = true; break; } catch { await delay(500); }
	}
	assert.ok(ready, `${service.name} did not become ready`);
	console.log(`${service.name}: ready (${service.image})`);
}
