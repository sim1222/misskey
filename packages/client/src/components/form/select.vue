<template>
<div class="vblkjoeq">
	<div class="label" @click="focus"><slot name="label"></slot></div>
	<div ref="container" class="input" :class="{ inline, disabled, focused }" @click.prevent="onClick">
		<div ref="prefixEl" class="prefix"><slot name="prefix"></slot></div>
		<select
			ref="inputEl"
			v-model="v"
			v-adaptive-border
			class="select"
			:disabled="disabled"
			:required="required"
			@focus="focused = true"
			@blur="focused = false"
			@input="onInput"
		>
			<slot></slot>
		</select>
		<div ref="suffixEl" class="suffix"><i class="fas fa-chevron-down"></i></div>
	</div>
	<div class="caption"><slot name="caption"></slot></div>

	<MkButton v-if="manualSave && changed" primary @click="updated"><i class="fas fa-save"></i> {{ i18n.ts.save }}</MkButton>
</div>
</template>

<script lang="ts" setup generic="T">
import { onMounted, nextTick, ref, shallowRef, watch, toRefs, VNode, isVNode, useSlots } from 'vue';
import type { MenuItem } from '@/types/menu';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os';
import { useInterval } from '@/scripts/use-interval';
import { i18n } from '@/i18n';

const props = defineProps<{
	modelValue: T;
	required?: boolean;
	readonly?: boolean;
	disabled?: boolean;
	placeholder?: string;
	autofocus?: boolean;
	inline?: boolean;
	manualSave?: boolean;
	small?: boolean;
	large?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'change', _ev: Event): void;
	(ev: 'update:modelValue', value: T): void;
}>();

const slots = useSlots();

const { modelValue, autofocus } = toRefs(props);
const v = shallowRef<T>(modelValue.value);
const focused = ref(false);
const changed = ref(false);
const invalid = ref(false);

const inputEl = ref<HTMLSelectElement | null>(null);
const prefixEl = ref<HTMLElement | null>(null);
const suffixEl = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);
const height =
	props.small ? 36 :
	props.large ? 40 :
	38;

const focus = () => inputEl.value?.focus();
const onInput = (ev: Event) => {
	changed.value = true;
	emit('change', ev);
};

const updated = () => {
	changed.value = false;
	emit('update:modelValue', v.value);
};

watch(modelValue, newValue => {
	v.value = newValue;
});

watch(v, newValue => {
	if (!props.manualSave) {
		updated();
	}

	if (inputEl.value) invalid.value = inputEl.value.validity.badInput;
});

// このコンポーネントが作成された時、非表示状態である場合がある
// 非表示状態だと要素の幅などは0になってしまうので、定期的に計算する
useInterval(() => {
	if (prefixEl.value) {
		if (prefixEl.value.offsetWidth && inputEl.value) {
			inputEl.value.style.paddingLeft = prefixEl.value.offsetWidth + 'px';
		}
	}
	if (suffixEl.value) {
		if (suffixEl.value.offsetWidth && inputEl.value) {
			inputEl.value.style.paddingRight = suffixEl.value.offsetWidth + 'px';
		}
	}
}, 100, {
	immediate: true,
	afterMounted: true,
});

onMounted(() => {
	nextTick(() => {
		if (autofocus?.value) {
			focus();
		}
	});
});

const onClick = (ev: MouseEvent) => {
	if (props.disabled || props.readonly) return;
	focused.value = true;

	const menu: MenuItem[] = [];
	const options = slots.default?.() ?? [];

	const pushOption = (option: VNode) => {
		menu.push({
			text: typeof option.children === 'string' ? option.children : '',
			active: v.value === option.props?.value,
			action: () => {
				v.value = option.props?.value;
			},
		});
	};

	const scanOptions = (options: VNode[]) => {
		for (const vnode of options) {
			if (vnode.type === 'optgroup') {
				const optgroup = vnode;
				menu.push({
					type: 'label',
					text: String(optgroup.props?.label ?? ''),
				});
				if (Array.isArray(optgroup.children)) scanOptions(optgroup.children.filter(isVNode));
			} else if (Array.isArray(vnode.children)) { // 何故かフラグメントになってくることがある
				const fragment = vnode;
				if (Array.isArray(fragment.children)) scanOptions(fragment.children.filter(isVNode));
			} else if (vnode.props == null) { // v-if で条件が false のときにこうなる
				// nop?
			} else {
				const option = vnode;
				pushOption(option);
			}
		}
	};

	scanOptions(options);

	if (container.value == null) return;
	os.popupMenu(menu, container.value, {
		width: container.value.offsetWidth,
	}).then(() => {
		focused.value = false;
	});
};
</script>

<style lang="scss" scoped>
.vblkjoeq {
	> .label {
		font-size: 0.85em;
		padding: 0 0 8px 0;
		user-select: none;

		&:empty {
			display: none;
		}
	}

	> .caption {
		font-size: 0.85em;
		padding: 8px 0 0 0;
		color: var(--fgTransparentWeak);

		&:empty {
			display: none;
		}
	}

	> .input {
		position: relative;
		cursor: pointer;

		&:hover {
			> .select {
				border-color: var(--inputBorderHover) !important;
			}
		}

		> .select {
			appearance: none;
			-webkit-appearance: none;
			display: block;
			height: v-bind("height + 'px'");
			width: 100%;
			margin: 0;
			padding: 0 12px;
			font: inherit;
			font-weight: normal;
			font-size: 1em;
			color: var(--fg);
			background: var(--panel);
			border: solid 1px var(--panel);
			border-radius: 6px;
			outline: none;
			box-shadow: none;
			box-sizing: border-box;
			cursor: pointer;
			transition: border-color 0.1s ease-out;
			pointer-events: none;
			user-select: none;
		}

		> .prefix,
		> .suffix {
			display: flex;
			align-items: center;
			position: absolute;
			z-index: 1;
			top: 0;
			padding: 0 12px;
			font-size: 1em;
			height: v-bind("height + 'px'");
			pointer-events: none;

			&:empty {
				display: none;
			}

			> * {
				display: inline-block;
				min-width: 16px;
				max-width: 150px;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
		}

		> .prefix {
			left: 0;
			padding-right: 6px;
		}

		> .suffix {
			right: 0;
			padding-left: 6px;
		}

		&.inline {
			display: inline-block;
			margin: 0;
		}

		&.focused {
			> select {
				border-color: var(--accent) !important;
			}
		}

		&.disabled {
			opacity: 0.7;

			&, * {
				cursor: not-allowed !important;
			}
		}
	}
}
</style>
