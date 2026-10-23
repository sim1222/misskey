import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, readdir, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Koa from 'koa';
import multer from '@koa/multer';

describe('Koa / Multer disk upload compatibility', () => {
	let server: Server;
	let directory: string;
	let base: string;

	beforeAll(async () => {
		directory = await mkdtemp(join(tmpdir(), 'misskey-upload-test-'));
		const app = new Koa();
		app.use(async (ctx, next) => {
			try { await next(); } catch (error) {
				ctx.status = (error as any).code === 'LIMIT_FILE_SIZE' ? 413 : 400;
				ctx.body = { error: (error as any).code ?? 'INVALID_MULTIPART' };
			}
		});
		app.use(async (ctx, next) => {
			if (ctx.path === '/health') ctx.body = { ok: true };
			else await next();
		});
		app.use(multer({ storage: multer.diskStorage({ destination: directory }), limits: { fileSize: 1024, files: 1 } }).single('file'));
		app.use(async ctx => {
			const file = (ctx.request as any).file;
			if (!file) ctx.throw(400);
			try {
				ctx.body = { name: file.originalname, size: file.size, content: await readFile(file.path, 'utf8') };
			} finally { await unlink(file.path); }
		});
		server = createServer(app.callback());
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as any).port}`;
	});

	afterEach(async () => {
		expect(await readdir(directory)).toEqual([]);
	});

	afterAll(async () => {
		await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
		await rm(directory, { recursive: true, force: true });
	});

	it('retains the request.file disk API used by drive uploads', async () => {
		const form = new FormData();
		form.append('file', new Blob(['existing upload']), 'avatar.txt');
		const response = await fetch(base, { method: 'POST', body: form });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ name: 'avatar.txt', size: 15, content: 'existing upload' });
	});

	it('rejects an oversized upload and removes the partial file', async () => {
		const form = new FormData();
		form.append('file', new Blob(['x'.repeat(2048)]), 'too-large.txt');
		const response = await fetch(base, { method: 'POST', body: form });
		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: 'LIMIT_FILE_SIZE' });
	});

	it('rejects a truncated multipart body and keeps serving requests', async () => {
		const response = await fetch(base, {
			method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=fixture' },
			body: '--fixture\r\nContent-Disposition: form-data; name="file"; filename="partial.txt"\r\n\r\ntruncated',
		});
		expect(response.status).toBe(400);
		expect((await fetch(`${base}/health`)).status).toBe(200);
	});
});
