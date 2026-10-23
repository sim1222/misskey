import type { Schema } from '@/misc/schema.js';
import { refs } from '@/misc/schema.js';

type OpenApiSchema = Omit<Schema, 'type' | 'properties' | 'items' | 'anyOf' | 'oneOf' | 'allOf' | 'ref' | 'optional'> & {
	type?: Exclude<Schema['type'], 'any'>;
	properties?: Record<string, OpenApiSchema>;
	items?: OpenApiSchema;
	anyOf?: OpenApiSchema[];
	oneOf?: OpenApiSchema[];
	allOf?: OpenApiSchema[];
	$ref?: string;
};

export function convertSchemaToOpenApiSchema(schema: Schema): OpenApiSchema {
	const { type, properties, items, anyOf, oneOf, allOf, ref, optional, ...rest } = schema;
	return {
		...rest,
		...(type && type !== 'any' ? { type } : {}),
		...(properties ? {
			properties: Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, convertSchemaToOpenApiSchema(value)] as const)),
			required: schema.required ?? Object.entries(properties).filter(([, value]) => value.optional === false).map(([key]) => key),
		} : {}),
		...(items ? { items: convertSchemaToOpenApiSchema(items) } : {}),
		...(anyOf ? { anyOf: anyOf.map(convertSchemaToOpenApiSchema) } : {}),
		...(oneOf ? { oneOf: oneOf.map(convertSchemaToOpenApiSchema) } : {}),
		...(allOf ? { allOf: allOf.map(convertSchemaToOpenApiSchema) } : {}),
		...(ref ? { $ref: `#/components/schemas/${ref}` } : {}),
	};
}

export const schemas = {
	Error: {
		type: 'object',
		properties: {
			error: {
				type: 'object',
				description: 'An error object.',
				properties: {
					code: {
						type: 'string',
						description: 'An error code. Unique within the endpoint.',
					},
					message: {
						type: 'string',
						description: 'An error message.',
					},
					id: {
						type: 'string',
						format: 'uuid',
						description: 'An error ID. This ID is static.',
					},
				},
				required: ['code', 'id', 'message'],
			},
		},
		required: ['error'],
	},

	...Object.fromEntries(
		Object.entries(refs).map(([key, schema]) => [key, convertSchemaToOpenApiSchema(schema)] as const),
	),
};
