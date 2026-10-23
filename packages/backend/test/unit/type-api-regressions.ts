import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DI } from '@/di-symbols.js';
import { loadConfig } from '@/config.js';
import { Meta } from '@/models/entities/Meta.js';
import { User, type ILocalUser } from '@/models/entities/User.js';
import { Note } from '@/models/entities/Note.js';
import { NoteReaction } from '@/models/entities/NoteReaction.js';
import { Emoji } from '@/models/entities/Emoji.js';
import { DriveService } from '@/core/DriveService.js';
import { MetaService } from '@/core/MetaService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { InstanceActorService } from '@/core/InstanceActorService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { MfmService } from '@/core/MfmService.js';
import { UserKeypairStoreService } from '@/core/UserKeypairStoreService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { ApRendererService } from '@/core/remote/activitypub/ApRendererService.js';
import { ApResolverService } from '@/core/remote/activitypub/ApResolverService.js';
import { ApRequestService } from '@/core/remote/activitypub/ApRequestService.js';
import { ApDbResolverService } from '@/core/remote/activitypub/ApDbResolverService.js';
import { ApMfmService } from '@/core/remote/activitypub/ApMfmService.js';
import { LdSignatureService } from '@/core/remote/activitypub/LdSignatureService.js';
import PinnedUsers from '@/server/api/endpoints/pinned-users.js';
import Upload from '@/server/api/endpoints/drive/files/create.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import type { UploadedFile } from '@/server/api/endpoint-base.js';

async function expectFileRemoved(path: string): Promise<void> {
	for (let attempt = 0; attempt < 50; attempt++) {
		try { await access(path); } catch (error) {
			if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return;
			throw error;
		}
		await new Promise(resolve => setTimeout(resolve, 20));
	}
	throw new Error('The upload temporary file was not removed');
}

describe('Regressions exposed by backend type contracts', () => {
	const config = loadConfig();
	const friend = new User({ id: 'friend', username: 'Friend', usernameLower: 'friend', host: null });
	const me: ILocalUser = Object.assign(new User({ id: 'me' }), { host: null });
	const instance = Object.assign(new Meta(), { enableIpLogging: true, pinnedUsers: ['friend', 'gone'] });
	const packMany = jest.fn(async () => []);
	const addFile = jest.fn<DriveService['addFile']>();
	const note = new Note({ id: 'note', userId: 'me', createdAt: new Date('2023-01-01T00:00:00Z') });
	const reaction = Object.assign(new NoteReaction(), { id: 'reaction', noteId: note.id, userId: me.id, reaction: '👍' });
	const modulePromise = Test.createTestingModule({ providers: [
		PinnedUsers, Upload, ApRendererService, ApResolverService,
		{ provide: DI.config, useValue: config },
		{ provide: DI.usersRepository, useValue: { findOneBy: async (query: { usernameLower?: unknown }) => query.usernameLower === 'friend' ? friend : null } },
		{ provide: DI.notesRepository, useValue: { findOneByOrFail: async () => note } },
		{ provide: DI.noteReactionsRepository, useValue: { findOneByOrFail: async () => reaction } },
		...[DI.driveFilesRepository, DI.userProfilesRepository, DI.emojisRepository, DI.pollsRepository].map(provide => ({ provide, useValue: {} })),
		{ provide: MetaService, useValue: { fetch: async () => instance } },
		{ provide: DriveService, useValue: { addFile } },
		{ provide: UserEntityService, useValue: { packMany } },
		{ provide: DriveFileEntityService, useValue: { validateFileName: (name: string) => name !== 'invalid' } },
		{ provide: UtilityService, useValue: { extractDbHost: (url: string) => new URL(url).hostname, isSelfHost: () => true } },
		{ provide: ApDbResolverService, useValue: { parseUri: (url: string) => ({ local: true, type: url.includes('/likes/') ? 'likes' : 'notes', id: 'fixture', rest: 'activity' }) } },
		...[InstanceActorService, HttpRequestService, ApRequestService, MfmService, UserKeypairStoreService, ApMfmService, LdSignatureService].map(provide => ({ provide, useValue: {} })),
	] }).compile();

	afterAll(async () => { await (await modulePromise).close(); });

	it('loads configured pinned users and omits accounts that no longer exist', async () => {
		const endpoint = (await modulePromise).get(PinnedUsers);
		await endpoint.exec({}, null, null);
		expect(packMany).toHaveBeenCalledWith([friend], null, { detail: true });
	});
	it('returns INVALID_FILE_NAME instead of referencing the shadowed metadata variable', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'misskey-type-upload-'));
		const file: UploadedFile = { fieldname: 'file', originalname: 'invalid', encoding: '7bit', mimetype: 'text/plain', size: 1, destination: directory, filename: 'upload', path: join(directory, 'upload') };
		try {
			await writeFile(file.path, 'x');
			await expect((await modulePromise).get(Upload).exec({}, me, null, file)).rejects.toMatchObject({ code: 'INVALID_FILE_NAME' });
			await expectFileRemoved(file.path);
		} finally { await rm(directory, { recursive: true, force: true }); }
	});
	it('maps drive quota failures to NO_FREE_SPACE and preserves request logging arguments', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'misskey-type-upload-'));
		const file: UploadedFile = { fieldname: 'file', originalname: 'good.txt', encoding: '7bit', mimetype: 'text/plain', size: 1, destination: directory, filename: 'upload', path: join(directory, 'upload') };
		const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
		addFile.mockRejectedValueOnce(new IdentifiableError('c6244ed2-a39a-4e1c-bf93-f0fbd7764fa6', 'fixture'));
		try {
			await writeFile(file.path, 'x');
			await expect((await modulePromise).get(Upload).exec({}, me, null, file, '127.0.0.2', { 'user-agent': 'fixture' })).rejects.toMatchObject({ code: 'NO_FREE_SPACE' });
			await expectFileRemoved(file.path);
			expect(addFile).toHaveBeenCalledWith(expect.objectContaining({ requestIp: '127.0.0.2', requestHeaders: { 'user-agent': 'fixture' } }));
		} finally { errorLog.mockRestore(); await rm(directory, { recursive: true, force: true }); }
	});
	it('awaits Note rendering before wrapping a local Create activity', async () => {
		const app = await modulePromise;
		const rendered = { type: 'Note' as const, id: `${config.url}/notes/note`, attributedTo: `${config.url}/users/me`, to: ['https://www.w3.org/ns/activitystreams#Public'] };
		const renderNote = jest.spyOn(app.get(ApRendererService), 'renderNote').mockResolvedValueOnce(rendered);
		try {
			const value = await app.get(ApResolverService).createResolver().resolve(`${config.url}/notes/note/activity`);
			expect(value).toMatchObject({ type: 'Create', object: rendered, to: rendered.to });
			expect(JSON.parse(JSON.stringify(value)).object).toEqual(rendered);
		} finally { renderNote.mockRestore(); }
	});
	it('awaits local Like rendering instead of serializing a Promise', async () => {
		const value = await (await modulePromise).get(ApResolverService).createResolver().resolve(`${config.url}/likes/reaction`);
		expect(value).toMatchObject({ type: 'Like', object: `${config.url}/notes/note`, content: '👍' });
	});
	it('serializes an emoji fallback update timestamp instead of omitting a function', async () => {
		const emoji = Object.assign(new Emoji(), { name: 'hello', updatedAt: null, type: 'image/png', originalUrl: 'https://remote.example/emoji.png', publicUrl: null });
		const value = (await modulePromise).get(ApRendererService).renderEmoji(emoji);
		expect(JSON.parse(JSON.stringify(value)).updated).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
	});
});
