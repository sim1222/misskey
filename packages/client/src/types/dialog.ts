export type DialogResult<T> = { canceled: true; result?: undefined } | { canceled: false; result: T };

export function parseDialogResult<T>(result: DialogResult<unknown> | undefined, valid: (value: unknown) => value is T): DialogResult<T> {
 if (result == null || result.canceled) return { canceled: true };
 if (!valid(result.result)) throw new TypeError('Dialog returned a value incompatible with its input');
 return { canceled: false, result: result.result };
}

export function isTextInput(value: unknown): value is string | null {
 return value === null || typeof value === 'string';
}
export function isNumberInput(value: unknown): value is number | null {
 return value === null || typeof value === 'number';
}
export function isDateInput(value: unknown): value is string | number | Date | null {
 return isTextInput(value) || typeof value === 'number' || value instanceof Date;
}
