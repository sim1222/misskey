<template>
<div class="voxdxuby">
	<XNote v-if="note && !block.detailed" :key="note.id + ':normal'" v-model:note="note"/>
	<XNoteDetailed v-if="note && block.detailed" :key="note.id + ':detail'" v-model:note="note"/>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref } from 'vue';
import XNote from '@/components/MkNote.vue';
import XNoteDetailed from '@/components/MkNoteDetailed.vue';
import * as os from '@/os';
import { NoteBlock } from '@/scripts/hpml/block';

export default defineComponent({
	components: {
		XNote,
		XNoteDetailed,
	},
	props: {
		block: {
			type: Object as PropType<NoteBlock>,
			required: true
		}
	},
	setup(props, ctx) {
		const note = ref<import('@/misskey').entities.Note | null>(null);

		onMounted(() => {
			if (!props.block.note) return;
            os.api('notes/show', { noteId: props.block.note })
			.then(result => {
				note.value = result;
			});
		});

		return {
			note
		};
	}
});
</script>

<style lang="scss" scoped>
.voxdxuby {
	margin: 1em 0;
}
</style>
