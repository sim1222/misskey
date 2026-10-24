import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const client = resolve(root, 'packages/client');
const require = createRequire(resolve(client, 'package.json'));
const ts = require('typescript');
const config = ts.readConfigFile(resolve(client, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, client);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const source = program.getSourceFile(resolve(client, 'src/store.ts'));
const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(source));
function exported(name) {
 const symbol = exports.find(item => item.name === name);
 assert.ok(symbol, name);
 return checker.getTypeOfSymbolAtLocation(symbol, source);
}
const store = exported('defaultStore');
const hot = checker.getTypeOfPropertyOfType(store, 'state');
const cold = checker.getTypeOfPropertyOfType(exported('ColdDeviceStorage'), 'default');
assert.ok(hot && cold);
const definitions = [], seen = new Map();
function schema(type) {
 if (seen.has(type.id)) return seen.get(type.id);
 const id = definitions.length;
 seen.set(type.id, id); definitions.push(null);
 let shape;
 if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) shape = { kind: 'unknown' };
 else if (type.flags & ts.TypeFlags.Never) shape = { kind: 'never' };
 else if (type.flags & ts.TypeFlags.Undefined) shape = { kind: 'undefined' };
 else if (type.flags & ts.TypeFlags.Null) shape = { kind: 'null' };
 else if (type.isStringLiteral() || type.isNumberLiteral()) shape = { kind: 'literal', value: type.value };
 else if (type.flags & ts.TypeFlags.BooleanLiteral) shape = { kind: 'literal', value: type.intrinsicName === 'true' };
 else if (type.flags & ts.TypeFlags.StringLike) shape = { kind: 'string' };
 else if (type.flags & ts.TypeFlags.NumberLike) shape = { kind: 'number' };
 else if (type.flags & ts.TypeFlags.BooleanLike) shape = { kind: 'boolean' };
 else if (type.isUnion()) shape = { kind: 'union', members: type.types.map(schema) };
 else if (type.isIntersection()) shape = { kind: 'intersection', members: type.types.map(schema) };
 else if (checker.isTupleType(type)) shape = { kind: 'tuple', items: checker.getTypeArguments(type).map(schema) };
 else if (checker.isArrayType(type)) shape = { kind: 'array', item: schema(checker.getTypeArguments(type)[0]) };
 else if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length) shape = { kind: 'function' };
 else {
  const properties = Object.fromEntries(checker.getPropertiesOfType(type).filter(p => !p.name.startsWith('__@')).map(p => [p.name, { optional: !!(p.flags & ts.SymbolFlags.Optional), schema: schema(checker.getTypeOfSymbolAtLocation(p, source)) }]));
  const index = checker.getIndexTypeOfType(type, ts.IndexKind.String);
  shape = { kind: 'object', properties, ...(index ? { index: schema(index) } : {}) };
 }
 definitions[id] = shape;
 return id;
}
const keySource = program.getSourceFile(resolve(client, 'src/scripts/preferences-keys.ts'));
function keys(name) {
 const statement = keySource.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations[0].name.getText(keySource) === name);
 assert.ok(statement);
 let initializer = statement.declarationList.declarations[0].initializer;
 if (ts.isAsExpression(initializer)) initializer = initializer.expression;
 assert.ok(ts.isArrayLiteralExpression(initializer));
 return initializer.elements.map(element => { assert.ok(ts.isStringLiteral(element)); return element.text; });
}
function fields(type, names) {
 return Object.fromEntries(names.map(name => { const member = checker.getTypeOfPropertyOfType(type, name); assert.ok(member, name); return [name, schema(member)]; }));
}
const hotFields = fields(hot, keys('defaultStoreSaveKeys'));
const coldFields = fields(cold, keys('coldDeviceStorageSaveKeys'));
const pluginContract = schema(checker.getDeclaredTypeOfSymbol(exports.find(item => item.name === 'Plugin')));
const output = '// Generated from the actual preference store types. Do not edit by hand.\nimport type { RuntimeShape } from \'./runtime-shape\';\n' +
 'export const preferenceShapes: RuntimeShape[] = ' + JSON.stringify(definitions, null, '\t') + ';\n' +
 'export const pluginShape = ' + pluginContract + ';\n' +
 'export const hotPreferenceShapes = ' + JSON.stringify(hotFields, null, '\t') + ' as const;\n' +
 'export const coldPreferenceShapes = ' + JSON.stringify(coldFields, null, '\t') + ' as const;\n';
const destination = resolve(client, 'src/scripts/preference-shapes.ts');
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output, 'Regenerate preference shapes after changing saved setting types');
else await writeFile(destination, output);
console.log(`Preference contracts: ${Object.keys(hotFields).length} hot, ${Object.keys(coldFields).length} cold settings; ${definitions.length} shapes`);
