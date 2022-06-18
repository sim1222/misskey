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
		'Mk:restApi': values.FN_NATIVE(async ([url, method, body, headers]) => {
			const init: {method?: string, body?: string, headers?: Headers} = new Object();
			utils.assertString(url);
			if (method) {
				utils.assertString(method);
				init.method = method.value;
			}
			if (body) {
				utils.assertString(body);
				init.body = body.value;
			}
			if (headers) {
				utils.assertObject(headers);
				const typedHeaders = new Headers();
				headers.value.forEach((value, key) => {
					typedHeaders.set(key, utils.valToString(value));
				});
				init.headers = typedHeaders;
			}
			const response = await fetch(url.value, init);
			const contentType = response.headers.get('Content-Type');
			if (contentType === null) {
				return utils.jsToVal(await response.text());
			}
			if (contentType.includes('application/json')) {
				return utils.jsToVal(await response.json());
			}
			if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
				const parser = new DOMParser();
				return utils.jsToVal(parser.parseFromString((await response.text()), 'application/xml'));
			}
			return utils.jsToVal(await response.text());
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
	};
}
