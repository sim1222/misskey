process.env.NODE_ENV = 'test';

import { randomUUID } from 'node:crypto';
import Bull from 'bull';
import { loadConfig } from '@/config.js';

describe('Bull queue serialization on the supported Node runtime', () => {
	const config = loadConfig();
	const queue = new Bull(`maintenance-${randomUUID()}`, {
		redis: {
			host: config.redis.host,
			port: config.redis.port,
			db: config.redis.db ?? 0,
			password: config.redis.pass,
		},
	});

	afterAll(async () => {
		try {
			await queue.obliterate({ force: true });
		} finally {
			await queue.close();
		}
	});

	it('round-trips multilingual job data through Redis', async () => {
		const data = { activity: { type: 'Create', content: '日本語と🙂'.repeat(1024) }, attempt: 0 };
		const job = await queue.add(data);
		const stored = await queue.getJob(job.id);
		expect(stored).not.toBeNull();
		expect(stored!.data).toEqual(data);
	});
});
