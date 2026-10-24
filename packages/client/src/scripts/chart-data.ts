/** Some v12 charts never recorded a total. Absence must not become a zero. */
export function optionalNumberSeries(value: unknown): number[] {
 return Array.isArray(value) && value.every((item: unknown) => typeof item === 'number') ? value : [];
}
