<template><MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :tabs="headerTabs"/></template>
		<MkSpacer :content-max="700" :margin-min="16" :margin-max="32">
	<FormSuspense :p="init">
		<MkInfo class="_formBlock">{{ i18n.ts.proxyAccountDescription }}</MkInfo>
		<MkKeyValue class="_formBlock">
			<template #key>{{ i18n.ts.proxyAccount }}</template>
			<template #value>{{ proxyAccount ? `@${proxyAccount.username}` : i18n.ts.none }}</template>
		</MkKeyValue>

		<FormButton primary class="_formBlock" @click="chooseProxyAccount">{{ i18n.ts.selectAccount }}</FormButton>
	</FormSuspense>
</MkSpacer></MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkKeyValue from '@/components/MkKeyValue.vue';
import FormButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormSuspense from '@/components/form/suspense.vue';
import * as os from '@/os';
import { fetchInstance } from '@/instance';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

let proxyAccount: any = ref(null);
let proxyAccountId: any = ref(null);

async function init() {
	const meta = await os.api('admin/meta');
	proxyAccountId.value = meta.proxyAccountId;
	if (proxyAccountId.value) {
		proxyAccount.value = await os.api('users/show', { userId: proxyAccountId.value });
	}
}

function chooseProxyAccount() {
	os.selectUser().then(user => {
		proxyAccount.value = user;
		proxyAccountId.value = user.id;
		save();
	});
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		proxyAccountId: proxyAccountId.value,
	}).then(() => {
		fetchInstance();
	});
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata({
	title: i18n.ts.proxyAccount,
	icon: 'fas fa-ghost',
});
</script>
