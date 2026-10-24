<template><RenderTabs v-bind="$attrs"/></template>
<script lang="ts" setup generic="T extends string | null">
import { defineComponent, h, mergeProps, resolveDirective, withDirectives } from 'vue';
defineOptions({ inheritAttrs: false });
const props = defineProps<{ modelValue: T; choices: readonly T[] }>();
const slots = defineSlots<{ default(): import('vue').VNode[] }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: T): void }>();
const RenderTabs = defineComponent({
 inheritAttrs: false,
 setup(_props, { attrs }) {
  return () => {
   const clickAnime = resolveDirective('click-anime');
   const size = resolveDirective('size');
   const children = (slots.default?.() ?? []).flatMap(option => {
    const value = props.choices.find(choice => Object.is(choice, option.props?.value));
    if (value === undefined) return [];
    const content = typeof option.children === 'string' || Array.isArray(option.children) ? option.children : [];
    const button = h('button', { class: ['_button', { active: props.modelValue === value }], key: option.key ?? undefined,
     disabled: props.modelValue === value, onClick: () => emit('update:modelValue', value) }, content);
    return [clickAnime ? withDirectives(button, [[clickAnime]]) : button];
   });
   const root = h('div', mergeProps({ class: 'pxhvhrfw' }, attrs), children);
   return size ? withDirectives(root, [[size, { max: [500] }]]) : root;
  };
 },
});
</script>

<style lang="scss">
.pxhvhrfw {
	display: flex;
	font-size: 90%;

	> button {
		flex: 1;
		padding: 10px 8px;
		border-radius: var(--radius);

		&:disabled {
			opacity: 1 !important;
			cursor: default;
		}

		&.active {
			color: var(--accent);
			background: var(--accentedBg);
		}

		&:not(.active):hover {
			color: var(--fgHighlighted);
			background: var(--panelHighlight);
		}

		&:not(:first-child) {
			margin-left: 8px;
		}

		> .icon {
			margin-right: 6px;
		}
	}

	&.max-width_500px {
		font-size: 80%;

		> button {
			padding: 11px 8px;
		}
	}
}
</style>
