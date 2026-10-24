import { reactive } from 'vue';

/** Page responses are JSON DTOs. Keep array and object mutations reactive. */
export function reactiveItems<T extends { id: string }>(items: readonly T[]): T[] {
 const result: T[] = reactive([]);
 result.push(...items);
 return result;
}
