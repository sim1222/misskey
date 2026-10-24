<template>
<div class="_formRoot">
	<div :class="$style.buttons">
		<MkButton inline primary @click="saveNew">{{ ts._preferencesBackups.saveNew }}</MkButton>
		<MkButton inline @click="loadFile">{{ ts._preferencesBackups.loadFile }}</MkButton>
	</div>

	<FormSection>
		<template #label>{{ ts._preferencesBackups.list }}</template>
		<template v-if="profiles && Object.keys(profiles).length > 0">
			<div
				v-for="(profile, id) in profiles"
				:key="id"
				class="_formBlock _panel blur"
				:class="$style.profile"
				@click="$event => menu($event, id)"
				@contextmenu.prevent.stop="$event => menu($event, id)"
			>
				<div :class="$style.profileName">{{ profile.name }}</div>
				<div :class="$style.profileTime">{{ t('_preferencesBackups.createdAt', { date: (new Date(profile.createdAt)).toLocaleDateString(), time: (new Date(profile.createdAt)).toLocaleTimeString() }) }}</div>
				<div v-if="profile.updatedAt" :class="$style.profileTime">{{ t('_preferencesBackups.updatedAt', { date: (new Date(profile.updatedAt)).toLocaleDateString(), time: (new Date(profile.updatedAt)).toLocaleTimeString() }) }}</div>
			</div>
		</template>
		<div v-else-if="profiles">
			<MkInfo>{{ ts._preferencesBackups.noBackups }}</MkInfo>
		</div>
		<MkLoading v-else/>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { requireAccount } from '@/account';
const account = requireAccount();

import { computed, onMounted, onUnmounted, useCssModule, ref } from 'vue';
import { v4 as uuid } from 'uuid';
import FormSection from '@/components/form/section.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os';
import { ColdDeviceStorage, defaultStore } from '@/store';
import { unisonReload } from '@/scripts/unison-reload';
import { stream } from '@/stream';

import { i18n } from '@/i18n';
import { version, host } from '@/config';
import { definePageMetadata } from '@/scripts/page-metadata';
const { t, ts } = i18n;

useCssModule();


const scope = ['clientPreferencesProfiles'];

import { defaultStoreSaveKeys, coldDeviceStorageSaveKeys } from '@/scripts/preferences-keys';
import { isPreferencesProfile, isHotPreferences, isColdPreferences, type PreferencesProfile as Profile } from '@/scripts/preferences-profile';
import { toApiError } from '@/types/api-error';

const connection = account && stream.useChannel('main');

let profiles = ref<Record<string, Profile> | null>(null);

os.api('i/registry/get-all', { scope })
	.then(res => {
		const checked: Record<string, Profile> = {};
 for (const [key, value] of Object.entries(res ?? {})) {
 if (isPreferencesProfile(value)) checked[key] = value;
 else console.warn('Invalid preference backup retained in registry', key);
 }
 profiles.value = checked;
	});

function validate(profile: unknown): asserts profile is Profile {
 if (!isPreferencesProfile(profile)) throw new Error(ts._preferencesBackups.invalidFile);
}

function getSettings(): Profile['settings'] {
 const hot = Object.fromEntries(defaultStoreSaveKeys.map(key => [key, defaultStore.state[key]]));
 const cold = Object.fromEntries(coldDeviceStorageSaveKeys.map(key => [key, ColdDeviceStorage.get(key)]));
 if (!isHotPreferences(hot) || !isColdPreferences(cold)) throw new Error('Invalid saved preference types');

	return {
		hot,
		cold,
		fontSize: localStorage.getItem('fontSize'),
		useSystemFont: localStorage.getItem('useSystemFont'),
		wallpaper: localStorage.getItem('wallpaper'),
	};
}

async function saveNew(): Promise<void> {
	if (!profiles.value) return;

	const { canceled, result: name } = await os.inputText({
		title: ts._preferencesBackups.inputName,
	});
	if (canceled || name == null) return;

	if (Object.values(profiles.value).some(x => x.name === name)) {
		return os.alert({
			title: ts._preferencesBackups.cannotSave,
			text: t('_preferencesBackups.nameAlreadyExists', { name }),
		});
	}

	const id = uuid();
	const profile: Profile = {
		name,
		createdAt: (new Date()).toISOString(),
		updatedAt: null,
		misskeyVersion: version,
		host,
		settings: getSettings(),
	};
	await os.apiWithDialog('i/registry/set', { scope, key: id, value: profile });
}

function loadFile(): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.multiple = false;
	input.onchange = async () => {
		if (!profiles.value) return;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];

		if (file.type !== 'application/json') {
			return os.alert({
				type: 'error',
				title: ts._preferencesBackups.cannotLoad,
				text: ts._preferencesBackups.invalidFile,
			});
		}

		let profile: unknown;
		try {
			profile = JSON.parse(await file.text());
			validate(profile);
		} catch (err) {
			return os.alert({
				type: 'error',
				title: ts._preferencesBackups.cannotLoad,
				text: toApiError(err).message,
			});
		}

		const id = uuid();
		await os.apiWithDialog('i/registry/set', { scope, key: id, value: profile });

		// 一応廃棄
		window.__misskey_input_ref__ = null;
	};

	// https://qiita.com/fukasawah/items/b9dc732d95d99551013d
	// iOS Safari で正常に動かす為のおまじない
	window.__misskey_input_ref__ = input;

	input.click();
}

