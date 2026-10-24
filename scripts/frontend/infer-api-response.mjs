import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(root, 'packages/backend/package.json'));
const ts = require('typescript');
const configPath = resolve(root, 'packages/backend/tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve(root, 'packages/backend'));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

export function inferResponse(name, refs, numericStatus = false) {
 const file = program.getSourceFile(resolve(root, 'packages/backend/src/server/api/endpoints', name + '.ts'));
 if (!file) return 'unknown';
 let handler;
 function walk(node) {
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.SuperKeyword && node.arguments.length >= 3) handler = node.arguments[2];
  ts.forEachChild(node, walk);
 }
 walk(file);
 if (!handler) return 'unknown';
 const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(handler), ts.SignatureKind.Call)[0];
 if (!signature) return 'unknown';
 let result = checker.getReturnTypeOfSignature(signature);
 result = checker.getPromisedTypeOfPromise(result) ?? result;
 function wire(type, seen = new Set(), depth = 0, isStatus = numericStatus) {
  const alias = type.aliasSymbol?.name;
  if (alias === 'Packed' && type.aliasTypeArguments?.[0]?.isStringLiteral()) {
   const ref = refs[type.aliasTypeArguments[0].value];
   if (ref) return `entities.${ref}`;
  }
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return 'unknown';
  if (type.flags & ts.TypeFlags.Never) return 'never';
  if (type.flags & ts.TypeFlags.Void) return 'void';
  if (type.flags & ts.TypeFlags.Undefined) return 'undefined';
  if (type.flags & ts.TypeFlags.Null) return 'null';
  if (type.isStringLiteral()) return JSON.stringify(type.value);
  if (type.flags & ts.TypeFlags.StringLike) return 'string';
  if (type.flags & ts.TypeFlags.NumberLike) return isStatus ? 'void' : 'number';
  if (type.flags & ts.TypeFlags.BooleanLike) return 'boolean';
  if (type.symbol?.name === 'Date') return 'string';
  if (seen.has(type.id) || depth > 8) return 'unknown';
  seen = new Set([...seen, type.id]);
  if (type.isUnion() || type.isIntersection()) return [...new Set(type.types.map(t => `(${wire(t, seen, depth + 1, isStatus)})`))].join(type.isUnion() ? ' | ' : ' & ');
  if (checker.isArrayType(type)) return `(${wire(checker.getTypeArguments(type)[0], seen, depth + 1, false)})[]`;
  if (checker.isTupleType(type)) return `[${checker.getTypeArguments(type).map(t => wire(t, seen, depth + 1, false)).join(', ')}]`;
  const properties = checker.getPropertiesOfType(type).filter(p => {
   const value = checker.getTypeOfSymbolAtLocation(p, handler);
   return checker.getSignaturesOfType(value, ts.SignatureKind.Call).length === 0 && !p.name.startsWith('__@');
  });
  if (properties.length) return '{ ' + properties.map(p => `${JSON.stringify(p.name)}${p.flags & ts.SymbolFlags.Optional ? '?' : ''}: ${wire(checker.getTypeOfSymbolAtLocation(p, handler), seen, depth + 1, false)};`).join(' ') + ' }';
  const index = checker.getIndexTypeOfType(type, ts.IndexKind.String);
  return index ? `Record<string, ${wire(index, seen, depth + 1, false)}>` : 'Record<string, unknown>';
 }
 return wire(result);
}
