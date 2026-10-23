import * as fs from 'node:fs';
import Ajv from 'ajv';
import type multer from '@koa/multer';
import type { Schema, SchemaType } from '@/misc/schema.js';
import type { CacheableLocalUser } from '@/models/entities/User.js';
import type { AccessToken } from '@/models/entities/AccessToken.js';
import { ApiError } from './error.js';
import type { IEndpointMeta } from './endpoints.js';

const ajv = new Ajv({
	useDefaults: true,
});

ajv.addFormat('misskey:id', /^[a-zA-Z0-9]+$/);

export type Response = unknown;
export type UploadedFile = Pick<multer.File, 'fieldname' | 'originalname' | 'encoding' | 'mimetype' | 'size' | 'destination' | 'filename' | 'path'>;

type executor<T extends IEndpointMeta, Ps extends Schema> =
	(params: SchemaType<Ps>, user: T['requireCredential'] extends true ? CacheableLocalUser : CacheableLocalUser | null, token: AccessToken | null, file?: UploadedFile, cleanup?: () => void, ip?: string | null, headers?: Record<string, string> | null) =>
		Promise<T['res'] extends undefined ? Response : SchemaType<NonNullable<T['res']>>>;

export abstract class Endpoint<T extends IEndpointMeta, Ps extends Schema> {
	public exec: (params: unknown, user: T['requireCredential'] extends true ? CacheableLocalUser : CacheableLocalUser | null, token: AccessToken | null, file?: UploadedFile, ip?: string | null, headers?: Record<string, string> | null) => ReturnType<executor<T, Ps>>;

	constructor(meta: T, paramDef: Ps, cb: executor<T, Ps>) {
		const validate = ajv.compile<SchemaType<Ps>>(paramDef);

		this.exec = (params: unknown, user: T['requireCredential'] extends true ? CacheableLocalUser : CacheableLocalUser | null, token: AccessToken | null, file?: UploadedFile, ip?: string | null, headers?: Record<string, string> | null) => {
			let cleanup: undefined | (() => void) = undefined;

			if (meta.requireFile) {
				if (file == null) return Promise.reject(new ApiError({
					message: 'File required.',
					code: 'FILE_REQUIRED',
					id: '4267801e-70d1-416a-b011-4ee502885d8b',
				}));
				cleanup = () => {
					fs.unlink(file.path, () => {});
				};

			}

			if (!validate(params)) {
				cleanup?.();

				const error = validate.errors?.[0];
				const err = new ApiError({
					message: 'Invalid param.',
					code: 'INVALID_PARAM',
					id: '3d81ceae-475f-4600-b2a8-2bc116157532',
				}, {
					param: error?.schemaPath,
					reason: error?.message,
				});
				return Promise.reject(err);
			}

			return cb(params, user, token, file, cleanup, ip, headers);
		};
	}
}
