import sanitizeHtml from 'sanitize-html';
import { fileTypeFromFile } from 'file-type';
import { fileURLToPath } from 'node:url';
import { v4, validate, version } from 'uuid';

describe('Updated content-processing dependencies', () => {
	it('retains formatted report text while removing active HTML', () => {
		const text = sanitizeHtml('<p>Report <strong>details</strong><script>alert(1)</script><a href="javascript:alert(1)">link</a></p>');
		expect(text).toContain('<strong>details</strong>');
		expect(text).not.toContain('<script');
		expect(text).not.toContain('javascript:');
	});
	it('detects the existing drive JPEG fixture', async () => {
		expect(await fileTypeFromFile(fileURLToPath(new URL('../resources/Lenna.jpg', import.meta.url)))).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
	});
	it('keeps generated session and activity identifiers as UUID v4', () => {
		const id = v4();
		expect(validate(id)).toBe(true);
		expect(version(id)).toBe(4);
	});
});
