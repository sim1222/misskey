import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ImageProcessingService } from '@/core/ImageProcessingService.js';

describe('Image conversion with the updated sharp/libvips', () => {
	const service = new ImageProcessingService({} as any);
	const path = fileURLToPath(new URL('../resources/Lenna.jpg', import.meta.url));

	it.each([
		['convertToJpeg', 'jpeg', 'image/jpeg'],
		['convertToWebp', 'webp', 'image/webp'],
		['convertToPng', 'png', 'image/png'],
	] as const)('%s preserves the drive thumbnail format and size bounds', async (method, format, mime) => {
		const image = await service[method](path, 120, 80);
		const metadata = await sharp(image.data).metadata();
		expect(image.type).toBe(mime);
		expect(metadata.format).toBe(format);
		expect(metadata.width).toBe(80);
		expect(metadata.height).toBe(80);
	});

	it('does not enlarge existing attachments', async () => {
		const image = await service.convertToJpeg(path, 1024, 1024);
		const metadata = await sharp(image.data).metadata();
		expect(metadata.width).toBe(512);
		expect(metadata.height).toBe(512);
	});
});
