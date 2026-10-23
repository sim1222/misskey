import 'mfm-js';

declare module 'mfm-js' {
	// extract recursively returns exactly the nodes accepted by its predicate.
	export function extract<T extends MfmNode>(nodes: MfmNode[], predicate: (node: MfmNode) => node is T): T[];
}
