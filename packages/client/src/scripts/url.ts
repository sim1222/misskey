export function query(obj: Record<string, any>): string {
	const params = Object.entries(obj)
		.filter(([, v]) => Array.isArray(v) ? v.length : v !== undefined)
		.reduce((a, [k, v]) => (a[k] = v, a), {} as Record<string, any>);

	return Object.entries(params)
		.map((p) => `${p[0]}=${encodeURIComponent(p[1])}`)
		.join('&');
}

export function appendQuery(url: string, query: string): string {
	return `${url}${/\?/.test(url) ? url.endsWith('?') ? '' : '&' : '?'}${query}`;
}

export function createMiAuthCallbackUrl(callback: string, session: string): string {
	const url = new URL(callback);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Invalid MiAuth callback URL');
	}
	url.searchParams.set('session', session);
	return url.href;
}
