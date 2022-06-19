import { utils, values } from '@syuilo/aiscript';
import * as os from '@/os';
import { $i } from '@/account';

export function createAiScriptEnv(opts) {
	let apiRequests = 0;
	return {
		USER_ID: $i ? values.STR($i.id) : values.NULL,
		USER_NAME: $i ? values.STR($i.name) : values.NULL,
		USER_USERNAME: $i ? values.STR($i.username) : values.NULL,
		'Mk:dialog': values.FN_NATIVE(async ([title, text, type]) => {
			await os.alert({
				type: type ? type.value : 'info',
				title: title.value,
				text: text.value,
			});
		}),
		'Mk:confirm': values.FN_NATIVE(async ([title, text, type]) => {
			const confirm = await os.confirm({
				type: type ? type.value : 'question',
				title: title.value,
				text: text.value,
			});
			return confirm.canceled ? values.FALSE : values.TRUE;
		}),
		'Mk:api': values.FN_NATIVE(async ([ep, param, token]) => {
			if (token) utils.assertString(token);
			apiRequests++;
			if (apiRequests > 16) return values.NULL;
			const res = await os.api(ep.value, utils.valToJs(param), token ? token.value : (opts.token || null));
			return utils.jsToVal(res);
		}),
		'Mk:save': values.FN_NATIVE(([key, value]) => {
			utils.assertString(key);
			localStorage.setItem('aiscript:' + opts.storageKey + ':' + key.value, JSON.stringify(utils.valToJs(value)));
			return values.NULL;
		}),
		'Mk:load': values.FN_NATIVE(([key]) => {
			utils.assertString(key);
			return utils.jsToVal(JSON.parse(localStorage.getItem('aiscript:' + opts.storageKey + ':' + key.value)));
		}),
		'Mk:fetch': values.FN_NATIVE(async ([resource, init]) => {
			utils.assertString(resource);
			const response = await (async () => {
				if (init) {
					utils.assertObject(init);
					return await fetch(resource.value, utils.valToJs(init));
				} else {
					return await fetch(resource.value);
				}
			})();

			// Parsing Section
			const contentType = response.headers.get('Content-Type');
			if (contentType === null) {
				return utils.jsToVal(await response.text());
			}
			if (contentType.includes('json')) {
				return utils.jsToVal(await response.json());
			}
			if (contentType.includes('xml')) {
				const parser = new DOMParser();
				return utils.jsToVal(parser.parseFromString((await response.text()), 'application/xml'));
			}
			// Content-Type不明
			return utils.jsToVal(await response.text());
		}),
	};
}
