import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('packages/backend/package.json', root));
const ts = require('typescript');
const cache = new Map();
async function moduleUrl(url) {
 if (cache.has(url.href)) return cache.get(url.href);
 const source = await readFile(url, 'utf8');
 let output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
 const imports = [...output.matchAll(/from ['"]([^'"]+)['"]/g)];
 for (const match of imports) {
  const path = match[1];
  const target = path.startsWith('@/') ? new URL('packages/backend/src/' + path.slice(2).replace(/\.js$/, '.ts'), root) : new URL(path.replace(/\.js$/, '.ts'), url);
  if (!fileURLToPath(target).startsWith(fileURLToPath(new URL('packages/backend/src/', root)))) throw new Error('Schema import outside backend sources: ' + path);
  output = output.replace(match[0], 'from ' + JSON.stringify(await moduleUrl(target)));
 }
 const result = 'data:text/javascript;base64,' + Buffer.from(output).toString('base64');
 cache.set(url.href, result);
 return result;
}
export const { refs } = await import(await moduleUrl(new URL('packages/backend/src/misc/schema.ts', root)));

export function schemaType(schema, reference, response = true) {
 if (!schema) return 'unknown';
 if (schema.ref) return reference(schema.ref) + (schema.nullable ? ' | null' : '');
 let result;
 if (schema.enum) result = schema.enum.map(value => JSON.stringify(value)).join(' | ');
 else if (schema.oneOf || schema.anyOf) result = (schema.oneOf || schema.anyOf).map(value => '(' + schemaType({ ...schema, oneOf: undefined, anyOf: undefined, ...value }, reference, response) + ')').join(' | ');
 else if (schema.allOf) result = schema.allOf.map(value => '(' + schemaType(value, reference, response) + ')').join(' & ');
 else if (Array.isArray(schema.type)) result = schema.type.map(type => schemaType({ ...schema, type }, reference, response)).join(' | ');
 else switch (schema.type) {
  case 'string': result = 'string'; break;
  case 'integer': case 'number': result = 'number'; break;
  case 'boolean': result = 'boolean'; break;
  case 'null': result = 'null'; break;
  case 'array': result = '(' + schemaType(schema.items, reference, response) + ')[]'; break;
  case 'object': result = schema.properties ? '{ ' + Object.entries(schema.properties).map(([key, value]) => JSON.stringify(key) + (response ? value.optional ? '?' : '' : schema.required?.includes(key) ? '' : '?') + ': ' + schemaType(value, reference, response) + ';').join(' ') + ' }' : 'Record<string, unknown>'; break;
  default: result = 'unknown';
 }
 return schema.nullable && !result.includes(' | null') ? '(' + result + ') | null' : result;
}
