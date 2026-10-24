<template>
<!-- eslint-disable vue/no-mutating-props -->
<XContainer :draggable="true" @remove="() => $emit('remove')">
	<template #header><i class="fas fa-align-left"></i> {{ $ts._pages.blocks.text }}</template>

	<section class="vckmsadr">
		<textarea v-model="value.text"></textarea>
	</section>
</XContainer>
</template>

<script lang="ts" setup>
import type { BlockDraftOf } from '@/scripts/hpml/block';



/* eslint-disable vue/no-mutating-props */
import { } from 'vue';
import XContainer from '../page-editor.container.vue';

withDefaults(defineProps<{
	value?: BlockDraftOf<'text'>
}>(), {
	value: () => ({ id: '', type: 'text',
		text: ''
	})
});
defineEmits<{ (event: 'remove'): void }>();
</script>

<style lang="scss" scoped>
.vckmsadr {
	> textarea {
		display: block;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		width: 100%;
		min-width: 100%;
		min-height: 150px;
		border: none;
		box-shadow: none;
		padding: 16px;
		background: transparent;
		color: var(--fg);
		font-size: 14px;
		box-sizing: border-box;
	}
}
</style>
