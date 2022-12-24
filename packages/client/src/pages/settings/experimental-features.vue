<template>
<div class="_formRoot">
	<div class="yellowBorder"/>
	<div style="text-align: center;">自己責任で使用してください</div>
	<MkSpacer></MkSpacer>

	<FormInput v-model="mediaProxy">
		<template #label>{{ "ローカルメディアプロキシ" }}</template>
		<template #caption>{{ "クライアント側でメディアプロキシを指定します" }}</template>
	</FormInput>

	<FormButton danger class="_formBlock" @click="reset()"><i class="fas fa-redo"></i> {{ i18n.ts.default }}</FormButton>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import FormInput from '@/components/form/input.vue';
import FormButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n';
import * as os from '@/os';
import { defaultStore } from '@/store';
import { definePageMetadata } from '@/scripts/page-metadata';

const mediaProxy = computed(defaultStore.makeGetterSetter('mediaProxy'));

const reset = ():void => {
	os.confirm({
		type: 'warning',
		text: 'リセットしてもよろしいですか？',
	}).then(res => {
		if (res.canceled) return;
		mediaProxy.value = '';
	});
};

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata({
	title: 'Experimental Features',
	icon: 'fas fa-music',
});
</script>
<style lang="scss" scoped>
.yellowBorder {
	background: linear-gradient(0.25turn, #111111AA, #00000000, #111111AA), repeating-linear-gradient(-45deg,yellow, yellow 5px,#111111AA 0, #111111AA 10px);
	mask-image: linear-gradient(0.25turn, transparent, #000000FF, transparent);
	-webkit-mask-image: -webkit-linear-gradient(right, transparent, #000000FF, transparent);
	height: 5px;
}
</style>
