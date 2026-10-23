// pureimage 0.3.14 accepts CanvasGradient in the fillStyle setter, but its
// bundled declaration incorrectly declares both getter and setter as string.
declare module 'pureimage' {
	import type { Context } from 'pureimage/types/context.js';
	import type { Bitmap } from 'pureimage/types/bitmap.js';
	import type { CanvasGradient } from 'pureimage/types/gradients.js';
	import type { Stream } from 'node:stream';

	type DrawingContext = Omit<Context, 'fillStyle'> & {
		get fillStyle(): string;
		set fillStyle(value: string | CanvasGradient);
	};
	type DrawingBitmap = Omit<Bitmap, 'getContext'> & {
		getContext(type: '2d'): DrawingContext;
	};
	export function make(width: number, height: number, options?: undefined): DrawingBitmap;
	export function encodePNGToStream(bitmap: DrawingBitmap, stream: Stream): Promise<void>;
}
