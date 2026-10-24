<template>
<InputBase ref="input" v-bind="{ ...$attrs, ...props }" @change="emit('change', $event)" @keydown="emit('keydown', $event)" @enter="emit('enter')" @update:model-value="updated">
 <template #label><slot name="label"></slot></template>
 <template #prefix><slot name="prefix"></slot></template>
 <template #suffix><slot name="suffix"></slot></template>
 <template #caption><slot name="caption"></slot></template>
</InputBase>
</template>
<script lang="ts" setup generic="T extends string | null | undefined">
import { shallowRef } from 'vue';
import InputBase from './input.base.vue';
import type { InputCommonProps, InputValue, InputExpose, TextInputType } from '@/types/input';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<InputCommonProps & { modelValue: T; type?: TextInputType }>(), { autocomplete: 'on' });
const emit = defineEmits<{
 (event: 'change', value: Event): void;
 (event: 'keydown', value: KeyboardEvent): void;
 (event: 'enter'): void;
 (event: 'update:modelValue', value: string | T): void;
}>();
const input = shallowRef<InputExpose>();
function updated(value: InputValue): void {
 if (typeof value === 'string') emit('update:modelValue', value);
 else if (value == null && value === props.modelValue) emit('update:modelValue', props.modelValue);
 else throw new TypeError('Text input emitted a non-text value');
}
defineExpose<InputExpose>({ focus: () => input.value?.focus(), getInputElement: () => input.value?.getInputElement() });
</script>
