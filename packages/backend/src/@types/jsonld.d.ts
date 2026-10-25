import 'jsonld';
import type { JsonLdDocument, NodeObject, Options } from 'jsonld';

// @types/jsonld 1.5 omits the context URL/list forms accepted by JSON-LD 1.1
// and the installed jsonld 8 processor. Preserve the actual input/output types.
declare module 'jsonld' {
	export namespace Options {
		interface Normalize { maxDeepIterations?: number; }
	}
	export function compact(input: JsonLdDocument, context: Exclude<NodeObject['@context'], undefined>, options?: Options.Compact): Promise<NodeObject>;
}
