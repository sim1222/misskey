<template>
<div>
	<MkStickyContainer>
		<template #header><XHeader :actions="headerActions" :tabs="headerTabs"/></template>
		<MkSpacer :content-max="700" :margin-min="16" :margin-max="32">
			<FormSuspense :p="init">
				<div class="_formRoot">
					<FormInput v-model="name" class="_formBlock">
						<template #label>{{ i18n.ts.instanceName }}</template>
					</FormInput>

					<FormTextarea v-model="description" class="_formBlock">
						<template #label>{{ i18n.ts.instanceDescription }}</template>
					</FormTextarea>

					<FormInput v-model="tosUrl" class="_formBlock">
						<template #prefix><i class="fas fa-link"></i></template>
						<template #label>{{ i18n.ts.tosUrl }}</template>
					</FormInput>

					<FormSplit :min-width="300">
						<FormInput v-model="maintainerName" class="_formBlock">
							<template #label>{{ i18n.ts.maintainerName }}</template>
						</FormInput>

						<FormInput v-model="maintainerEmail" type="email" class="_formBlock">
							<template #prefix><i class="fas fa-envelope"></i></template>
							<template #label>{{ i18n.ts.maintainerEmail }}</template>
						</FormInput>
					</FormSplit>

					<FormTextarea v-model="pinnedUsers" class="_formBlock">
						<template #label>{{ i18n.ts.pinnedUsers }}</template>
						<template #caption>{{ i18n.ts.pinnedUsersDescription }}</template>
					</FormTextarea>

					<FormSection>
						<FormSwitch v-model="enableRegistration" class="_formBlock">
							<template #label>{{ i18n.ts.enableRegistration }}</template>
						</FormSwitch>

						<FormSwitch v-model="emailRequiredForSignup" class="_formBlock">
							<template #label>{{ i18n.ts.emailRequiredForSignup }}</template>
						</FormSwitch>
					</FormSection>

					<FormSection>
						<FormSwitch v-model="enableLocalTimeline" class="_formBlock">{{ i18n.ts.enableLocalTimeline }}</FormSwitch>
						<FormSwitch v-model="enableGlobalTimeline" class="_formBlock">{{ i18n.ts.enableGlobalTimeline }}</FormSwitch>
						<FormInfo class="_formBlock">{{ i18n.ts.disablingTimelinesInfo }}</FormInfo>
					</FormSection>

					<FormSection>
						<template #label>{{ i18n.ts.theme }}</template>

						<FormInput v-model="iconUrl" class="_formBlock">
							<template #prefix><i class="fas fa-link"></i></template>
							<template #label>{{ i18n.ts.iconUrl }}</template>
						</FormInput>

						<FormInput v-model="bannerUrl" class="_formBlock">
							<template #prefix><i class="fas fa-link"></i></template>
							<template #label>{{ i18n.ts.bannerUrl }}</template>
						</FormInput>

						<FormInput v-model="backgroundImageUrl" class="_formBlock">
							<template #prefix><i class="fas fa-link"></i></template>
							<template #label>{{ i18n.ts.backgroundImageUrl }}</template>
						</FormInput>

						<FormInput v-model="themeColor" class="_formBlock">
							<template #prefix><i class="fas fa-palette"></i></template>
							<template #label>{{ i18n.ts.themeColor }}</template>
							<template #caption>#RRGGBB</template>
						</FormInput>

						<FormTextarea v-model="defaultLightTheme" class="_formBlock">
							<template #label>{{ i18n.ts.instanceDefaultLightTheme }}</template>
							<template #caption>{{ i18n.ts.instanceDefaultThemeDescription }}</template>
						</FormTextarea>

						<FormTextarea v-model="defaultDarkTheme" class="_formBlock">
							<template #label>{{ i18n.ts.instanceDefaultDarkTheme }}</template>
							<template #caption>{{ i18n.ts.instanceDefaultThemeDescription }}</template>
						</FormTextarea>
					</FormSection>

					<FormSection>
						<template #label>{{ i18n.ts.files }}</template>

						<FormSwitch v-model="cacheRemoteFiles" class="_formBlock">
							<template #label>{{ i18n.ts.cacheRemoteFiles }}</template>
							<template #caption>{{ i18n.ts.cacheRemoteFilesDescription }}</template>
						</FormSwitch>

						<FormSplit :min-width="280">
							<FormNumberInput v-model="localDriveCapacityMb" type="number" class="_formBlock">
								<template #label>{{ i18n.ts.driveCapacityPerLocalAccount }}</template>
								<template #suffix>MB</template>
								<template #caption>{{ i18n.ts.inMb }}</template>
							</FormNumberInput>

							<FormNumberInput v-model="remoteDriveCapacityMb" type="number" :disabled="!cacheRemoteFiles" class="_formBlock">
								<template #label>{{ i18n.ts.driveCapacityPerRemoteAccount }}</template>
								<template #suffix>MB</template>
								<template #caption>{{ i18n.ts.inMb }}</template>
							</FormNumberInput>
						</FormSplit>
					</FormSection>

					<FormSection>
						<template #label>ServiceWorker</template>

						<FormSwitch v-model="enableServiceWorker" class="_formBlock">
							<template #label>{{ i18n.ts.enableServiceworker }}</template>
							<template #caption>{{ i18n.ts.serviceworkerInfo }}</template>
						</FormSwitch>

						<template v-if="enableServiceWorker">
							<FormInput v-model="swPublicKey" class="_formBlock">
								<template #prefix><i class="fas fa-key"></i></template>
								<template #label>Public key</template>
							</FormInput>

							<FormInput v-model="swPrivateKey" class="_formBlock">
								<template #prefix><i class="fas fa-key"></i></template>
								<template #label>Private key</template>
							</FormInput>
						</template>
					</FormSection>

					<FormSection>
						<template #label>DeepL Translation</template>

						<FormInput v-model="deeplAuthKey" class="_formBlock">
							<template #prefix><i class="fas fa-key"></i></template>
							<template #label>DeepL Auth Key</template>
						</FormInput>
						<FormSwitch v-model="deeplIsPro" class="_formBlock">
							<template #label>Pro account</template>
						</FormSwitch>
					</FormSection>
				</div>
			</FormSuspense>
		</MkSpacer>
	</MkStickyContainer>
