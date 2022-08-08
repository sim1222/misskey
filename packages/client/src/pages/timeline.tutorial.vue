<template>
<div class="_card tbkwesmv">
	<div class="_title"><i class="fas fa-info-circle"></i> {{ i18n.ts._tutorial.title }}</div>
	<div v-if="tutorial === 0" class="_content">
		<div>{{ i18n.ts._tutorial.step1_1 }}</div>
		<div>{{ i18n.ts._tutorial.step1_2 }}</div>
		<div>{{ i18n.ts._tutorial.step1_3 }}</div>
	</div>
	<div v-else-if="tutorial === 1" class="_content">
		<div>{{ i18n.ts._tutorial.step2_1 }}</div>
		<div>{{ i18n.ts._tutorial.step2_2 }}</div>
		<MkA class="_link" to="/settings/profile">{{ i18n.ts.editProfile }}</MkA>
	</div>
	<div v-else-if="tutorial === 2" class="_content">
		<div>{{ i18n.ts._tutorial.step3_1 }}</div>
		<div>{{ i18n.ts._tutorial.step3_2 }}</div>
		<div>{{ i18n.ts._tutorial.step3_3 }}</div>
		<small>{{ i18n.ts._tutorial.step3_4 }}</small>
	</div>
	<div v-else-if="tutorial === 3" class="_content">
		<div>{{ i18n.ts._tutorial.step4_1 }}</div>
		<div>{{ i18n.ts._tutorial.step4_2 }}</div>
	</div>
	<div v-else-if="tutorial === 4" class="_content">
		<div>{{ i18n.ts._tutorial.step5_1 }}</div>
		<I18n :src="i18n.ts._tutorial.step5_2" tag="div">
			<template #featured>
				<MkA class="_link" to="/featured">{{ i18n.ts.featured }}</MkA>
			</template>
			<template #explore>
				<MkA class="_link" to="/explore">{{ i18n.ts.explore }}</MkA>
			</template>
		</I18n>
		<div>{{ i18n.ts._tutorial.step5_3 }}</div>
		<small>{{ i18n.ts._tutorial.step5_4 }}</small>
	</div>
	<div v-else-if="tutorial === 5" class="_content">
		<div>{{ i18n.ts._tutorial.step6_1 }}</div>
		<div>{{ i18n.ts._tutorial.step6_2 }}</div>
		<div>{{ i18n.ts._tutorial.step6_3 }}</div>
	</div>
	<div v-else-if="tutorial === 6" class="_content">
		<div>{{ i18n.ts._tutorial.step7_1 }}</div>
		<I18n :src="i18n.ts._tutorial.step7_2" tag="div">
			<template #help>
				<a href="https://misskey-hub.net/help.html" target="_blank" class="_link">{{ i18n.ts.help }}</a>
			</template>
		</I18n>
		<div>{{ i18n.ts._tutorial.step7_3 }}</div>
	</div>
	<div v-else-if="tutorial === 7" class="_content">
		<div>{{ $ts._tutorial.step8_1 }}</div>
		<div>{{ $ts._tutorial.step8_2 }}</div>
		<div>{{ $ts._tutorial.step8_3 }}</div>
		<div>{{ $ts._tutorial.step8_4 }}</div>
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
	<div class="_footer navigation">
		<div class="step">
			<button class="arrow _button" :disabled="tutorial === 0" @click="tutorial--">
				<i class="fas fa-chevron-left"></i>
			</button>
			<span>{{ tutorial + 1 }} / 8</span>
			<button class="arrow _button" :disabled="tutorial === 7" @click="tutorial++">
				<i class="fas fa-chevron-right"></i>
			</button>
		</div>
		<MkButton v-if="tutorial === 7" class="ok" primary @click="tutorial = -1"><i class="fas fa-check"></i> {{ i18n.ts.gotIt }}</MkButton>
		<MkButton v-else class="ok" primary @click="tutorial++"><i class="fas fa-check"></i> {{ i18n.ts.next }}</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onActivated, ref, watch } from 'vue';
import MkButton from '@/components/ui/button.vue';
import { i18n } from '@/i18n';
import { defaultStore, ColdDeviceStorage } from '@/store';
import FormSwitch from '@/components/form/switch.vue';
import FormSelect from '@/components/form/select.vue';
import { fetchThemes, getThemes } from '@/theme-store';
import { getBuiltinThemesRef } from '@/scripts/theme';
import { uniqueBy } from '@/scripts/array';
import { isDeviceDarkmode } from '@/scripts/is-device-darkmode';

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

<style lang="scss" scoped>
.tbkwesmv {
	> ._content {
		> small {
			opacity: 0.7;
		}
	}

	> .navigation {
		display: flex;
		flex-direction: row;
		align-items: baseline;

		> .step {
			> .arrow {
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

			> span {
				margin: 0 4px;
			}
		}

		> .ok {
			margin-left: auto;
		}
	}
}
</style>
