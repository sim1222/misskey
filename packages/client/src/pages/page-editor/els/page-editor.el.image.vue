<template>
<!-- eslint-disable vue/no-mutating-props -->
<XContainer :draggable="true" @remove="() => $emit('remove')">
	<template #header><i class="fas fa-image"></i> {{ $ts._pages.blocks.image }}</template>
	<template #func>
		<button @click="choose()">
			<i class="fas fa-folder-open"></i>
		</button>
	</template>

	<section class="oyyftmcf">
		<MkDriveFileThumbnail v-if="file" class="preview" :file="file" fit="contain" @click="choose()"/>
	</section>
</XContainer>
</template>

<script lang="ts" setup>
import type { BlockDraftOf } from '@/scripts/hpml/block';



/* eslint-disable vue/no-mutating-props */
import { onMounted, ref } from 'vue';
import XContainer from '../page-editor.container.vue';
import MkDriveFileThumbnail from '@/components/MkDriveFileThumbnail.vue';
import * as os from '@/os';

const props = withDefaults(defineProps<{
	value?: BlockDraftOf<'image'>
}>(), {
	value: () => ({ id: '', type: 'image',
		fileId: null
	})
});

let file: any = ref(null);

async function choose() {
	os.selectDriveFile(false).then((fileResponse: any) => {
		file.value = fileResponse;
		props.value.fileId = fileResponse.id;
	});
}

onMounted(async () => {
	if (props.value.fileId == null) {
		await choose();
	} else {
		os.api('drive/files/show', {
			fileId: props.value.fileId
		}).then(fileResponse => {
			file.value = fileResponse;
		});
	}
});
defineEmits<{ (event: 'remove'): void }>();
</script>

<style lang="scss" scoped>
.oyyftmcf {
	> .preview {
		height: 150px;
	}
}
</style>
