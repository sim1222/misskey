import Ajv from 'ajv';
import type { InboxActivity } from './type.js';

// Queue data crosses a JSON boundary. Validate the declared fields before
// treating a body-parser result as an ActivityPub activity; retain extensions.
const singleObject = { anyOf: [{ type: 'string' }, { $ref: '#/definitions/object' }] };
const apObject = {
	anyOf: [...singleObject.anyOf, { type: 'array', items: singleObject }],
};
const objectProperties = {
	'@context': {
		anyOf: [
			{ type: 'string' }, { type: 'object' },
			{ type: 'array', items: { type: ['string', 'object'] } },
		],
	},
	type: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
	id: { type: 'string' },
	summary: { type: ['string', 'null'] },
	published: { type: 'string' },
	cc: apObject,
	to: apObject,
	attributedTo: apObject,
	attachment: { type: 'array' },
	replies: { anyOf: [{ type: 'string' }, { type: 'null' }, { $ref: '#/definitions/collection' }] },
	content: { type: ['string', 'null'] },
	name: { type: ['string', 'null'] },
	startTime: { type: 'string' },
	// Misskey emits an explicit null for polls without an expiry date.
	endTime: { type: ['string', 'null'] },
	url: apObject,
	href: { type: ['string', 'null'] },
	tag: { anyOf: [{ $ref: '#/definitions/object' }, { type: 'array', items: { $ref: '#/definitions/object' } }] },
	sensitive: { type: 'boolean' },
};

export const validateActivity = new Ajv({ strict: false }).compile<InboxActivity>({
	type: 'object',
	definitions: {
		object: { type: 'object', properties: objectProperties, required: ['type'] },
		collection: {
			type: 'object',
			properties: { ...objectProperties, type: { const: 'Collection' }, totalItems: { type: 'number' }, items: apObject },
			required: ['type'],
		},
	},
	properties: {
		...objectProperties,
		actor: singleObject,
		object: apObject,
		target: singleObject,
		totalItems: { type: 'number' },
		items: apObject,
		orderedItems: apObject,
		signature: {
			type: 'object',
			properties: {
				type: { type: 'string' }, created: { type: 'string' }, creator: { type: 'string' },
				domain: { type: 'string' }, nonce: { type: 'string' }, signatureValue: { type: 'string' },
			},
			required: ['type', 'created', 'creator', 'signatureValue'],
		},
	},
	required: ['type', 'actor'],
	anyOf: [
		{ required: ['object'] },
		{ properties: { type: { enum: ['Collection', 'OrderedCollection'] } } },
	],
});
