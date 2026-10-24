declare module 'insert-text-at-cursor' {
 export default function insertTextAtCursor(input: HTMLTextAreaElement | HTMLInputElement, text: string): void;
}
declare module 'syuilo-password-strength' {
 export default function passwordStrength(password: string): number;
}

interface Window { __misskey_input_ref__?: HTMLInputElement | null }

interface Window {
 TagCanvas?: {
  Start(canvas: string, tags: string, options: { textColour: string; outlineColour: string; outlineRadius: number; initial: [number, number]; frontSelect: boolean; imageRadius: number; dragThreshold: number; wheelZoom: boolean; reverse: boolean; depth: number; maxSpeed: number; minSpeed: number; stretchX: number; stretchY: number }): void;
  Delete(canvas: string): void;
  Update(canvas: string): void;
 };
}

declare module 'prismjs/components/prism-core' { export { highlight, languages } from 'prismjs'; }
declare module 's-age' { export default function age(date: string | number | Date): number; }
