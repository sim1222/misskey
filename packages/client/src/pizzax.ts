// PIZZAX --- A lightweight store

import { onUnmounted, Ref, ref, shallowRef, watch, type WritableComputedOptions, type UnwrapRef } from 'vue';
import { $i } from './account';
import { api } from './os';
import { stream } from './stream';

type StateDef = Record<string, {
	where: 'account' | 'device' | 'deviceAccount';
	default: unknown;
}>;

type State<T extends StateDef> = { [K in keyof T]: T[K]['default'] };
type ReactiveState<T extends StateDef> = { [K in keyof T]: Ref<UnwrapRef<T[K]['default']>, T[K]['default'] | UnwrapRef<T[K]['default']>> };

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

const connection = $i && stream.useChannel('main');

export class Storage<T extends StateDef> {
	public readonly key: string;
	public readonly keyForLocalStorage: string;

	public readonly def: T;

	// TODO: これが実装されたらreadonlyにしたい: https://github.com/microsoft/TypeScript/issues/37487
	public readonly state: State<T>;
	public readonly reactiveState: ReactiveState<T>;

	constructor(key: string, def: T) {
		this.key = key;
		this.keyForLocalStorage = 'pizzax::' + key;
		this.def = def;

		// TODO: indexedDBにする
		const deviceState = JSON.parse(localStorage.getItem(this.keyForLocalStorage) || '{}');
		const deviceAccountState = $i ? JSON.parse(localStorage.getItem(this.keyForLocalStorage + '::' + $i.id) || '{}') : {};
		const registryCache = $i ? JSON.parse(localStorage.getItem(this.keyForLocalStorage + '::cache::' + $i.id) || '{}') : {};

		const state: Record<string, unknown> = {};
		const reactiveState: Record<string, Ref<unknown>> = {};
		for (const [k, v] of Object.entries(def)) {
			if (v.where === 'device' && Object.prototype.hasOwnProperty.call(deviceState, k)) {
				state[k] = deviceState[k];
			} else if (v.where === 'account' && $i && Object.prototype.hasOwnProperty.call(registryCache, k)) {
				state[k] = registryCache[k];
			} else if (v.where === 'deviceAccount' && Object.prototype.hasOwnProperty.call(deviceAccountState, k)) {
				state[k] = deviceAccountState[k];
			} else {
				state[k] = v.default;
				if (_DEV_) console.log('Use default value', k, v.default);
			}
		}
		for (const [k, v] of Object.entries(state)) {
			reactiveState[k] = ref(v);
		}
		// Every key is initialized by the complete definition loop above.
		this.state = state as State<T>;
		this.reactiveState = reactiveState as ReactiveState<T>;

		const account = $i;
		if (account) {
			// なぜかsetTimeoutしないとapi関数内でエラーになる(おそらく循環参照してることに原因がありそう)
			window.setTimeout(() => {
				api('i/registry/get-all', { scope: ['client', this.key] }).then(kvs => {
					const cache: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(def)) {
						if (v.where === 'account') {
							if (Object.prototype.hasOwnProperty.call(kvs, k)) {
								state[k] = kvs[k];
								reactiveState[k].value = kvs[k];
								cache[k] = kvs[k];
							} else {
								state[k] = v.default;
								reactiveState[k].value = v.default;
							}
						}
					}
					localStorage.setItem(this.keyForLocalStorage + '::cache::' + account.id, JSON.stringify(cache));
				});
			}, 1);
			// streamingのuser storage updateイベントを監視して更新
			connection?.on('registryUpdated', ({ scope, key, value }) => {
				if (!scope || !Object.hasOwn(this.def, key) || scope.length !== 2 || scope[0] !== 'client' || scope[1] !== this.key || this.state[key] === value) return;

				state[key] = value;
				reactiveState[key].value = value;

				const cache = JSON.parse(localStorage.getItem(this.keyForLocalStorage + '::cache::' + account.id) || '{}');
				if (cache[key] !== value) {
					cache[key] = value;
					localStorage.setItem(this.keyForLocalStorage + '::cache::' + account.id, JSON.stringify(cache));
				}
			});
		}
	}

	public set<K extends keyof T>(key: K, value: T[K]['default']): void {
		if (_DEV_) console.log('set', key, value);

		this.state[key] = value;
		this.reactiveState[key].value = value;

		switch (this.def[key].where) {
			case 'device': {
				const deviceState = JSON.parse(localStorage.getItem(this.keyForLocalStorage) || '{}');
				deviceState[key] = value;
				localStorage.setItem(this.keyForLocalStorage, JSON.stringify(deviceState));
				break;
			}
			case 'deviceAccount': {
				if ($i == null) break;
				const deviceAccountState = JSON.parse(localStorage.getItem(this.keyForLocalStorage + '::' + $i.id) || '{}');
				deviceAccountState[key] = value;
				localStorage.setItem(this.keyForLocalStorage + '::' + $i.id, JSON.stringify(deviceAccountState));
				break;
			}
			case 'account': {
				if ($i == null) break;
				const cache = JSON.parse(localStorage.getItem(this.keyForLocalStorage + '::cache::' + $i.id) || '{}');
				cache[key] = value;
				localStorage.setItem(this.keyForLocalStorage + '::cache::' + $i.id, JSON.stringify(cache));
				api('i/registry/set', {
					scope: ['client', this.key],
					key: String(key),
					value: value,
				});
				break;
			}
		}
	}

	public push<K extends keyof T>(key: K, value: ArrayElement<T[K]['default']>): void {
		const currentState = this.state[key];
		if (!Array.isArray(currentState)) throw new TypeError('Storage value is not an array');
		// Appending an element preserves the array type selected by this key.
		this.set(key, [...currentState, value] as T[K]['default']);
	}

	public reset(key: keyof T) {
		this.set(key, this.def[key].default);
	}

	/**
	 * 特定のキーの、簡易的なgetter/setterを作ります
	 * 主にvue場で設定コントロールのmodelとして使う用
	 */
	public makeGetterSetter<K extends keyof T>(key: K, getter?: (v: T[K]['default']) => T[K]['default'], setter?: (v: T[K]['default']) => T[K]['default']): WritableComputedOptions<T[K]['default']> {
		const valueRef = shallowRef(this.state[key]);

		const stop = watch(this.reactiveState[key], val => {
			valueRef.value = this.state[key];
		});

		// NOTE: vueコンポーネント内で呼ばれない限りは、onUnmounted は無意味なのでメモリリークする
		onUnmounted(() => {
			stop();
		});

		// TODO: VueのcustomRef使うと良い感じになるかも
		return {
			get: () => {
				if (getter) {
					return getter(valueRef.value);
				} else {
					return valueRef.value;
				}
			},
			set: (value: T[K]['default']) => {
				const val = setter ? setter(value) : value;
				this.set(key, val);
				valueRef.value = val;
			},
		};
	}
}
