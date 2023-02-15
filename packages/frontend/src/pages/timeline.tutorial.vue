<template>
<div :class="$style.container">
	<div :class="$style.title">
		<div :class="$style.titleText"><i class="ti ti-info-circle"></i> {{ i18n.ts._tutorial.title }}</div>
		<div :class="$style.step">
			<button class="_button" :class="$style.stepArrow" :disabled="tutorial === 0" @click="tutorial--">
				<i class="ti ti-chevron-left"></i>
			</button>
			<span :class="$style.stepNumber">{{ tutorial + 1 }} / {{ tutorialsNumber }}</span>
			<button class="_button" :class="$style.stepArrow" :disabled="tutorial === tutorialsNumber - 1" @click="tutorial++">
				<i class="ti ti-chevron-right"></i>
			</button>
		</div>
	</div>
	<div v-if="tutorial === 0" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step1_1 }}</div>
		<div>{{ i18n.ts._tutorial.step1_2 }}</div>
		<div>{{ i18n.ts._tutorial.step1_3 }}</div>
	</div>
	<div v-else-if="tutorial === 1" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step2_1 }}</div>
		<div>{{ i18n.ts._tutorial.step2_2 }}</div>
		<MkA class="_link" to="/settings/profile">{{ i18n.ts.editProfile }}</MkA>
	</div>
	<div v-else-if="tutorial === 2" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step3_1 }}</div>
		<div>{{ i18n.ts._tutorial.step3_2 }}</div>
		<div>{{ i18n.ts._tutorial.step3_3 }}</div>
		<small :class="$style.small">{{ i18n.ts._tutorial.step3_4 }}</small>
	</div>
	<div v-else-if="tutorial === 3" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step4_1 }}</div>
		<div>{{ i18n.ts._tutorial.step4_2 }}</div>
	</div>
	<div v-else-if="tutorial === 4" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step5_1 }}</div>
		<I18n :src="i18n.ts._tutorial.step5_2" tag="div">
			<template #featured>
				<MkA class="_link" to="/explore">{{ i18n.ts.featured }}</MkA>
			</template>
			<template #explore>
				<MkA class="_link" to="/explore#users">{{ i18n.ts.explore }}</MkA>
			</template>
		</I18n>
		<div>{{ i18n.ts._tutorial.step5_3 }}</div>
		<small :class="$style.small">{{ i18n.ts._tutorial.step5_4 }}</small>
	</div>
	<div v-else-if="tutorial === 5" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step6_1 }}</div>
		<div>{{ i18n.ts._tutorial.step6_2 }}</div>
		<div>{{ i18n.ts._tutorial.step6_3 }}</div>
	</div>
	<div v-else-if="tutorial === 6" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step7_1 }}</div>
		<I18n :src="i18n.ts._tutorial.step7_2" tag="div">
			<template #help>
				<a href="https://misskey-hub.net/help.html" target="_blank" class="_link">{{ i18n.ts.help }}</a>
			</template>
		</I18n>
		<div>{{ i18n.ts._tutorial.step7_3 }}</div>
	</div>
	<div v-else-if="tutorial === 7" :class="$style.body">
		<div>{{ i18n.ts._tutorial.step8_1 }}</div>
		<div>{{ i18n.ts._tutorial.step8_2 }}</div>
		<small :class="$style.small">{{ i18n.ts._tutorial.step8_3 }}</small>
	</div>
	<div v-else-if="tutorial === 8" :class="$style.body">
		<div>{{ $ts._tutorial.step9_1 }}</div>
		<div>{{ $ts._tutorial.step9_2 }}</div>
		<div>{{ $ts._tutorial.step9_3 }}</div>
		<div>{{ $ts._tutorial.step9_4 }}</div>
		<FormSwitch v-model="useBlurEffect" class="_formBlock">{{ i18n.ts.useBlurEffect }}</FormSwitch>
		<FormSwitch v-model="useBlurEffectForModal" class="_formBlock">{{ i18n.ts.useBlurEffectForModal }}</FormSwitch>
		<template v-if="darkMode">
			<FormSelect v-model="darkThemeId" class="_formBlock">
				<template #label>{{ $ts.themeForDarkMode }}</template>
				<template #prefix><i class="fas fa-moon"></i></template>
				<optgroup :label="$ts.darkThemes">
					<option v-for="x in darkThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
				<optgroup :label="$ts.lightThemes">
					<option v-for="x in lightThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
			</FormSelect>
			<FormSelect v-model="lightThemeId" class="_formBlock">
				<template #label>{{ $ts.themeForLightMode }}</template>
				<template #prefix><i class="fas fa-sun"></i></template>
				<optgroup :label="$ts.lightThemes">
					<option v-for="x in lightThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
				<optgroup :label="$ts.darkThemes">
					<option v-for="x in darkThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
			</FormSelect>
		</template>
		<template v-else>
			<FormSelect v-model="lightThemeId" class="_formBlock">
				<template #label>{{ $ts.themeForLightMode }}</template>
				<template #prefix><i class="fas fa-sun"></i></template>
				<optgroup :label="$ts.lightThemes">
					<option v-for="x in lightThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
				<optgroup :label="$ts.darkThemes">
					<option v-for="x in darkThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
			</FormSelect>
			<FormSelect v-model="darkThemeId" class="_formBlock">
				<template #label>{{ $ts.themeForDarkMode }}</template>
				<template #prefix><i class="fas fa-moon"></i></template>
				<optgroup :label="$ts.darkThemes">
					<option v-for="x in darkThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
				<optgroup :label="$ts.lightThemes">
					<option v-for="x in lightThemes" :key="x.id" :value="x.id">{{ x.name }}</option>
				</optgroup>
			</FormSelect>
		</template>
	</div>

	<div :class="$style.footer">
		<template v-if="tutorial === tutorialsNumber - 2">
			<MkPushNotificationAllowButton :class="$style.footerItem" primary show-only-to-register @click="tutorial++"/>
			<MkButton :class="$style.footerItem" :primary="false" @click="tutorial++">{{ i18n.ts.noThankYou }}</MkButton>
		</template>
		<template v-else-if="tutorial === tutorialsNumber - 1">
			<MkButton :class="$style.footerItem" primary @click="tutorial = -1"><i class="ti ti-check"></i> {{ i18n.ts.gotIt }}</MkButton>
		</template>
		<template v-else>
			<MkButton :class="$style.footerItem" primary @click="tutorial++"><i class="ti ti-check"></i> {{ i18n.ts.next }}</MkButton>
		</template>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onActivated, ref, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkPushNotificationAllowButton from '@/components/MkPushNotificationAllowButton.vue';
