export type RuntimeShape =
 | { kind: 'unknown' | 'never' | 'undefined' | 'null' | 'string' | 'number' | 'boolean' | 'function' }
 | { kind: 'literal'; value: string | number | boolean }
 | { kind: 'union' | 'intersection'; members: number[] }
 | { kind: 'array'; item: number }
 | { kind: 'tuple'; items: number[] }
 | { kind: 'object'; properties: Record<string, { optional: boolean; schema: number }>; index?: number };

export function matchesRuntimeShape(value: unknown, id: number, shapes: readonly RuntimeShape[]): boolean {
 const shape = shapes[id];
 if (!shape) throw new Error('Unknown runtime contract');
 switch (shape.kind) {
  case 'unknown': return true;
  case 'never': return false;
  case 'undefined': return value === undefined;
  case 'null': return value === null;
  case 'string': return typeof value === 'string';
  case 'number': return typeof value === 'number';
  case 'boolean': return typeof value === 'boolean';
  case 'function': return typeof value === 'function';
  case 'literal': return value === shape.value;
  case 'union': return shape.members.some(member => matchesRuntimeShape(value, member, shapes));
  case 'intersection': return shape.members.every(member => matchesRuntimeShape(value, member, shapes));
  case 'array': return Array.isArray(value) && value.every((item: unknown) => matchesRuntimeShape(item, shape.item, shapes));
  case 'tuple': return Array.isArray(value) && value.length === shape.items.length && shape.items.every((item, index) => matchesRuntimeShape(value[index], item, shapes));
  case 'object': {
   if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
   const entries = Object.fromEntries(Object.entries(value));
   return Object.entries(shape.properties).every(([key, member]) =>
    !Object.hasOwn(entries, key) ? member.optional : matchesRuntimeShape(entries[key], member.schema, shapes)) &&
    (shape.index === undefined || Object.values(entries).every(item => matchesRuntimeShape(item, shape.index ?? -1, shapes)));
  }
 }
}
