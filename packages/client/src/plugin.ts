import { AiScript, utils, values } from '@syuilo/aiscript';
import { deserialize } from '@syuilo/aiscript/built/serializer';
import { jsToVal } from '@syuilo/aiscript/built/interpreter/util';
import { createAiScriptEnv } from '@/scripts/aiscript/api';
import type { Plugin } from '@/store';
import { inputText } from '@/os';
import { noteActions, notePostInterruptors, noteViewInterruptors, postFormActions, userActions } from '@/store';

const pluginContexts = new Map<string, AiScript>();

export function install(plugin: Plugin) {
	console.info('Plugin installed:', plugin.name, 'v' + plugin.version);

	const aiscript = new AiScript(createPluginEnv({
		plugin: plugin,
		storageKey: 'plugins:' + plugin.id
	}), {
		in: (q: string) => {
			return new Promise<string | null | undefined>(ok => {
				inputText({
					title: q,
				}).then(({ canceled, result: a }) => {
					ok(a);
				});
			});
		},
		out: (value: values.Value) => {
			console.log(value);
		},
		log: (_type: string, _params: unknown) => {
		},
	});

	initPlugin({ plugin, aiscript });

	aiscript.exec(deserialize(plugin.ast));
}

function createPluginEnv(opts: { plugin: Plugin; storageKey: string }) {
	const config = new Map<string, values.Value>();
	for (const [k, v] of Object.entries(opts.plugin.config || {})) {
		config.set(k, jsToVal(typeof opts.plugin.configData[k] !== 'undefined' ? opts.plugin.configData[k] : v.default));
	}

	return {
		...createAiScriptEnv({ ...opts, token: opts.plugin.token }),
		//#region Deprecated
		'Mk:register_post_form_action': values.FN_NATIVE(([title, handler]) => {
			utils.assertString(title);
			utils.assertFunction(handler);
			registerPostFormAction({ pluginId: opts.plugin.id, title: title.value, handler });
		}),
		'Mk:register_user_action': values.FN_NATIVE(([title, handler]) => {
			utils.assertString(title);
			utils.assertFunction(handler);
			registerUserAction({ pluginId: opts.plugin.id, title: title.value, handler });
		}),
		'Mk:register_note_action': values.FN_NATIVE(([title, handler]) => {
			utils.assertString(title);
			utils.assertFunction(handler);
			registerNoteAction({ pluginId: opts.plugin.id, title: title.value, handler });
		}),
		//#endregion
		'Plugin:register_post_form_action': values.FN_NATIVE(([title, handler]) => {
			utils.assertString(title);
			utils.assertFunction(handler);
			registerPostFormAction({ pluginId: opts.plugin.id, title: title.value, handler });
		}),
		'Plugin:register_user_action': values.FN_NATIVE(([title, handler]) => {
			utils.assertString(title);
			utils.assertFunction(handler);
			registerUserAction({ pluginId: opts.plugin.id, title: title.value, handler });
		}),
		'Plugin:register_note_action': values.FN_NATIVE(([title, handler]) => {
			utils.assertString(title);
			utils.assertFunction(handler);
			registerNoteAction({ pluginId: opts.plugin.id, title: title.value, handler });
		}),
		'Plugin:register_note_view_interruptor': values.FN_NATIVE(([handler]) => {
			utils.assertFunction(handler);
			registerNoteViewInterruptor({ pluginId: opts.plugin.id, handler });
		}),
		'Plugin:register_note_post_interruptor': values.FN_NATIVE(([handler]) => {
			utils.assertFunction(handler);
			registerNotePostInterruptor({ pluginId: opts.plugin.id, handler });
		}),
		'Plugin:open_url': values.FN_NATIVE(([url]) => {
			utils.assertString(url);
			window.open(url.value, '_blank');
		}),
		'Plugin:config': values.OBJ(config),
	};
}

function initPlugin({ plugin, aiscript }: { plugin: Plugin; aiscript: AiScript }) {
	pluginContexts.set(plugin.id, aiscript);
}

function registerPostFormAction({ pluginId, title, handler }: { pluginId: string; title: string; handler: values.VFn }) {
	postFormActions.push({
		title, handler: (form, update) => {
			getPluginContext(pluginId).execFn(handler, [utils.jsToVal(form), values.FN_NATIVE(([key, value]) => {
				utils.assertString(key);
				utils.assertString(value);
				update(key.value, value.value);
			})]);
		}
	});
}

function registerUserAction({ pluginId, title, handler }: { pluginId: string; title: string; handler: values.VFn }) {
	userActions.push({
		title, handler: (user) => {
			getPluginContext(pluginId).execFn(handler, [utils.jsToVal(user)]);
		}
	});
}

function registerNoteAction({ pluginId, title, handler }: { pluginId: string; title: string; handler: values.VFn }) {
	noteActions.push({
		title, handler: (note) => {
			getPluginContext(pluginId).execFn(handler, [utils.jsToVal(note)]);
		}
	});
}

function registerNoteViewInterruptor({ pluginId, handler }: { pluginId: string; handler: values.VFn }) {
	noteViewInterruptors.push({
		handler: async (note) => {
			return utils.valToJs(await getPluginContext(pluginId).execFn(handler, [utils.jsToVal(note)]));
		}
	});
}

function registerNotePostInterruptor({ pluginId, handler }: { pluginId: string; handler: values.VFn }) {
	notePostInterruptors.push({
		handler: async (note) => {
			return utils.valToJs(await getPluginContext(pluginId).execFn(handler, [utils.jsToVal(note)]));
		}
	});
}

function getPluginContext(id: string): AiScript {
 const context = pluginContexts.get(id);
 if (!context) throw new Error('Plugin is not initialized: ' + id);
 return context;
}
