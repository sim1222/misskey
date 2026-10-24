<template>
<div class="lzyxtsnt">
	<ImgWithBlurhash v-if="image" :hash="image.blurhash" :src="image.url ?? undefined" :alt="image.comment ?? undefined" :title="image.comment ?? undefined" :cover="false"/>
</div>
</template>

<script lang="ts" setup>

import ImgWithBlurhash from '@/components/MkImgWithBlurhash.vue';

import { ImageBlock } from '@/scripts/hpml/block';
import { Hpml } from '@/scripts/hpml/evaluator';

const props = defineProps<{
	block: ImageBlock,
	hpml: Hpml,
}>();

const image = props.hpml.page.attachedFiles.find(x => x.id === props.block.fileId);
</script>

<style lang="scss" scoped>
.lzyxtsnt {
	> img {
		max-width: 100%;
	}
}
</style>
