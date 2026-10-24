import assert from 'node:assert/strict';
import { inferResponse } from './infer-api-response.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const baseline = JSON.parse(await readFile(new URL('scripts/regression/baseline.json', root), 'utf8'));
const contracts = baseline['registered API contracts'];
assert.ok(Array.isArray(contracts) && contracts.length > 0);
const reference = { UserLite:'UserLite', UserDetailedNotMeOnly:'UserDetailed', MeDetailedOnly:'MeDetailed', UserDetailedNotMe:'UserDetailed', MeDetailed:'MeDetailed', UserDetailed:'UserDetailed', User:'User', Note:'Note', NoteReaction:'NoteReaction', NoteFavorite:'NoteFavorite', Notification:'Notification', DriveFile:'DriveFile', DriveFolder:'DriveFolder', UserList:'UserList', UserGroup:'UserGroup', App:'App', MessagingMessage:'MessagingMessage', Following:'Following', Muting:'Muting', Blocking:'Blocking', Hashtag:'Hashtag', Page:'Page', Channel:'Channel', QueueCount:'QueueCount', Antenna:'Antenna', Clip:'Clip', FederationInstance:'Instance', GalleryPost:'GalleryPost', Emoji:'CustomEmoji' };
function mergeSchema(base, override) {
 const merged = { ...base, ...override };
 if (base.properties && override.properties) merged.properties = Object.fromEntries(Object.keys({ ...base.properties, ...override.properties }).map(key => [key, base.properties[key] && override.properties[key] ? mergeSchema(base.properties[key], override.properties[key]) : override.properties[key] ?? base.properties[key]]));
 if (base.required || override.required) merged.required = [...new Set([...(base.required ?? []), ...(override.required ?? [])])];
 return merged;
}
function type(s, response=false) {
 if(!s) return 'unknown';
 if(s.ref) { assert.ok(reference[s.ref],s.ref); return `entities.${reference[s.ref]}${s.nullable?' | null':''}`; }
 let t;
 if(s.enum) t=s.enum.map(v=>JSON.stringify(v)).join(' | ');
 else if(s.oneOf || s.anyOf) t=(s.oneOf||s.anyOf).map(v=>'('+type(mergeSchema({...s,oneOf:undefined,anyOf:undefined},v),response)+')').join(' | ');
 else if(s.allOf) t=s.allOf.map(v=>'('+type(v,response)+')').join(' & ');
 else if(Array.isArray(s.type)) t=s.type.map(v=>type({...s,type:v},response)).join(' | ');
 else switch(s.type) {
  case 'string': t='string';break;
  case 'integer': case 'number': t='number';break;
  case 'boolean': t='boolean';break;
  case 'null': t='null';break;
  case 'array': t=`(${type(s.items,response)})[]`;break;
  case 'object':
   if(s.properties) t='{ '+Object.entries(s.properties).map(([k,v])=>`${JSON.stringify(k)}${response ? v.optional ? '?' : '' : s.required?.includes(k)?'':'?'}: ${type(v,response)};`).join(' ')+' }';
   else t='Record<string, unknown>';
   break;
  default: t='unknown';
 }
 return s.nullable?`(${t}) | null`:t;
}
function responseType(ep) {
 if (ep.name === 'admin/accounts/create') return 'entities.MeDetailed & { token: string }';
 if (ep.name === 'users/reactions') return '(entities.NoteReaction & { note: entities.Note })[]';
 const schema = ep.meta.res;
 if (!schema || ['admin/meta', 'admin/server-info'].includes(ep.name) || ep.name.startsWith('charts/') || schema.type === 'object' && !schema.properties && !schema.ref) {
  return inferResponse(ep.name, reference, schema?.type === 'object');
 }
 return type(schema, true);
}
const entries=contracts.map(ep=>`\t${JSON.stringify(ep.name)}: { req: ${type(ep.params)}; res: ${responseType(ep)} };`).join('\n');
const routes = `\n\t'signup-pending': { req: { code: string }; res: SigninResult };\n\t'signin': { req: SigninRequest; res: SigninResult | WebAuthnChallenge };\n\t'signup': { req: { username: string; password: string; invitationCode?: string | null; emailAddress?: string | null; 'hcaptcha-response'?: string | null; 'g-recaptcha-response'?: string | null }; res: (entities.MeDetailed & { token: string }) | void };`;
const out=`// Generated from the committed, runtime-observed v12 API contracts.\n// Regenerate with node scripts/frontend/generate-api-types.mjs.\nimport type * as entities from './entities';\nimport type { SigninRequest, SigninResult, WebAuthnChallenge } from './auth';\n\nexport type Endpoints = {\n${entries}${routes}\n};\n`;
const destination=new URL('packages/shared/api-contracts.ts',root);
if(process.argv.includes('--check')) assert.equal(await readFile(destination,'utf8'),out,'Regenerate frontend API contracts after an intentional server contract change');
else await writeFile(destination,out);
