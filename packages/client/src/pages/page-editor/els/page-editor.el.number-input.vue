<template>
<!-- eslint-disable vue/no-mutating-props -->
<XContainer :draggable="true" @remove="() => $emit('remove')">
	<template #header><i class="fas fa-bolt"></i> {{ $ts._pages.blocks.numberInput }}</template>

	<section style="padding: 0 16px 0 16px;">
		<MkInput v-model="value.name">
			<template #prefix><i class="fas fa-magic"></i></template>
			<template #label>{{ $ts._pages.blocks._numberInput.name }}</template>
		</MkInput>
		<MkInput v-model="value.text">
			<template #label>{{ $ts._pages.blocks._numberInput.text }}</template>
		</MkInput>
		<MkNumberInput v-model="value.default" type="number">
			<template #label>{{ $ts._pages.blocks._numberInput.default }}</template>
		</MkNumberInput>
	</section>
</XContainer>
</template>

<script lang="ts" setup>
import type { BlockDraftOf } from '@/scripts/hpml/block';



/* eslint-disable vue/no-mutating-props */
import { } from 'vue';
import XContainer from '../page-editor.container.vue';
import MkInput from '@/components/form/input.vue';
import MkNumberInput from '@/components/form/number-input.vue';

withDefaults(defineProps<{
	value?: BlockDraftOf<'numberInput'>
}>(), {
	value: () => ({ id: '', type: 'numberInput',
		name: ''
	})
});
defineEmits<{ (event: 'remove'): void }>();
</script>
