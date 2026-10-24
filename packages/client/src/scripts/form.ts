type CommonFormItem = {
	label?: string;
	description?: string;
	required?: boolean;
	hidden?: boolean;
};

type Choice = { label: string; value: unknown };
export type FormItem = CommonFormItem & ({
	type: 'string'; default?: string | null; multiline?: boolean;
} | {
	type: 'number'; default?: number | null; step?: number;
} | {
	type: 'boolean'; default?: boolean | null;
} | {
	type: 'enum'; default: unknown; enum: Choice[];
} | {
	type: 'radio'; default: unknown; options: Choice[];
} | {
	type: 'range'; default: number; min: number; max: number; step?: number;
	textConverter?: (value: number) => string;
} | {
	type: 'button'; default?: null; content?: string;
	action: (event: MouseEvent, values: Record<string, unknown>) => void;
} | {
	type: 'object'; default: Record<string, unknown> | null; hidden: true; validate?: (value: unknown) => value is Record<string, unknown>;
} | {
	type: 'array'; default: unknown[] | null; hidden: true; validate?: (value: unknown) => value is unknown[];
});

export type Form = Record<string, FormItem>;
type NullDefault<Item extends FormItem> = Item extends { default: infer D } ? null extends D ? null : never : null;
export type GetItemType<Item extends FormItem> =
 Item extends { type: 'string' } ? string | NullDefault<Item> :
 Item extends { type: 'number' } ? number | NullDefault<Item> :
 Item extends { type: 'boolean' } ? boolean | NullDefault<Item> :
 Item extends { enum: (infer C)[] } | { options: (infer C)[] } ? C extends Choice ? C['value'] : never :
 Item extends { type: 'range' } ? number :
 Item extends { validate: (value: unknown) => value is infer V } ? V | NullDefault<Item> :
 Item extends { type: 'array' } ? unknown[] | NullDefault<Item> :
 Item extends { type: 'object' } ? Record<string, unknown> | NullDefault<Item> : null;

export type GetFormResultType<F extends Form> = { [P in keyof F]: GetItemType<F[P]> };
export type FormDialogResult<T> = { canceled: true; result?: undefined } | { canceled?: false; result: T };

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isFormItemValue(item: FormItem, value: unknown): boolean {
 switch (item.type) {
  case 'string': return (value === null && item.default == null) || typeof value === 'string';
  case 'number': return (value === null && item.default == null) || typeof value === 'number';
  case 'boolean': return (value === null && item.default == null) || typeof value === 'boolean';
  case 'range': return typeof value === 'number';
  case 'enum': return item.enum.some(choice => sameFormValue(choice.value, value));
  case 'radio': return item.options.some(choice => sameFormValue(choice.value, value));
  case 'button': return value === null;
  case 'object': return (value === null && item.default === null) || (isRecord(value) && (!item.validate || item.validate(value)));
  case 'array': return (value === null && item.default === null) || (Array.isArray(value) && (!item.validate || item.validate(value)));
 }
}
export function isFormResult<F extends Form>(form: F, values: Record<string, unknown>): values is GetFormResultType<F> {
 return Object.entries(form).every(([key, item]) => Object.hasOwn(values, key) && isFormItemValue(item, values[key]));
}
function sameFormValue(left: unknown, right: unknown): boolean {
 if (Object.is(left, right)) return true;
 if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value: unknown, index) => sameFormValue(value, right[index]));
 if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
 if (isRecord(left) && isRecord(right)) return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => Object.hasOwn(right, key) && sameFormValue(left[key], right[key]));
 return false;
}
