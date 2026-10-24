export function requireValue<T>(value: T | null | undefined, name: string): T {
 if (value == null) throw new Error(`${name} is not available`);
 return value;
}
