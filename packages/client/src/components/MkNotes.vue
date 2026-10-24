<template>
<MkPagination ref="pagingComponent" :pagination="pagination" @queue="emit('queue', $event)" @before="emit('before')" @after="emit('after')">
	<template #empty>
		<div class="_fullinfo">
			<img src="https://xn--931a.moe/assets/info.jpg" class="_ghost"/>
			<div>{{ i18n.ts.noNotes }}</div>
		</div>
	</template>

	<template #default="{ items: notes }">
		<div ref="notesRoot" class="giivymft" :class="{ noGap }">
			<XList ref="notes" v-slot="{ item: note }" :items="notes" :direction="pagination.reversed ? 'up' : 'down'" :reversed="pagination.reversed" :no-gap="noGap" :ad="true" class="notes">
				<XNote :key="note._featuredId_ || note._prId_ || note.id" class="qtqtichx" :note="note"/>
			</XList>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import XNote from '@/components/MkNote.vue';
import XList from '@/components/MkDateSeparatedList.vue';
import type { entities } from '@/misskey';
import type { EndpointOf, Paging, PaginationExposed } from '@/types/paging';
import MkPagination from '@/components/MkPagination.vue';
import { i18n } from '@/i18n';

defineProps<{
	pagination: Paging<EndpointOf<entities.Note>>;
	noGap?: boolean;
}>();

const emit = defineEmits<{ (event: 'queue', count: number): void; (event: 'before'): void; (event: 'after'): void }>();
const notesRoot = ref<HTMLElement>();
function focus() { notesRoot.value?.querySelector<HTMLElement>('.qtqtichx')?.focus(); }
const pagingComponent = ref<PaginationExposed<EndpointOf<entities.Note>>>();

defineExpose({
    focus,
	pagingComponent,
});
</script>

<style lang="scss" scoped>
.giivymft {
	&.noGap {
		> .notes {
			background: var(--panel);
		}
	}

	&:not(.noGap) {
		> .notes {
			background: var(--bg);

			.qtqtichx {
				background: var(--panel);
				border-radius: var(--radius);
			}
		}
	}
}
</style>
