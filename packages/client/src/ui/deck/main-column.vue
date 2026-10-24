<template>
<XColumn v-if="deckStore.state.alwaysShowMainColumn || mainRouter.currentRoute.value.name !== 'index'" :column="column" :is-stacked="isStacked" @parent-focus="$event => emit('parent-focus', $event)">
	<template #header>
		<template v-if="pageMetadata.current?.value">
			<i :class="pageMetadata.current?.value.icon"></i>
			{{ pageMetadata.current?.value.title }}
		</template>
	</template>

	<RouterView @contextmenu.stop="onContextmenu"/>
</XColumn>
</template>

<script lang="ts" setup>
import { keepsBrowserMenu } from '@/scripts/contextmenu-target';
import { shallowReactive, provide } from 'vue';
import XColumn from './column.vue';
import { deckStore, Column } from '@/ui/deck/deck-store';
import * as os from '@/os';
import { i18n } from '@/i18n';
import { mainRouter } from '@/router';
import { type PageMetadataRef, provideMetadataReceiver } from '@/scripts/page-metadata';

defineProps<{
	column: Column;
	isStacked: boolean;
}>();

const emit = defineEmits<{
	(ev: 'parent-focus', direction: 'up' | 'down' | 'left' | 'right'): void;
}>();

let pageMetadata = shallowReactive<{ current: PageMetadataRef | null }>({ current: null });

provide('router', mainRouter);
provideMetadataReceiver((info) => {
	pageMetadata.current = info;
});

/*
function back() {
	history.back();
}
*/
function onContextmenu(ev: MouseEvent) {
	if (!ev.target) return;

	if (keepsBrowserMenu(ev.target)) return;
	if (window.getSelection()?.toString() !== '') return;
	const path = mainRouter.getCurrentPath();
	os.contextMenu([{
		type: 'label',
		text: path,
	}, {
		icon: 'fas fa-window-maximize',
		text: i18n.ts.openInWindow,
		action: () => {
			os.pageWindow(path);
		},
	}], ev);
}
</script>
