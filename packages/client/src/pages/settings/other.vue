<template>
<div class="_formRoot">
	<FormSwitch v-model="account.injectFeaturedNote" class="_formBlock" @update:modelValue="onChangeInjectFeaturedNote">
		{{ i18n.ts.showFeaturedNotesInTimeline }}
	</FormSwitch>

	<!--
	<FormSwitch v-model="reportError" class="_formBlock">{{ i18n.ts.sendErrorReports }}<template #caption>{{ i18n.ts.sendErrorReportsDescription }}</template></FormSwitch>
	-->

	<FormLink to="/settings/account-info" class="_formBlock">{{ i18n.ts.accountInfo }}</FormLink>

	<FormLink to="/registry" class="_formBlock"><template #icon><i class="fas fa-cogs"></i></template>{{ i18n.ts.registry }}</FormLink>

	<FormLink to="/settings/delete-account" class="_formBlock"><template #icon><i class="fas fa-exclamation-triangle"></i></template>{{ i18n.ts.closeAccount }}</FormLink>
</div>
</template>

<script lang="ts" setup>
import { requireAccount } from '@/account';
const account = requireAccount();


import FormSwitch from '@/components/form/switch.vue';
import FormLink from '@/components/form/link.vue';
import * as os from '@/os';


import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';



function onChangeInjectFeaturedNote(v: boolean) {
	os.api('i/update', {
		injectFeaturedNote: v,
	}).then((i) => {
		account.injectFeaturedNote = i.injectFeaturedNote;
	});
}





definePageMetadata({
	title: i18n.ts.other,
	icon: 'fas fa-ellipsis-h',
});
</script>
