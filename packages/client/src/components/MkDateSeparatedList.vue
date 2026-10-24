<template><RenderList v-bind="$attrs"/></template>
<script lang="ts" setup generic="T extends { id: string; createdAt: string; _shouldInsertAd_?: boolean }">
import { h, createVNode, TransitionGroup, defineComponent, mergeProps, type VNode } from 'vue';
import MkAd from '@/components/global/MkAd.vue';
import { i18n } from '@/i18n';
import { defaultStore } from '@/store';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{
 items: T[]; direction?: string; reversed?: boolean; noGap?: boolean; ad?: boolean;
}>(), { direction: 'down', reversed: false, noGap: false, ad: false });
const slots = defineSlots<{ default(props: { item: T }): VNode[] }>();
function getDateText(time: string): string {
 const date = new Date(time);
 return i18n.t('monthAndDay', { month: String(date.getMonth() + 1), day: String(date.getDate()) });
}
function renderChildren() {
 return props.items.map((item, index) => {
  const el = slots.default({ item })[0];
  if (!el) return;
  if (el.key == null && item.id) el.key = item.id;
  const next = props.items[index + 1];
  if (next && new Date(item.createdAt).getDate() !== new Date(next.createdAt).getDate()) {
   return [el, h('div', { class: 'separator', key: item.id + ':separator' }, h('p', { class: 'date' }, [
    h('span', [h('i', { class: 'fas fa-angle-up icon' }), getDateText(item.createdAt)]),
    h('span', [getDateText(next.createdAt), h('i', { class: 'fas fa-angle-down icon' })]),
   ]))];
  }
  return props.ad && item._shouldInsertAd_
   ? [h(MkAd, { class: 'a', key: item.id + ':ad', prefer: ['horizontal', 'horizontal-big'] }), el]
   : el;
 });
}
const initiallyEmpty = props.items.length === 0;
const RenderList = defineComponent({
 inheritAttrs: false,
 setup(_props, { attrs }) {
  return () => initiallyEmpty ? undefined : defaultStore.state.animation
   ? createVNode(TransitionGroup, mergeProps({ class: 'sqadhkmv' + (props.noGap ? ' noGap' : ''), name: 'list', tag: 'div', 'data-direction': props.direction, 'data-reversed': props.reversed ? 'true' : 'false' }, attrs), { default: renderChildren })
   : h('div', mergeProps({ class: 'sqadhkmv' + (props.noGap ? ' noGap' : '') }, attrs), renderChildren());
 },
});
</script>

<style lang="scss">
.sqadhkmv {
	> *:empty {
		display: none;
	}

	> *:not(:last-child) {
		margin-bottom: var(--margin);
	}

	> .list-move {
		transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
	}

	> .list-enter-active {
		transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1);
	}

	&[data-direction="up"] {
		> .list-enter-from {
			opacity: 0;
			transform: translateY(64px);
		}
	}

	&[data-direction="down"] {
		> .list-enter-from {
			opacity: 0;
			transform: translateY(-64px);
		}
	}

	> .separator {
		text-align: center;

		> .date {
			display: inline-block;
			position: relative;
			margin: 0;
			padding: 0 16px;
			line-height: 32px;
			text-align: center;
			font-size: 12px;
			color: var(--dateLabelFg);

			> span {
				&:first-child {
					margin-right: 8px;

					> .icon {
						margin-right: 8px;
					}
				}

				&:last-child {
					margin-left: 8px;

					> .icon {
						margin-left: 8px;
					}
				}
			}
		}
	}

	&.noGap {
		> * {
			margin: 0 !important;
			border: none;
			border-radius: 0;
			box-shadow: none;

			&:not(:last-child) {
				border-bottom: solid 0.5px var(--divider);
			}
		}
	}
}
</style>
