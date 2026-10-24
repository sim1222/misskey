<template>
<!-- eslint-disable vue/no-mutating-props -->
<XContainer :draggable="true" @remove="() => $emit('remove')">
	<template #header><i class="fas fa-sticky-note"></i> {{ $ts._pages.blocks.note }}</template>

	<section style="padding: 0 16px 0 16px;">
		<MkInput v-model="id">
			<template #label>{{ $ts._pages.blocks._note.id }}</template>
			<template #caption>{{ $ts._pages.blocks._note.idDescription }}</template>
		</MkInput>
		<MkSwitch v-model="value.detailed"><span>{{ $ts._pages.blocks._note.detailed }}</span></MkSwitch>

		<XNote v-if="note && !value.detailed" :key="note.id + ':normal'" v-model:note="note" style="margin-bottom: 16px;"/>
		<XNoteDetailed v-if="note && value.detailed" :key="note.id + ':detail'" v-model:note="note" style="margin-bottom: 16px;"/>
	</section>
</XContainer>
</template>

<script lang="ts" setup>
import type { entities } from '@/misskey';
import type { BlockDraftOf } from '@/scripts/hpml/block';



/* eslint-disable vue/no-mutating-props */
import { watch, ref } from 'vue';
import XContainer from '../page-editor.container.vue';
import MkInput from '@/components/form/input.vue';
import MkSwitch from '@/components/form/switch.vue';
import XNote from '@/components/MkNote.vue';
import XNoteDetailed from '@/components/MkNoteDetailed.vue';
import * as os from '@/os';

const props = withDefaults(defineProps<{
	value?: BlockDraftOf<'note'>
}>(), {
	value: () => ({ id: '', type: 'note',
		note: null,
		detailed: false
	})
});

let id = ref(props.value.note);
let note = ref<entities.Note | null>(null);

watch(id, async () => {
	if (id.value && (id.value.startsWith('http://') || id.value.startsWith('https://'))) {
		props.value.note = (id.value.endsWith('/') ? id.value.slice(0, -1) : id.value).split('/').pop() ?? null;
	} else {
		props.value.note = id.value;
	}

	note.value = props.value.note ? await os.api('notes/show', { noteId: props.value.note }) : null;
}, {
	immediate: true
});
defineEmits<{ (event: 'remove'): void }>();
</script>
