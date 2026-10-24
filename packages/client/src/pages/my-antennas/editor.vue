<template>
<div class="shaynizk">
	<div class="form">
		<MkInput v-model="name" class="_formBlock">
			<template #label>{{ i18n.ts.name }}</template>
		</MkInput>
		<MkSelect v-model="src" class="_formBlock">
			<template #label>{{ i18n.ts.antennaSource }}</template>
			<option value="all">{{ i18n.ts._antennaSources.all }}</option>
			<!--<option value="home">{{ i18n.ts._antennaSources.homeTimeline }}</option>-->
			<option value="users">{{ i18n.ts._antennaSources.users }}</option>
			<!--<option value="list">{{ i18n.ts._antennaSources.userList }}</option>-->
			<!--<option value="group">{{ i18n.ts._antennaSources.userGroup }}</option>-->
		</MkSelect>
		<MkSelect v-if="src === 'list'" v-model="userListId" class="_formBlock">
			<template #label>{{ i18n.ts.userList }}</template>
			<option v-for="list in userLists" :key="list.id" :value="list.id">{{ list.name }}</option>
		</MkSelect>
		<MkSelect v-else-if="src === 'group'" v-model="userGroupId" class="_formBlock">
			<template #label>{{ i18n.ts.userGroup }}</template>
			<option v-for="group in userGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
		</MkSelect>
		<MkTextarea v-else-if="src === 'users'" v-model="users" class="_formBlock">
			<template #label>{{ i18n.ts.users }}</template>
			<template #caption>{{ i18n.ts.antennaUsersDescription }} <button class="_textButton" @click="addUser">{{ i18n.ts.addUser }}</button></template>
		</MkTextarea>
		<MkSwitch v-model="withReplies" class="_formBlock">{{ i18n.ts.withReplies }}</MkSwitch>
		<MkTextarea v-model="keywords" class="_formBlock">
			<template #label>{{ i18n.ts.antennaKeywords }}</template>
			<template #caption>{{ i18n.ts.antennaKeywordsDescription }}</template>
		</MkTextarea>
		<MkTextarea v-model="excludeKeywords" class="_formBlock">
			<template #label>{{ i18n.ts.antennaExcludeKeywords }}</template>
			<template #caption>{{ i18n.ts.antennaKeywordsDescription }}</template>
		</MkTextarea>
		<MkSwitch v-model="caseSensitive" class="_formBlock">{{ i18n.ts.caseSensitive }}</MkSwitch>
		<MkSwitch v-model="withFile" class="_formBlock">{{ i18n.ts.withFileAntenna }}</MkSwitch>
		<MkSwitch v-model="notify" class="_formBlock">{{ i18n.ts.notifyAntenna }}</MkSwitch>
	</div>
	<div class="actions">
		<MkButton inline primary @click="saveAntenna()"><i class="fas fa-save"></i> {{ i18n.ts.save }}</MkButton>
		<MkButton v-if="antenna.id != null" inline danger @click="deleteAntenna()"><i class="fas fa-trash"></i> {{ i18n.ts.delete }}</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { watch, ref } from 'vue';
import * as Acct from 'misskey-js/built/acct';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/form/input.vue';
import MkTextarea from '@/components/form/textarea.vue';
import MkSelect from '@/components/form/select.vue';
import MkSwitch from '@/components/form/switch.vue';
import * as os from '@/os';
import { i18n } from '@/i18n';

const props = defineProps<{
	antenna: import('@/types/api').ApiRequest<'antennas/create'> & { id?: string | null }
}>();

const emit = defineEmits<{
	(ev: 'created'): void,
	(ev: 'updated'): void,
	(ev: 'deleted'): void,
}>();

let name = ref<string>(props.antenna.name);
let src = ref<import('@/misskey').entities.Antenna['src']>(props.antenna.src);
let userListId = ref(props.antenna.userListId);
let userGroupId = ref(props.antenna.userGroupId);
let users = ref<string>(props.antenna.users.join('\n'));
let keywords = ref<string>(props.antenna.keywords.map(x => x.join(' ')).join('\n'));
let excludeKeywords = ref<string>(props.antenna.excludeKeywords.map(x => x.join(' ')).join('\n'));
let caseSensitive = ref<boolean>(props.antenna.caseSensitive);
let withReplies = ref<boolean>(props.antenna.withReplies);
let withFile = ref<boolean>(props.antenna.withFile);
let notify = ref<boolean>(props.antenna.notify);
let userLists = ref<import('@/misskey').entities.UserList[] | null>(null);
let userGroups = ref<import('@/misskey').entities.UserGroup[] | null>(null);

watch(() => src.value, async () => {
	if (src.value === 'list' && userLists.value === null) {
		userLists.value = await os.api('users/lists/list');
	}

	if (src.value === 'group' && userGroups.value === null) {
		const groups1 = await os.api('users/groups/owned');
		const groups2 = await os.api('users/groups/joined');

		userGroups.value = [...groups1, ...groups2];
	}
});

async function saveAntenna() {
	const antennaData = {
		name: name.value,
		src: src.value,
		userListId: userListId.value,
		userGroupId: userGroupId.value,
		withReplies: withReplies.value,
		withFile: withFile.value,
		notify: notify.value,
		caseSensitive: caseSensitive.value,
		users: users.value.trim().split('\n').map(x => x.trim()),
		keywords: keywords.value.trim().split('\n').map(x => x.trim().split(' ')),
		excludeKeywords: excludeKeywords.value.trim().split('\n').map(x => x.trim().split(' ')),
	};

	if (props.antenna.id == null) {
		await os.apiWithDialog('antennas/create', antennaData);
		emit('created');
	} else {
		await os.apiWithDialog('antennas/update', { ...antennaData, antennaId: props.antenna.id });
		emit('updated');
	}
}

async function deleteAntenna() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.t('removeAreYouSure', { x: props.antenna.name }),
	});
	if (canceled || props.antenna.id == null) return;

	await os.api('antennas/delete', {
		antennaId: props.antenna.id,
	});

	os.success();
	emit('deleted');
}

function addUser() {
	os.selectUser().then(user => {
		users.value = users.value.trim();
		users.value += '\n@' + Acct.toString(user as any);
		users.value = users.value.trim();
	});
}
</script>

<style lang="scss" scoped>
.shaynizk {
	> .form {
		padding: 32px;
	}

	> .actions {
		padding: 24px 32px;
		border-top: solid 0.5px var(--divider);
	}
}
</style>
