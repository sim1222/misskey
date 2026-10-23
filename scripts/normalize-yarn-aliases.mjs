import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Yarn Classic sometimes serializes npm aliases and normal selectors as one entry
// with the alias's synthetic name. That can hoist an ESM major into CJS consumers.
// Separate only that metadata; keep version, resolved URL and integrity verbatim.
export function normalizeYarnAliases(source) {
	return source.split('\n\n').flatMap(block => {
		const [header, ...body] = block.split('\n');
		if (!header?.endsWith(':') || !body.some(line => line.startsWith('  name '))) return [block];
		const keys = header.slice(0, -1).match(/"[^"]+"|[^,]+/g).map(key => key.trim());
		const aliases = keys.filter(key => key.includes('@npm:'));
		const normal = keys.filter(key => !key.includes('@npm:'));
		if (!aliases.length || !normal.length) return [block];
		const names = new Set(aliases.map(key => key.replace(/^"/, '').split('@npm:')[0]));
		if (names.size !== 1) throw new Error(`Ambiguous npm alias names in ${header}`);
		return [
			`${normal.join(', ')}:\n${body.filter(line => !line.startsWith('  name ')).join('\n').replace(/\n+$/, '')}`,
			`${aliases.join(', ')}:\n${body.join('\n')}`,
		];
	}).join('\n\n');
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
	const root = fileURLToPath(new URL('../', import.meta.url));
	for (const file of ['yarn.lock', 'packages/backend/yarn.lock', 'packages/client/yarn.lock', 'packages/sw/yarn.lock']) {
		const path = resolve(root, file);
		const source = readFileSync(path, 'utf8');
		const normalized = normalizeYarnAliases(source);
		if (source === normalized) continue;
		if (process.argv.includes('--check')) throw new Error(`${file}: run node scripts/normalize-yarn-aliases.mjs after updating dependencies`);
		writeFileSync(path, normalized);
		console.log(`Normalized alias metadata in ${file}`);
	}
}
