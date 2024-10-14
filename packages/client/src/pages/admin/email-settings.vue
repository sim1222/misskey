<template>
<MkStickyContainer>
	<template #header><XHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :content-max="700" :margin-min="16" :margin-max="32">
		<FormSuspense :p="init">
			<div class="_formRoot">
				<FormSwitch v-model="enableEmail" class="_formBlock">
					<template #label>{{ i18n.ts.enableEmail }} ({{ i18n.ts.recommended }})</template>
					<template #caption>{{ i18n.ts.emailConfigInfo }}</template>
				</FormSwitch>

				<template v-if="enableEmail">
					<FormInput v-model="email" type="email" class="_formBlock">
						<template #label>{{ i18n.ts.emailAddress }}</template>
					</FormInput>

					<FormSection>
						<template #label>{{ i18n.ts.smtpConfig }}</template>
						<FormSplit :min-width="280">
							<FormInput v-model="smtpHost" class="_formBlock">
								<template #label>{{ i18n.ts.smtpHost }}</template>
							</FormInput>
							<FormInput v-model="smtpPort" type="number" class="_formBlock">
								<template #label>{{ i18n.ts.smtpPort }}</template>
							</FormInput>
						</FormSplit>
						<FormSplit :min-width="280">
							<FormInput v-model="smtpUser" class="_formBlock">
								<template #label>{{ i18n.ts.smtpUser }}</template>
							</FormInput>
							<FormInput v-model="smtpPass" type="password" class="_formBlock">
								<template #label>{{ i18n.ts.smtpPass }}</template>
							</FormInput>
						</FormSplit>
						<FormInfo class="_formBlock">{{ i18n.ts.emptyToDisableSmtpAuth }}</FormInfo>
						<FormSwitch v-model="smtpSecure" class="_formBlock">
							<template #label>{{ i18n.ts.smtpSecure }}</template>
							<template #caption>{{ i18n.ts.smtpSecureInfo }}</template>
						</FormSwitch>
					</FormSection>
				</template>
			</div>
		</FormSuspense>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import XHeader from './_header_.vue';
import FormSwitch from '@/components/form/switch.vue';
import FormInput from '@/components/form/input.vue';
import FormInfo from '@/components/MkInfo.vue';
import FormSuspense from '@/components/form/suspense.vue';
import FormSplit from '@/components/form/split.vue';
import FormSection from '@/components/form/section.vue';
import * as os from '@/os';
import { fetchInstance, instance } from '@/instance';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

let enableEmail: boolean = ref(false);
let email: any = ref(null);
let smtpSecure: boolean = ref(false);
let smtpHost: string = ref('');
let smtpPort: number = ref(0);
let smtpUser: string = ref('');
let smtpPass: string = ref('');

async function init() {
	const meta = await os.api('admin/meta');
	enableEmail.value = meta.enableEmail;
	email.value = meta.email;
	smtpSecure.value = meta.smtpSecure;
	smtpHost.value = meta.smtpHost;
	smtpPort.value = meta.smtpPort;
	smtpUser.value = meta.smtpUser;
	smtpPass.value = meta.smtpPass;
}

async function testEmail() {
	const { canceled, result: destination } = await os.inputText({
		title: i18n.ts.destination,
		type: 'email',
		placeholder: instance.maintainerEmail,
	});
	if (canceled) return;
	os.apiWithDialog('admin/send-email', {
		to: destination,
		subject: 'Test email',
		text: 'Yo',
	});
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		enableEmail: enableEmail.value,
		email: email.value,
		smtpSecure: smtpSecure.value,
		smtpHost: smtpHost.value,
		smtpPort: smtpPort.value,
		smtpUser: smtpUser.value,
		smtpPass: smtpPass.value,
	}).then(() => {
		fetchInstance();
	});
}

const headerActions = computed(() => [{
	asFullButton: true,
	text: i18n.ts.testEmail,
	handler: testEmail,
}, {
	asFullButton: true,
	icon: 'fas fa-check',
	text: i18n.ts.save,
	handler: save,
}]);

const headerTabs = computed(() => []);

definePageMetadata({
	title: i18n.ts.emailServer,
	icon: 'fas fa-envelope',
});
</script>
