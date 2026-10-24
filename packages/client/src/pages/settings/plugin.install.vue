<template>
<div class="_formRoot">
	<FormInfo warn class="_formBlock">{{ i18n.ts._plugin.installWarn }}</FormInfo>

	<FormTextarea v-model="code" tall class="_formBlock">
		<template #label>{{ i18n.ts.code }}</template>
	</FormTextarea>

	<div class="_formBlock">
		<FormButton :disabled="code == null" primary inline @click="install"><i class="fas fa-check"></i> {{ i18n.ts.install }}</FormButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, nextTick, ref } from 'vue';
import { AiScript, parse } from '@syuilo/aiscript';
import { serialize } from '@syuilo/aiscript/built/serializer';
import { v4 as uuid } from 'uuid';
import FormTextarea from '@/components/form/textarea.vue';
import FormButton from '@/components/MkButton.vue';
import FormInfo from '@/components/MkInfo.vue';
import * as os from '@/os';
import { isRecord } from '@/scripts/form';
import { isPlugin } from '@/scripts/plugin-contract';
import { ColdDeviceStorage, type Plugin } from '@/store';
import { unisonReload } from '@/scripts/unison-reload';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

const code = ref<string | null>(null);

function installPlugin(plugin: Plugin) {
 ColdDeviceStorage.set('plugins', [...ColdDeviceStorage.get('plugins'), plugin]);
}

async function install() {
    if (code.value == null) return;
	let ast;
	try {
		ast = parse(code.value);
	} catch (err) {
		os.alert({
			type: 'error',
			text: 'Syntax error :(',
		});
		return;
	}

	const meta = AiScript.collectMetadata(ast);
	if (meta == null) {
		os.alert({
			type: 'error',
			text: 'No metadata found :(',
		});
		return;
	}

	const metadata: unknown = meta.get(null);
	if (!isRecord(metadata)) {
		os.alert({
			type: 'error',
			text: 'No metadata found :(',
		});
		return;
	}

	const candidate = { ...metadata, id: uuid(), active: true, configData: {}, token: null, ast: serialize(ast) };
 if (!isPlugin(candidate)) {
  os.alert({ type: 'error', text: 'Invalid plugin metadata' });
  return;
 }
 const { name, permissions } = candidate;

	const token = permissions == null || permissions.length === 0 ? null : await new Promise<string>((res, rej) => {
		os.popup(defineAsyncComponent(() => import('@/components/MkTokenGenerateWindow.vue')), {
			title: i18n.ts.tokenRequested,
			information: i18n.ts.pluginTokenRequestedDescription,
			initialName: name,
			initialPermissions: permissions,
		}, {
			done: async result => {
				const { name, permissions } = result;
				const { token } = await os.api('miauth/gen-token', {
					session: null,
					name: name,
					permission: permissions,
				});
				res(token);
			},
		}, 'closed');
	});

	installPlugin({ ...candidate, token });

	os.success();

	nextTick(() => {
		unisonReload();
	});
}





definePageMetadata({
	title: i18n.ts._plugin.install,
	icon: 'fas fa-download',
});
</script>
