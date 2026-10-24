import { defaultLocale, type Locale } from './locale.ts';
type LocaleTree = { [key: string]: string | LocaleTree };
function record(value: unknown): Record<string, unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}
function merge(defaults: LocaleTree, cached: unknown): Record<string, unknown> {
 const source = record(cached);
 return Object.fromEntries([
  ...Object.entries(source),
  ...Object.entries(defaults).map(([key, fallback]) => [key,
   typeof fallback === 'string' ? typeof source[key] === 'string' ? source[key] : fallback : merge(fallback, source[key]),
  ]),
 ]);
}
function matches(value: unknown, defaults: LocaleTree): boolean {
 const source = record(value);
 return Object.entries(defaults).every(([key, fallback]) => Object.hasOwn(source, key) &&
  (typeof fallback === 'string' ? typeof source[key] === 'string' : matches(source[key], fallback)));
}
export function isLocale(value: unknown): value is Locale { return matches(value, defaultLocale); }
export function readLocale(serialized: string | null): Locale {
 let cached: unknown;
 try { cached = serialized === null ? null : JSON.parse(serialized); } catch { cached = null; }
 const merged = merge(defaultLocale, cached);
 if (!isLocale(merged)) throw new Error('Invalid canonical locale');
 return merged;
}