import { defaultStore, ColdDeviceStorage } from '@/store';
import { i18n } from '@/i18n';
import FormSwitch from '@/components/MkSwitch.vue';
import FormSelect from '@/components/MkSelect.vue';
import { getBuiltinThemesRef } from '@/scripts/theme';
import { fetchThemes, getThemes } from '@/theme-store';
import { uniqueBy } from '@/scripts/array';
import { isDeviceDarkmode } from '@/scripts/is-device-darkmode';


const tutorialsNumber = 9;

const tutorial = computed({
	get() { return defaultStore.reactiveState.tutorial.value || 0; },
	set(value) { defaultStore.set('tutorial', value); },
});

const useBlurEffectForModal = computed(defaultStore.makeGetterSetter('useBlurEffectForModal'));
const useBlurEffect = computed(defaultStore.makeGetterSetter('useBlurEffect'));

const installedThemes = ref(getThemes());
const builtinThemes = getBuiltinThemesRef();
const instanceThemes = [];

const themes = computed(() => uniqueBy([...instanceThemes, ...builtinThemes.value, ...installedThemes.value], theme => theme.id));
const darkThemes = computed(() => themes.value.filter(t => t.base === 'dark' || t.kind === 'dark'));
const lightThemes = computed(() => themes.value.filter(t => t.base === 'light' || t.kind === 'light'));
const darkTheme = ColdDeviceStorage.ref('darkTheme');
const darkThemeId = computed({
	get() {
		return darkTheme.value.id;
	},
	set(id) {
		ColdDeviceStorage.set('darkTheme', themes.value.find(x => x.id === id));
	}
});
const lightTheme = ColdDeviceStorage.ref('lightTheme');
const lightThemeId = computed({
	get() {
		return lightTheme.value.id;
	},
	set(id) {
		ColdDeviceStorage.set('lightTheme', themes.value.find(x => x.id === id));
	}
});

const darkMode = computed(defaultStore.makeGetterSetter('darkMode'));
const syncDeviceDarkMode = computed(ColdDeviceStorage.makeGetterSetter('syncDeviceDarkMode'));

watch(syncDeviceDarkMode, () => {
	if (syncDeviceDarkMode.value) {
		defaultStore.set('darkMode', isDeviceDarkmode());
	}
});

onActivated(() => {
	fetchThemes().then(() => {
		installedThemes.value = getThemes();
	});
});

fetchThemes().then(() => {
	installedThemes.value = getThemes();
});

</script>

<style lang="scss" module>
.small {
	opacity: 0.7;
}

.container {
	border: solid 2px var(--accent);
}

.title {
	display: flex;
	flex-wrap: wrap;
	padding: 22px 32px;
	font-weight: bold;

	&Text {
		margin: 4px 0;
		padding-right: 4px;
	}
}

.step {
	margin-left: auto;

	&Arrow {
		padding: 4px;
		&:disabled {
			opacity: 0.5;
		}
		&:first-child {
			padding-right: 8px;
		}
		&:last-child {
			padding-left: 8px;
		}
	}

	&Number {
		font-weight: normal;
		margin: 4px;
	}
}

.body {
	padding: 0 32px;
}

.footer {
	display: flex;
	flex-wrap: wrap;
	flex-direction: row;
	justify-content: right;
	padding: 22px 32px;

	&Item {
		margin: 4px;
	}
}
</style>
