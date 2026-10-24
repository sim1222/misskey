<template>
<XModalWindow
	ref="dialog"
	:width="370"
	:with-ok-button="true"
	@close="dialog?.close()"
	@closed="$emit('closed')"
	@ok="ok()"
>
	<template #header>:{{ emoji.name }}:</template>

	<div class="_monolithic_">
		<div class="yigymqpb _section">
			<img :src="emoji.url" class="img"/>
			<MkInput v-model="name" class="_formBlock">
				<template #label>{{ i18n.ts.name }}</template>
			</MkInput>
			<MkInput v-model="category" class="_formBlock" :datalist="categories">
				<template #label>{{ i18n.ts.category }}</template>
			</MkInput>
			<MkInput v-model="aliases" class="_formBlock">
				<template #label>{{ i18n.ts.tags }}</template>
				<template #caption>{{ i18n.ts.setMultipleBySeparatingWithSpace }}</template>
			</MkInput>
			<MkButton danger @click="del()"><i class="fas fa-trash-alt"></i> {{ i18n.ts.delete }}</MkButton>
		</div>
	</div>
</XModalWindow>
</template>

<script lang="ts" setup>
import type { ApiResponse, ApiRequest } from '@/types/api';
import { ref } from 'vue';
import XModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/form/input.vue';
import * as os from '@/os';

import { i18n } from '@/i18n';
import { emojiCategories } from '@/instance';

const props = defineProps<{
	emoji: ApiResponse<'admin/emoji/list'>[number],
}>();

let dialog = ref<InstanceType<typeof XModalWindow> | null>(null);
let name = ref<string>(props.emoji.name);
let category = ref<string | null>(props.emoji.category);
let aliases = ref<string>(props.emoji.aliases.join(' '));
const categories = emojiCategories.value.filter((value): value is string => value !== null);

const emit = defineEmits<{
	(ev: 'done', v: { deleted?: boolean, updated?: ApiRequest<'admin/emoji/update'> }): void,
	(ev: 'closed'): void
}>();

function ok() {
	update();
}

async function update() {
	await os.apiWithDialog('admin/emoji/update', {
		id: props.emoji.id,
		name: name.value,
		category: category.value,
		aliases: aliases.value.split(' '),
	});

	emit('done', {
		updated: {
			id: props.emoji.id,
			name: name.value,
			category: category.value,
			aliases: aliases.value.split(' '),
		},
	});

	dialog.value?.close();
}

async function del() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.t('removeAreYouSure', { x: name.value }),
	});
	if (canceled) return;

	os.api('admin/emoji/delete', {
		id: props.emoji.id,
	}).then(() => {
		emit('done', {
			deleted: true,
		});
		dialog.value?.close();
	});
}
</script>

<style lang="scss" scoped>
.yigymqpb {
	> .img {
		display: block;
		height: 64px;
		margin: 0 auto;
	}
}
</style>
