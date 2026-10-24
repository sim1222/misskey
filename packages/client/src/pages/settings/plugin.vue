<template>
<div class="_formRoot">
	<FormLink to="/settings/plugin/install"><template #icon><i class="fas fa-download"></i></template>{{ i18n.ts._plugin.install }}</FormLink>

	<FormSection>
		<template #label>{{ i18n.ts.manage }}</template>
		<div v-for="plugin in plugins" :key="plugin.id" class="_formBlock _panel blur" style="padding: 20px;">
			<span style="display: flex;"><b>{{ plugin.name }}</b><span style="margin-left: auto;">v{{ plugin.version }}</span></span>

			<FormSwitch class="_formBlock" :model-value="plugin.active" @update:modelValue="changeActive(plugin, $event)">{{ i18n.ts.makeActive }}</FormSwitch>

			<MkKeyValue class="_formBlock">
				<template #key>{{ i18n.ts.author }}</template>
				<template #value>{{ plugin.author }}</template>
			</MkKeyValue>
			<MkKeyValue class="_formBlock">
				<template #key>{{ i18n.ts.description }}</template>
				<template #value>{{ plugin.description }}</template>
			</MkKeyValue>
			<MkKeyValue class="_formBlock">
				<template #key>{{ i18n.ts.permission }}</template>
				<template #value>{{ plugin.permissions }}</template>
			</MkKeyValue>

			<div style="display: flex; gap: var(--margin); flex-wrap: wrap;">
				<MkButton v-if="plugin.config" inline @click="config(plugin)"><i class="fas fa-cog"></i> {{ i18n.ts.settings }}</MkButton>
				<MkButton inline danger @click="uninstall(plugin)"><i class="fas fa-trash-alt"></i> {{ i18n.ts.uninstall }}</MkButton>
			</div>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import FormLink from '@/components/form/link.vue';
import FormSwitch from '@/components/form/switch.vue';
import FormSection from '@/components/form/section.vue';
import MkButton from '@/components/MkButton.vue';
import MkKeyValue from '@/components/MkKeyValue.vue';
import * as os from '@/os';
import { isFormItemValue } from '@/scripts/form';
import { ColdDeviceStorage } from '@/store';
import { unisonReload } from '@/scripts/unison-reload';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

const plugins = ref(ColdDeviceStorage.get('plugins'));

function uninstall(plugin: { id: string; }) {
	ColdDeviceStorage.set('plugins', plugins.value.filter(x => x.id !== plugin.id));
	os.success();
	nextTick(() => {
		unisonReload();
	});
}

// TODO: この処理をstore側にactionとして移動し、設定画面を開くAiScriptAPIを実装できるようにする
async function config(plugin: import('@/store').Plugin) {
	const config = plugin.config;
    if (!config) return;
	for (const key in plugin.configData) {
		const item = config[key];
        const value = plugin.configData[key];
        if (item && isFormItemValue(item, value)) Object.assign(item, { default: value });
	}

	const { canceled, result } = await os.form(plugin.name, config);
	if (canceled) return;

	const coldPlugins = ColdDeviceStorage.get('plugins');
	coldPlugins.find(p => p.id === plugin.id)!.configData = result;
	ColdDeviceStorage.set('plugins', coldPlugins);

	nextTick(() => {
		location.reload();
	});
}

function changeActive(plugin: { id: string; }, active: boolean) {
	const coldPlugins = ColdDeviceStorage.get('plugins');
	coldPlugins.find(p => p.id === plugin.id)!.active = active;
	ColdDeviceStorage.set('plugins', coldPlugins);

	nextTick(() => {
		location.reload();
	});
}





definePageMetadata({
	title: i18n.ts.plugins,
	icon: 'fas fa-plug',
});
</script>

<style lang="scss" scoped>

</style>
