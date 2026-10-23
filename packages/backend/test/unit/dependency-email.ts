import { createServer, type Server } from 'node:net';
import { jest } from '@jest/globals';
import { EmailService } from '@/core/EmailService.js';

describe('EmailService with the updated Nodemailer', () => {
	let server: Server;
	let port: number;
	const messages: string[] = [];

	beforeAll(async () => {
		server = createServer(socket => {
			let pending = '';
			let data: string[] | null = null;
			socket.setEncoding('utf8');
			socket.write('220 fixture.invalid ESMTP\r\n');
			socket.on('data', chunk => {
				pending += chunk;
				for (let end; (end = pending.indexOf('\r\n')) >= 0;) {
					const line = pending.slice(0, end);
					pending = pending.slice(end + 2);
					if (data) {
						if (line === '.') {
							messages.push(data.join('\r\n'));
							data = null;
							socket.write('250 queued\r\n');
						} else data.push(line);
					} else if (/^(EHLO|HELO) /i.test(line)) socket.write('250-fixture.invalid\r\n250 8BITMIME\r\n');
					else if (/^DATA$/i.test(line)) { data = []; socket.write('354 continue\r\n'); }
					else if (/^QUIT$/i.test(line)) socket.end('221 goodbye\r\n');
					else socket.write('250 ok\r\n');
				}
			});
		});
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as any).port;
	});

	afterAll(async () => {
		await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
	});

	it('sends multipart notification mail through a local SMTP fixture', async () => {
		const errors = jest.fn();
		const service = new EmailService(
			{ url: 'https://fixture.invalid' } as any,
			{} as any,
			{ fetch: async () => ({ smtpHost: '127.0.0.1', smtpPort: port, smtpSecure: false, smtpUser: null, email: 'sender@fixture.invalid' }) } as any,
			{ getLogger: () => ({ info: jest.fn(), error: errors }) } as any,
		);
		await service.sendEmail('friend@fixture.invalid', 'Dependency update', '<p>fixture-html</p>', 'fixture-text');
		expect(errors).not.toHaveBeenCalled();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('To: friend@fixture.invalid');
		expect(messages[0]).toContain('Subject: Dependency update');
		expect(messages[0]).toMatch(/Content-Type: multipart\/alternative/i);
		expect(messages[0]).toContain('fixture-html');
		expect(messages[0]).toContain('fixture-text');
	});
});
