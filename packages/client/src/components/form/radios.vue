<template><RenderRadios v-bind="$attrs"/></template>
<script lang="ts" setup generic="T">
import { defineComponent, h, isVNode, mergeProps, shallowReactive, watch } from 'vue';
import MkRadio from './radio.vue';
defineOptions({ inheritAttrs: false });
const props = defineProps<{ modelValue: T; choices: readonly T[] }>();
const slots = defineSlots<{ default?(): import('vue').VNode[]; label?(): import('vue').VNode[]; caption?(): import('vue').VNode[] }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: T): void }>();
const state = shallowReactive<{ value: T }>({ value: props.modelValue });
watch(() => state.value, value => emit('update:modelValue', value));
const RenderRadios = defineComponent({
 inheritAttrs: false,
 setup(_props, { attrs }) {
  return () => {
   let options = slots.default?.() ?? [];
   const label = slots.label?.();
   const caption = slots.caption?.();
   if (options.length === 1 && options[0].props == null) options = Array.isArray(options[0].children) ? options[0].children.filter(isVNode) : [];
   return h('div', mergeProps({ class: 'novjtcto' }, attrs), [
    ...(label ? [h('div', { class: 'label' }, [label])] : []),
    h('div', { class: 'body' }, options.flatMap(option => {
     const index = props.choices.findIndex(value => Object.is(value, option.props?.value));
     if (index < 0) return [];
     return [h(MkRadio<T>, { key: option.key ?? undefined, value: props.choices[index], modelValue: state.value,
      'onUpdate:modelValue': (value: T) => { state.value = value; } }, { default: () => option.children })];
    })),
    ...(caption ? [h('div', { class: 'caption' }, [caption])] : []),
   ]);
  };
 },
});
</script>

<style lang="scss">
.novjtcto {
	> .label {
		font-size: 0.85em;
		padding: 0 0 8px 0;
		user-select: none;

		&:empty {
			display: none;
		}
	}

	> .body {
		display: flex;
    gap: 12px;
    flex-wrap: wrap;
	}

	> .caption {
		font-size: 0.85em;
		padding: 8px 0 0 0;
		color: var(--fgTransparentWeak);

		&:empty {
			display: none;
		}
	}
}
</style>
