// summaly 2.7.0 is CommonJS with exports.default, not module.exports = function.
// Preserve its bundled function signature and model Node's default import.
declare module 'summaly' {
	import type summarize from 'summaly/built/index.js';
	const summaly: { default: typeof summarize };
	export = summaly;
}