</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import XHeader from './_header_.vue';
import FormSwitch from '@/components/form/switch.vue';
import FormInput from '@/components/form/input.vue';
import FormNumberInput from '@/components/form/number-input.vue';
import FormTextarea from '@/components/form/textarea.vue';
import FormInfo from '@/components/MkInfo.vue';
import FormSection from '@/components/form/section.vue';
import FormSplit from '@/components/form/split.vue';
import FormSuspense from '@/components/form/suspense.vue';
import * as os from '@/os';
import { fetchInstance } from '@/instance';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

let name = ref<string | null>(null);
let description = ref<string | null>(null);
let tosUrl = ref<string | null>(null);
let maintainerName = ref<string | null>(null);
let maintainerEmail = ref<string | null>(null);
let iconUrl = ref<string | null>(null);
let bannerUrl = ref<string | null>(null);
let backgroundImageUrl = ref<string | null>(null);
let themeColor: any = ref(null);
let defaultLightTheme: any = ref(null);
let defaultDarkTheme: any = ref(null);
let enableLocalTimeline = ref<boolean>(false);
let enableGlobalTimeline = ref<boolean>(false);
let pinnedUsers = ref<string>('');
let cacheRemoteFiles = ref<boolean>(false);
let localDriveCapacityMb: any = ref(0);
let remoteDriveCapacityMb: any = ref(0);
let enableRegistration = ref<boolean>(false);
let emailRequiredForSignup = ref<boolean>(false);
let enableServiceWorker = ref<boolean>(false);
let swPublicKey: any = ref(null);
let swPrivateKey: any = ref(null);
let deeplAuthKey = ref<string | null>('');
let deeplIsPro = ref<boolean>(false);

async function init() {
	const meta = await os.api('admin/meta');
	name.value = meta.name;
	description.value = meta.description;
	tosUrl.value = meta.tosUrl;
	iconUrl.value = meta.iconUrl;
	bannerUrl.value = meta.bannerUrl;
	backgroundImageUrl.value = meta.backgroundImageUrl;
	themeColor.value = meta.themeColor;
	defaultLightTheme.value = meta.defaultLightTheme;
	defaultDarkTheme.value = meta.defaultDarkTheme;
	maintainerName.value = meta.maintainerName;
	maintainerEmail.value = meta.maintainerEmail;
	enableLocalTimeline.value = !meta.disableLocalTimeline;
	enableGlobalTimeline.value = !meta.disableGlobalTimeline;
	pinnedUsers.value = meta.pinnedUsers.join('\n');
	cacheRemoteFiles.value = meta.cacheRemoteFiles;
	localDriveCapacityMb.value = meta.driveCapacityPerLocalUserMb;
	remoteDriveCapacityMb.value = meta.driveCapacityPerRemoteUserMb;
	enableRegistration.value = !meta.disableRegistration;
	emailRequiredForSignup.value = meta.emailRequiredForSignup;
	enableServiceWorker.value = meta.enableServiceWorker;
	swPublicKey.value = meta.swPublickey;
	swPrivateKey.value = meta.swPrivateKey;
	deeplAuthKey.value = meta.deeplAuthKey;
	deeplIsPro.value = meta.deeplIsPro;
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		name: name.value,
		description: description.value,
		tosUrl: tosUrl.value,
		iconUrl: iconUrl.value,
		bannerUrl: bannerUrl.value,
		backgroundImageUrl: backgroundImageUrl.value,
		themeColor: themeColor.value === '' ? null : themeColor.value,
		defaultLightTheme: defaultLightTheme.value === '' ? null : defaultLightTheme.value,
		defaultDarkTheme: defaultDarkTheme.value === '' ? null : defaultDarkTheme.value,
		maintainerName: maintainerName.value,
		maintainerEmail: maintainerEmail.value,
		disableLocalTimeline: !enableLocalTimeline.value,
		disableGlobalTimeline: !enableGlobalTimeline.value,
		pinnedUsers: pinnedUsers.value.split('\n'),
		cacheRemoteFiles: cacheRemoteFiles.value,
		localDriveCapacityMb: parseInt(localDriveCapacityMb.value, 10),
		remoteDriveCapacityMb: parseInt(remoteDriveCapacityMb.value, 10),
		disableRegistration: !enableRegistration.value,
		emailRequiredForSignup: emailRequiredForSignup.value,
		enableServiceWorker: enableServiceWorker.value,
		swPublicKey: swPublicKey.value,
		swPrivateKey: swPrivateKey.value,
		deeplAuthKey: deeplAuthKey.value,
		deeplIsPro: deeplIsPro.value,
	}).then(() => {
		fetchInstance();
	});
}

const headerActions = computed(() => [{
	asFullButton: true,
	icon: 'fas fa-check',
	text: i18n.ts.save,
	handler: save,
}]);

const headerTabs = computed(() => []);

definePageMetadata({
	title: i18n.ts.general,
	icon: 'fas fa-cog',
});
</script>
