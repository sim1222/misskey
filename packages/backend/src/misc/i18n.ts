export class I18n<T extends Record<string, unknown>> {
	public locale: T;

	constructor(locale: T) {
		this.locale = locale;

		//#region BIND
		this.t = this.t.bind(this);
		//#endregion
	}

	// string にしているのは、ドット区切りでのパス指定を許可するため
	// なるべくこのメソッド使うよりもlocale直接参照の方がvueのキャッシュ効いてパフォーマンスが良いかも
	public t(key: string, args?: Record<string, unknown>): string {
		try {
			let value: unknown = this.locale;
			for (const part of key.split('.')) {
				if (value == null) throw new TypeError('Missing locale path');
				value = Reflect.get(Object(value), part);
			}
			if (typeof value !== 'string') throw new TypeError('Locale path is not a string');
			let str = value;

			if (args) {
				for (const [k, v] of Object.entries(args)) {
					str = str.replace(`{${k}}`, String(v));
				}
			}
			return str;
		} catch (e) {
			console.warn(`missing localization '${key}'`);
			return key;
		}
	}
}
