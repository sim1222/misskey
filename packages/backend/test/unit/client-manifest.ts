import { fileURLToPath } from 'node:url';
import pug from 'pug';
import { getClientEntry } from '@/misc/client-manifest.js';

describe('Vite manifest backend integration', () => {
	it('includes static shared-chunk CSS before entry CSS, with deduplication', () => {
		const entry = getClientEntry({
			'src/init.ts': { file: 'app.js', imports: ['shared'], css: ['shared.css', 'app.css'] },
			shared: { file: 'shared.js', imports: ['nested'], css: ['shared.css'] },
			nested: { file: 'nested.js', css: ['nested.css'] },
		});
		expect(entry.file).toBe('app.js');
		expect(entry.css).toEqual(['nested.css', 'shared.css', 'app.css']);
	});

	it('handles import cycles and manifests without CSS', () => {
		expect(getClientEntry({
			'src/init.ts': { file: 'app.js', imports: ['shared'] },
			shared: { file: 'shared.js', imports: ['src/init.ts'] },
		}).css).toEqual([]);
	});

	it('reports missing imported chunks instead of silently rendering without styles', () => {
		expect(() => getClientEntry({ 'src/init.ts': { file: 'app.js', imports: ['missing'] } })).toThrow('Missing client manifest entry');
	});

	it('actually applies CSS in server-rendered HTML, beyond preloading it', () => {
		const html = pug.renderFile(fileURLToPath(new URL('../../src/server/web/views/base.pug', import.meta.url)), {
			getClientEntry: () => ({ file: 'app.js', css: ['shared.css', 'app.css'] }),
			version: 'fixture',
		});
		expect(html).toContain('<link rel="stylesheet" href="/assets/shared.css">');
		expect(html).toContain('<link rel="stylesheet" href="/assets/app.css">');
	});
});
