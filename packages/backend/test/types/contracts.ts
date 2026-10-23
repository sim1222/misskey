import type { SchemaType } from '@/misc/schema.js';
import type { UserProfile } from '@/models/entities/UserProfile.js';
import type { Signin } from '@/models/entities/Signin.js';
import type { IncomingHttpHeaders } from 'node:http';
import type { MainStreamTypes } from '@/server/api/stream/types.js';
import * as mfm from 'mfm-js';
import redisLock from 'redis-lock';
import { promisify } from 'node:util';
import type Redis from 'ioredis';
import * as image from 'pureimage';
import type { genOpenapiSpec } from '@/server/api/openapi/gen-spec.js';

type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type Assignable<T, U> = [T] extends [U] ? true : false;
type Not<T extends boolean> = T extends true ? false : true;

const params = {
	type: 'object',
	properties: {
		limit: { type: 'integer', default: 10 },
		text: { type: 'string', nullable: true },
	},
	anyOf: [
		{ properties: { userId: { type: 'string' } }, required: ['userId'] },
		{ properties: { groupId: { type: 'string' } }, required: ['groupId'] },
	],
} as const;

type Params = SchemaType<typeof params>;
type NotAny = Assert<Not<IsAny<Params>>>;
type UserRecipient = Assert<Assignable<{ limit: number; userId: string; text: null }, Params>>;
type GroupRecipient = Assert<Assignable<{ limit: number; groupId: string }, Params>>;
type BothRecipients = Assert<Assignable<{ limit: number; userId: string; groupId: string }, Params>>;
type MissingRecipient = Assert<Not<Assignable<{ limit: number }, Params>>>;
type WrongRecipient = Assert<Not<Assignable<{ limit: number; userId: number }, Params>>>;
type MissingDefault = Assert<Not<Assignable<{ userId: string }, Params>>>;
type NullableText = Assert<Assignable<null, Params['text']>>;
type TextNotAny = Assert<Not<IsAny<Params['text']>>>;
type NotificationIds = Assert<Assignable<string[], MainStreamTypes['readNotifications']>>;
type WrongNotificationIds = Assert<Not<Assignable<number[], MainStreamTypes['readNotifications']>>>;
type PersistedHeaders = Assert<Assignable<IncomingHttpHeaders, Signin['headers']>>;
type BadGithubId = Assert<Not<Assignable<{ github: { id: number; login: string; accessToken: string } }, UserProfile['integrations']>>>;
type TypedOpenApiOperation = Assert<Not<IsAny<ReturnType<typeof genOpenapiSpec>['paths'][string]['post']>>>;

// Check real call-site inference, including overloads and the custom promisifier.
export function libraryContracts(client: Redis.Redis, nodes: mfm.MfmNode[]) {
	const acquire = promisify(redisLock(client));
	const pending: Promise<() => Promise<number | undefined>> = acquire('key', 1000);
	const emojis = mfm.extract(nodes, (node): node is mfm.MfmEmojiCode => node.type === 'emojiCode');
	const names: string[] = emojis.map(node => node.props.name);
	const canvas = image.make(8, 8);
	const context = canvas.getContext('2d');
	context.fillStyle = context.createLinearGradient(0, 0, 8, 8);
	const color: string = context.fillStyle;
	return { pending, names, color };
}
