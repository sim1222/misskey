<template>
<!-- eslint-disable vue/no-mutating-props -->
<XContainer :draggable="true" @remove="() => $emit('remove')">
	<template #header><i class="fas fa-sticky-note"></i> {{ value.title }}</template>
	<template #func>
		<button class="_button" @click="rename()">
			<i class="fas fa-pencil-alt"></i>
		</button>
		<button class="_button" @click="add()">
			<i class="fas fa-plus"></i>
		</button>
	</template>

	<section class="ilrvjyvi">
		<XBlocks v-model="children" class="children" :hpml="hpml"/>
	</section>
</XContainer>
</template>

<script lang="ts" setup>
import type { HpmlTypeChecker } from '@/scripts/hpml/type-checker';
import type { PageBlockList } from '@/types/page-editor';
import type { BlockDraftOf } from '@/scripts/hpml/block';



/* eslint-disable vue/no-mutating-props */
import { computed, defineAsyncComponent, inject, onMounted } from 'vue';
import { v4 as uuid } from 'uuid';
import XContainer from '../page-editor.container.vue';
import * as os from '@/os';
import { i18n } from '@/i18n';

const XBlocks = defineAsyncComponent(() => import('../page-editor.blocks.vue'));

const props = withDefaults(defineProps<{
	value?: BlockDraftOf<'section'>,
	hpml: HpmlTypeChecker
}>(), {
	value: () => ({ id: '', type: 'section',
		title: null,
		children: []
	})
});

const children = computed({ get: () => props.value.children ?? (props.value.children = []), set: value => { props.value.children = value; } });

const getPageBlockList = inject<PageBlockList>('getPageBlockList', () => []);

async function rename() {
	const { canceled, result: title } = await os.inputText({
		title: 'Enter title',
		default: props.value.title
	});
	if (canceled) return;
	props.value.title = title;
}

async function add() {
	const { canceled, result: type } = await os.select({
		title: i18n.ts._pages.chooseBlock,
		groupedItems: getPageBlockList()
	});
	if (canceled || type == null) return;

	const id = uuid();
	children.value.push({ id, type });
}

onMounted(() => {
	if (props.value.title == null) {
		rename();
	}
});
defineEmits<{ (event: 'remove'): void }>();
</script>

<style lang="scss" scoped>
.ilrvjyvi {
	> .children {
		padding: 16px;
	}
}
</style>
