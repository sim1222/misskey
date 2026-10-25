export function isHttpUrl(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export function safePreviewPlayer(value: unknown): { url: string | null; width: number | null; height: number | null } {
	if (value === null || typeof value !== 'object') return { url: null, width: null, height: null };
	const url = 'url' in value ? value.url : null;
	const width = 'width' in value ? value.width : null;
	const height = 'height' in value ? value.height : null;
	return {
		url: isHttpUrl(url) ? url : null,
		width: typeof width === 'number' && Number.isFinite(width) ? width : null,
		height: typeof height === 'number' && Number.isFinite(height) ? height : null,
	};
}
