import { isHttpUrl, safePreviewPlayer } from '../../../client/src/scripts/preview-security.js';

describe('Preview player URL validation (GHSA-vc39-c453-67g3)', () => {
	it.each(['javascript:alert(1)', ' JaVa\nScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'ftp://example.com/player', '//example.com/player', '/player', '', null, 1])('rejects an unsafe player %s', url => {
		expect(isHttpUrl(url)).toBe(false);
		expect(safePreviewPlayer({ url, width: 640, height: 360 })).toEqual({ url: null, width: 640, height: 360 });
	});
	it.each(['http://example.com/player?keep=1#fragment', 'https://example.com/embed', 'HTTPS://example.com/embed'])('preserves a valid HTTP(S) player %s byte for byte', url => {
		expect(isHttpUrl(url)).toBe(true);
		expect(safePreviewPlayer({ url, width: 0, height: 360 })).toEqual({ url, width: 0, height: 360 });
	});
	it('handles missing metadata and rejects non-numeric dimensions', () => {
		expect(safePreviewPlayer(undefined)).toEqual({ url: null, width: null, height: null });
		expect(safePreviewPlayer({ url: 'https://example.com/player', width: '100%', height: Infinity })).toEqual({ url: 'https://example.com/player', width: null, height: null });
	});
});
