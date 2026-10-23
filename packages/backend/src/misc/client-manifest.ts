export type ClientManifestEntry = {
	file: string;
	css?: string[];
	imports?: string[];
};

/** Include CSS from static chunks as well as the entry itself (Vite backend integration). */
export function getClientEntry(manifest: Record<string, ClientManifestEntry>, entry = 'src/init.ts'): ClientManifestEntry & { css: string[] } {
	const visited = new Set<string>();
	const css = new Set<string>();
	const visit = (key: string) => {
		if (visited.has(key)) return;
		visited.add(key);
		const chunk = manifest[key];
		if (!chunk) throw new Error(`Missing client manifest entry: ${key}`);
		for (const dependency of chunk.imports ?? []) visit(dependency);
		for (const file of chunk.css ?? []) css.add(file);
	};
	visit(entry);
	return { ...manifest[entry], css: [...css] };
}
