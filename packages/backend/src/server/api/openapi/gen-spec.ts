import type { Config } from '@/config.js';
import endpoints, { type IEndpoint } from '../endpoints.js';
import { errors as basicErrors } from './errors.js';
import { schemas, convertSchemaToOpenApiSchema } from './schemas.js';

export function genOpenapiSpec(config: Config) {
	const spec = {
		openapi: '3.0.0',

		info: {
			version: config.version,
			title: 'Misskey API',
			'x-logo': { url: '/static-assets/api-doc.png' },
		},

		externalDocs: {
			description: 'Repository',
			url: 'https://github.com/misskey-dev/misskey',
		},

		servers: [{
			url: config.apiUrl,
		}],

		paths: Object.fromEntries(endpoints.filter(ep => !ep.meta.secure).map(endpoint => ['/' + endpoint.name, { post: buildOperation(endpoint) }] as const)),

		components: {
			schemas: schemas,

		},
	};

	return spec;
}

function buildOperation(endpoint: IEndpoint) {
		const errors = Object.fromEntries(Object.values(endpoint.meta.errors ?? {}).map(error => [error.code, { value: { error } }] as const));

		const resSchema = endpoint.meta.res ? convertSchemaToOpenApiSchema(endpoint.meta.res) : {};

		let desc = (endpoint.meta.description ? endpoint.meta.description : 'No description provided.') + '\n\n';
		desc += `**Credential required**: *${endpoint.meta.requireCredential ? 'Yes' : 'No'}*`;
		if (endpoint.meta.kind) {
			const kind = endpoint.meta.kind;
			desc += ` / **Permission**: *${kind}*`;
		}

		const requestType = endpoint.meta.requireFile ? 'multipart/form-data' : 'application/json';
		let schema = convertSchemaToOpenApiSchema(endpoint.params);
		schema = {
			...schema,
			properties: { ...schema.properties, i: { type: 'string', description: 'API access token (passed in the request body).' } },
			required: endpoint.meta.requireCredential ? [...schema.required ?? [], 'i'] : schema.required,
		};

		if (endpoint.meta.requireFile) {
			schema = { ...schema, properties: {
				...schema.properties,
				file: {
					type: 'string',
					format: 'binary',
					description: 'The file contents.',
				},
			} };
			schema = { ...schema, required: [...schema.required ?? [], 'file'] };
		}

		const info = {
			operationId: endpoint.name,
			summary: endpoint.name,
			description: desc,
			externalDocs: {
				description: 'Source code',
				url: `https://github.com/misskey-dev/misskey/blob/develop/packages/backend/src/server/api/endpoints/${endpoint.name}.ts`,
			},
			...(endpoint.meta.tags ? {
				tags: [endpoint.meta.tags[0]],
			} : {}),
			requestBody: {
				required: true,
				content: {
					[requestType]: {
						schema,
					},
				},
			},
			responses: {
				...(endpoint.meta.res ? {
					'200': {
						description: 'OK (with results)',
						content: {
							'application/json': {
								schema: resSchema,
							},
						},
					},
				} : {
					'204': {
						description: 'OK (without any results)',
					},
				}),
				'400': {
					description: 'Client error',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Error',
							},
							examples: { ...errors, ...basicErrors['400'] },
						},
					},
				},
				'401': {
					description: 'Authentication error',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Error',
							},
							examples: basicErrors['401'],
						},
					},
				},
				'403': {
					description: 'Forbidden error',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Error',
							},
							examples: basicErrors['403'],
						},
					},
				},
				'418': {
					description: 'I\'m Ai',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Error',
							},
							examples: basicErrors['418'],
						},
					},
				},
				...(endpoint.meta.limit ? {
					'429': {
						description: 'To many requests',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Error',
								},
								examples: basicErrors['429'],
							},
						},
					},
				} : {}),
				'500': {
					description: 'Internal server error',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Error',
							},
							examples: basicErrors['500'],
						},
					},
				},
			},
		};

		return info;
}
