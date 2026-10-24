<template>
<InputBase ref="input" v-bind="{ ...$attrs, ...props }" type="number" @change="emit('change', $event)" @keydown="emit('keydown', $event)" @enter="emit('enter')" @update:model-value="updated">
 <template #label><slot name="label"></slot></template>
 <template #prefix><slot name="prefix"></slot></template>
 <template #suffix><slot name="suffix"></slot></template>
 <template #caption><slot name="caption"></slot></template>
</InputBase>
</template>
<script lang="ts" setup>
import { shallowRef } from 'vue';
import InputBase from './input.base.vue';
import type { InputCommonProps, InputValue, InputExpose } from '@/types/input';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<InputCommonProps & { modelValue: number | null | undefined; type?: 'number' }>(), { autocomplete: 'on' });
const emit = defineEmits<{
 (event: 'change', value: Event): void;
 (event: 'keydown', value: KeyboardEvent): void;
 (event: 'enter'): void;
 (event: 'update:modelValue', value: number): void;
}>();
const input = shallowRef<InputExpose>();
function updated(value: InputValue): void {
 if (typeof value !== 'number') throw new TypeError('Numeric input emitted a non-numeric value');
 emit('update:modelValue', value);
}
defineExpose<InputExpose>({ focus: () => input.value?.focus(), getInputElement: () => input.value?.getInputElement() });
</script>
