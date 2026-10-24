<template>
<div class="_formRoot">
	<FormSwitch v-model="isLocked" class="_formBlock" @update:modelValue="save()">{{ i18n.ts.makeFollowManuallyApprove }}<template #caption>{{ i18n.ts.lockedAccountInfo }}</template></FormSwitch>
	<FormSwitch v-if="isLocked" v-model="autoAcceptFollowed" class="_formBlock" @update:modelValue="save()">{{ i18n.ts.autoAcceptFollowed }}</FormSwitch>

	<FormSwitch v-model="publicReactions" class="_formBlock" @update:modelValue="save()">
		{{ i18n.ts.makeReactionsPublic }}
		<template #caption>{{ i18n.ts.makeReactionsPublicDescription }}</template>
	</FormSwitch>

	<FormSelect v-model="ffVisibility" class="_formBlock" @update:modelValue="save()">
		<template #label>{{ i18n.ts.ffVisibility }}</template>
		<option value="public">{{ i18n.ts._ffVisibility.public }}</option>
		<option value="followers">{{ i18n.ts._ffVisibility.followers }}</option>
		<option value="private">{{ i18n.ts._ffVisibility.private }}</option>
		<template #caption>{{ i18n.ts.ffVisibilityDescription }}</template>
	</FormSelect>

	<FormSwitch v-model="hideOnlineStatus" class="_formBlock" @update:modelValue="save()">
		{{ i18n.ts.hideOnlineStatus }}
		<template #caption>{{ i18n.ts.hideOnlineStatusDescription }}</template>
	</FormSwitch>
	<FormSwitch v-model="noCrawle" class="_formBlock" @update:modelValue="save()">
		{{ i18n.ts.noCrawle }}
		<template #caption>{{ i18n.ts.noCrawleDescription }}</template>
	</FormSwitch>
	<FormSwitch v-model="isExplorable" class="_formBlock" @update:modelValue="save()">
		{{ i18n.ts.makeExplorable }}
		<template #caption>{{ i18n.ts.makeExplorableDescription }}</template>
	</FormSwitch>

	<FormSection>
		<FormSwitch v-model="rememberNoteVisibility" class="_formBlock" @update:modelValue="save()">{{ i18n.ts.rememberNoteVisibility }}</FormSwitch>
		<FormFolder v-if="!rememberNoteVisibility" class="_formBlock">
			<template #label>{{ i18n.ts.defaultNoteVisibility }}</template>
			<template v-if="defaultNoteVisibility === 'public'" #suffix>{{ i18n.ts._visibility.public }}</template>
			<template v-else-if="defaultNoteVisibility === 'home'" #suffix>{{ i18n.ts._visibility.home }}</template>
			<template v-else-if="defaultNoteVisibility === 'followers'" #suffix>{{ i18n.ts._visibility.followers }}</template>
			<template v-else-if="defaultNoteVisibility === 'specified'" #suffix>{{ i18n.ts._visibility.specified }}</template>

			<FormSelect v-model="defaultNoteVisibility" class="_formBlock">
				<option value="public">{{ i18n.ts._visibility.public }}</option>
				<option value="home">{{ i18n.ts._visibility.home }}</option>
				<option value="followers">{{ i18n.ts._visibility.followers }}</option>
				<option value="specified">{{ i18n.ts._visibility.specified }}</option>
			</FormSelect>
			<FormSwitch v-model="defaultNoteLocalOnly" class="_formBlock">{{ i18n.ts._visibility.localOnly }}</FormSwitch>
		</FormFolder>
	</FormSection>

	<FormSwitch v-model="keepCw" class="_formBlock" @update:modelValue="save()">{{ i18n.ts.keepCw }}</FormSwitch>
</div>
</template>

<script lang="ts" setup>
import { requireAccount } from '@/account';
const account = requireAccount();

import { ref, computed } from 'vue';
import FormSwitch from '@/components/form/switch.vue';
import FormSelect from '@/components/form/select.vue';
import FormSection from '@/components/form/section.vue';
import FormFolder from '@/components/form/folder.vue';
import * as os from '@/os';
import { defaultStore } from '@/store';
import { i18n } from '@/i18n';

import { definePageMetadata } from '@/scripts/page-metadata';

let isLocked = ref(account.isLocked);
let autoAcceptFollowed = ref(account.autoAcceptFollowed);
let noCrawle = ref(account.noCrawle);
let isExplorable = ref(account.isExplorable);
let hideOnlineStatus = ref(account.hideOnlineStatus);
let publicReactions = ref(account.publicReactions);
let ffVisibility = ref(account.ffVisibility);

let defaultNoteVisibility = computed(defaultStore.makeGetterSetter('defaultNoteVisibility'));
let defaultNoteLocalOnly = computed(defaultStore.makeGetterSetter('defaultNoteLocalOnly'));
let rememberNoteVisibility = computed(defaultStore.makeGetterSetter('rememberNoteVisibility'));
let keepCw = computed(defaultStore.makeGetterSetter('keepCw'));

function save() {
	os.api('i/update', {
		isLocked: !!isLocked.value,
		autoAcceptFollowed: !!autoAcceptFollowed.value,
		noCrawle: !!noCrawle.value,
		isExplorable: !!isExplorable.value,
		hideOnlineStatus: !!hideOnlineStatus.value,
		publicReactions: !!publicReactions.value,
		ffVisibility: ffVisibility.value,
	});
}





definePageMetadata({
	title: i18n.ts.privacy,
	icon: 'fas fa-lock-open',
});
</script>
