import { isFormResult, isFormItemValue, isRecord, type Form, type GetFormResultType } from '../scripts/form.ts';

export function widgetPropsWithDefaults<F extends Form>(definition: F, data: unknown): GetFormResultType<F> {
 const source = isRecord(data) ? data : {};
 const values: Record<string, unknown> = { ...source };
 for (const [key, item] of Object.entries(definition)) {
  if (values[key] === undefined || !isFormItemValue(item, values[key])) values[key] = item.default ?? null;
 }
 if (!isFormResult(definition, values)) throw new TypeError('Invalid widget defaults');
 return values;
}
