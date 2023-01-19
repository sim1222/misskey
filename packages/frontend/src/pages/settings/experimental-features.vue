<template>
<div class="_formRoot">
	<div class="yellowBorder"/>
	<div style="text-align: center;">{{ i18n.ts._simkey.ownRisk }}</div>
	<MkSpacer></MkSpacer>

	<FormSection>
		<template #label>{{ i18n.ts._simkey.localMediaProxy }}</template>
		<div class="_gaps_m">
			<div class="_gaps_s">
				<FormInput v-model="mediaProxy">
					<template #caption>{{ i18n.ts._simkey.localMediaProxyInfo }}</template>
				</FormInput>
			</div>
		</div>
	</FormSection>
	<FormSection>
		<template #label>配信者モード</template>
		<div class="_gaps_m">
			<div class="_gaps_s">
				<MkSwitch v-model="streamerMode">配信者モードをオンにする</MkSwitch>
			</div>
		</div>
		<p>タイムラインに公開範囲がフォロワー以下の投稿が表示されなくなります</p>
	</FormSection>
	<FormSection>
		<div class="_gaps_m">
			<div class="_gaps_s">
				<FormButton danger class="_formBlock" @click="reset()"><i class="fas fa-redo"></i> {{ i18n.ts.default }}</FormButton>
			</div>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import FormInput from '@/components/MkInput.vue';
import FormButton from '@/components/MkButton.vue';
import FormSection from '@/components/form/section.vue';
import { i18n } from '@/i18n';
import * as os from '@/os';
import { defaultStore } from '@/store';
import { definePageMetadata } from '@/scripts/page-metadata';
import MkSwitch from "@/components/MkSwitch.vue";

const mediaProxy = computed(defaultStore.makeGetterSetter('mediaProxy'));
const streamerMode = computed(defaultStore.makeGetterSetter('streamerMode'));

const reset = ():void => {
	os.confirm({
		type: 'warning',
		text: i18n.ts._simkey.confirmReset,
	}).then(res => {
		if (res.canceled) return;
		mediaProxy.value = '';
		streamerMode.value = false;
	});
};

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata({
	title: i18n.ts._simkey.experimentalFeatures,
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
