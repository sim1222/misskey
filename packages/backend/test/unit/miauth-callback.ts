import { createMiAuthCallbackUrl } from '../../../client/src/scripts/url.js';

describe('MiAuth callback (GHSA-cc6r-chgr-8r5m)', () => {
	it.each([
		'javascript:alert(document.cookie)',
		'JaVaScRiPt:alert(1)',
		' \tjava\nscript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'file:///etc/passwd',
		'//example.com/callback',
		'/callback',
	])('rejects unsafe or ambiguous callback %s', callback => {
		expect(() => createMiAuthCallbackUrl(callback, 'test-session')).toThrow();
	});

	it.each(['https:', 'http:'])('preserves a valid %s callback and replaces its session parameter', protocol => {
		const url = new URL(createMiAuthCallbackUrl(`${protocol}//example.com/callback?keep=value&session=old#fragment`, 'a&b'));
		expect(url.protocol).toBe(protocol);
		expect(url.hostname).toBe('example.com');
		expect(url.pathname).toBe('/callback');
		expect(url.searchParams.get('keep')).toBe('value');
		expect(url.searchParams.getAll('session')).toEqual(['a&b']);
		expect(url.hash).toBe('#fragment');
	});
});
