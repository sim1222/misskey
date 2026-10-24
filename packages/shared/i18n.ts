export class I18n<T extends object> {
 public ts: T;
 constructor(locale: T) { this.ts = locale; this.t = this.t.bind(this); }
 public t(key: string, args?: Record<string, string | number>): string {
  try {
   let value: unknown = this.ts;
   for (const part of key.split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) throw new Error('Missing translation');
    value = Reflect.get(value, part);
   }
   if (typeof value !== 'string') throw new Error('Translation is not text');
   let text = value;
   for (const [name, replacement] of Object.entries(args ?? {})) text = text.replace(`{${name}}`, replacement.toString());
   return text;
  } catch {
   console.warn(`missing localization '${key}'`);
   return key;
  }
 }
}