async function applyProfile(id: string): Promise<void> {
	if (!profiles.value) return;

	const profile = profiles.value[id];

	const { canceled: cancel1 } = await os.confirm({
		type: 'warning',
		title: ts._preferencesBackups.apply,
		text: t('_preferencesBackups.applyConfirm', { name: profile.name }),
	});
	if (cancel1) return;

	// TODO: バージョン or ホストが違ったらさらに警告を表示

	const settings = profile.settings;

	// defaultStore
	for (const key of defaultStoreSaveKeys) {
		if (settings.hot[key] !== undefined) {
			defaultStore.set(key, settings.hot[key]);
		}
	}

	// coldDeviceStorage
	for (const key of coldDeviceStorageSaveKeys) {
		if (settings.cold[key] !== undefined) {
			ColdDeviceStorage.set(key, settings.cold[key]);
		}
	}

	// fontSize
	if (settings.fontSize) {
		localStorage.setItem('fontSize', settings.fontSize);
	} else {
		localStorage.removeItem('fontSize');
	}

	// useSystemFont
	if (settings.useSystemFont) {
		localStorage.setItem('useSystemFont', settings.useSystemFont);
	} else {
		localStorage.removeItem('useSystemFont');
	}

	// wallpaper
	if (settings.wallpaper != null) {
		localStorage.setItem('wallpaper', settings.wallpaper);
	} else {
		localStorage.removeItem('wallpaper');
	}

	const { canceled: cancel2 } = await os.confirm({
		type: 'info',
		text: ts.reloadToApplySetting,
	});
	if (cancel2) return;

	unisonReload();
}

async function deleteProfile(id: string): Promise<void> {
	if (!profiles.value) return;

	const { canceled } = await os.confirm({
		type: 'info',
		title: ts.delete,
		text: t('deleteAreYouSure', { x: profiles.value[id].name }),
	});
	if (canceled) return;

	await os.apiWithDialog('i/registry/remove', { scope, key: id });
	delete profiles.value[id];
}

async function save(id: string): Promise<void> {
	if (!profiles.value) return;

	const { name, createdAt } = profiles.value[id];

	const { canceled } = await os.confirm({
		type: 'info',
		title: ts._preferencesBackups.save,
		text: t('_preferencesBackups.saveConfirm', { name }),
	});
	if (canceled) return;

	const profile: Profile = {
		name,
		createdAt,
		updatedAt: (new Date()).toISOString(),
		misskeyVersion: version,
		host,
		settings: getSettings(),
	};
	await os.apiWithDialog('i/registry/set', { scope, key: id, value: profile });
}

async function rename(id: string): Promise<void> {
	if (!profiles.value) return;

	const { canceled: cancel1, result: name } = await os.inputText({
		title: ts._preferencesBackups.inputName,
	});
	if (cancel1 || name == null || profiles.value[id].name === name) return;

	if (Object.values(profiles.value).some(x => x.name === name)) {
		return os.alert({
			title: ts._preferencesBackups.cannotSave,
			text: t('_preferencesBackups.nameAlreadyExists', { name }),
		});
	}

	const registry = Object.assign({}, { ...profiles.value[id] });

	const { canceled: cancel2 } = await os.confirm({
		type: 'info',
		title: ts.rename,
		text: t('_preferencesBackups.renameConfirm', { old: registry.name, new: name }),
	});
	if (cancel2) return;

	registry.name = name;
	await os.apiWithDialog('i/registry/set', { scope, key: id, value: registry });
}

function menu(ev: MouseEvent, profileId: string) {
	if (!profiles.value) return;

	return os.popupMenu([{
		text: ts._preferencesBackups.apply,
		icon: 'fas fa-circle-down',
		action: () => applyProfile(profileId),
	}, {
		type: 'a',
		text: ts.download,
		icon: 'fas fa-download',
		href: URL.createObjectURL(new Blob([JSON.stringify(profiles.value[profileId], null, 2)], { type: 'application/json' })),
		download: `${profiles.value[profileId].name}.json`,
	}, null, {
		text: ts.rename,
		icon: 'fas fa-i-cursor',
		action: () => rename(profileId),
	}, {
		text: ts._preferencesBackups.save,
		icon: 'fas fa-floppy-disk',
		action: () => save(profileId),
	}, null, {
		text: ts.delete,
		icon: 'fas fa-trash-can',
		action: () => deleteProfile(profileId),
		danger: true,
	}], ev.currentTarget ?? ev.target);
}

onMounted(() => {
	// streamingのuser storage updateイベントを監視して更新
	connection?.on('registryUpdated', ({ scope: recievedScope, key, value }) => {
		if (!recievedScope || recievedScope.length !== scope.length || recievedScope[0] !== scope[0]) return;
		if (!profiles.value) return;

		if (isPreferencesProfile(value)) profiles.value[key] = value;
	});
});

onUnmounted(() => {
	connection?.off('registryUpdated');
});

definePageMetadata(computed(() => ({
	title: ts.preferencesBackups,
	icon: 'fas fa-floppy-disk',
	bg: 'var(--bg)',
})));
</script>

<style lang="scss" module>
.buttons {
	display: flex;
	gap: var(--margin);
	flex-wrap: wrap;
}

.profile {
	padding: 20px;
	cursor: pointer;

	&Name {
		font-weight: 700;
	}

	&Time {
		font-size: .85em;
		opacity: .7;
	}
}
</style>
