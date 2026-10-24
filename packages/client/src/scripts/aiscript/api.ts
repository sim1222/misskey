import { utils, values } from '@syuilo/aiscript';
import * as os from '@/os';
import { isRecord } from '@/scripts/form';
import { $i } from '@/account';

export function createAiScriptEnv(opts: { storageKey: string; token?: string | null }) {
	let apiRequests = 0;
	return {
		USER_ID: $i ? values.STR($i.id) : values.NULL,
		USER_NAME: $i ? values.STR($i.name ?? $i.username) : values.NULL,
		USER_USERNAME: $i ? values.STR($i.username) : values.NULL,
		'Mk:dialog': values.FN_NATIVE(async ([title, text, type]) => {
			utils.assertString(title);
			utils.assertString(text);
			if (type) utils.assertString(type);
			const dialogType = type ? type.value : undefined;
			if (dialogType !== undefined && !isDialogType(dialogType)) throw new TypeError('Unknown dialog type');
			await os.alert({
				type: dialogType ?? 'info',
				title: title.value,
				text: text.value,
			});
			return values.NULL;
		}),
		'Mk:confirm': values.FN_NATIVE(async ([title, text, type]) => {
			utils.assertString(title);
			utils.assertString(text);
			if (type) utils.assertString(type);
			const dialogType = type ? type.value : undefined;
			if (dialogType !== undefined && !isDialogType(dialogType)) throw new TypeError('Unknown dialog type');
			const confirm = await os.confirm({
				type: dialogType ?? 'question',
				title: title.value,
				text: text.value,
			});
			return confirm.canceled ? values.FALSE : values.TRUE;
		}),
		'Mk:api': values.FN_NATIVE(async ([ep, param, token]) => {
			utils.assertString(ep);
			const params: unknown = utils.valToJs(param);
			if (!isRecord(params)) throw new TypeError('API parameters must be an object');
			if (token) utils.assertString(token);
			apiRequests++;
			if (apiRequests > 16) return values.NULL;
			const res = await os.rawApi(ep.value, params, token ? token.value : (opts.token ?? null));
			return utils.jsToVal(res);
		}),
		'Mk:save': values.FN_NATIVE(([key, value]) => {
			utils.assertString(key);
			localStorage.setItem('aiscript:' + opts.storageKey + ':' + key.value, JSON.stringify(utils.valToJs(value)));
			return values.NULL;
		}),
		'Mk:load': values.FN_NATIVE(([key]) => {
			utils.assertString(key);
			return utils.jsToVal(JSON.parse(localStorage.getItem('aiscript:' + opts.storageKey + ':' + key.value) ?? 'null'));
		}),
	};
}

function isDialogType(value: string): value is 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question' {
 return value === 'error' || value === 'info' || value === 'success' || value === 'warning' || value === 'waiting' || value === 'question';
}
