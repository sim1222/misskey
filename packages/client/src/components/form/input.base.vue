<template>
<div class="matxzzsk">
	<div class="label" @click="focus"><slot name="label"></slot></div>
	<div class="input" :class="{ inline, disabled, focused }">
		<div ref="prefixEl" class="prefix"><slot name="prefix"></slot></div>
		<input
			ref="inputEl"
			v-model="v"
			v-adaptive-border
			:type="actualType"
			:disabled="disabled"
			:required="required"
			:readonly="readonly"
			:placeholder="placeholder"
			:pattern="pattern"
			:autocomplete="typeof autocomplete === 'boolean' ? autocomplete ? 'on' : 'off' : autocomplete"
			:spellcheck="spellcheck"
			:step="step"
			:list="id"
			@focus="focused = true"
			@blur="focused = false"
			@keydown="onKeydown($event)"
			@input="onInput"
		>
		<datalist v-if="datalist" :id="id">
			<option v-for="data in datalist" :value="data"/>
		</datalist>
		<div ref="suffixEl" class="suffix">
			<slot name="suffix"></slot>
			<button v-if="withPasswordToggle && type === 'password'" class="_button password-toggle" type="button" :disabled="disabled" :aria-pressed="passwordVisible" :title="passwordVisible ? i18n.ts.hidePassword : i18n.ts.showPassword" @mousedown.prevent @click="passwordVisible = !passwordVisible"><i :class="passwordVisible ? 'fas fa-eye-slash' : 'fas fa-eye'"></i></button>
		</div>
	</div>
	<div class="caption"><slot name="caption"></slot></div>

	<MkButton v-if="manualSave && changed" primary class="save" @click="updated"><i class="fas fa-check"></i> {{ i18n.ts.save }}</MkButton>
</div>
</template>

<script lang="ts" setup>
import type { InputCommonProps, InputValue, TextInputType, InputExpose } from '@/types/input';
import { onMounted, nextTick, ref, shallowRef, watch, computed, toRef } from 'vue';
import { debounce } from 'throttle-debounce';
import MkButton from '@/components/MkButton.vue';
import { useInterval } from '@/scripts/use-interval';
import { i18n } from '@/i18n';

const props = withDefaults(defineProps<InputCommonProps & {
 modelValue: InputValue; type?: TextInputType | 'number';
}>(), { autocomplete: 'on' });

const emit = defineEmits<{
	(ev: 'change', _ev: Event): void;
	(ev: 'keydown', _ev: KeyboardEvent): void;
	(ev: 'enter'): void;
	(ev: 'update:modelValue', value: InputValue): void;
}>();

const modelValue = toRef(props, 'modelValue');
const autofocus = toRef(props, 'autofocus');
const v = shallowRef<InputValue>(modelValue.value);
const id = Math.random().toString(); // TODO: uuid?
const passwordVisible = ref(false);
const actualType = computed(() => props.withPasswordToggle && props.type === 'password' && passwordVisible.value ? 'text' : props.type);
const focused = ref(false);
const changed = ref(false);
const invalid = ref(false);
const inputEl = ref<HTMLInputElement>();
const prefixEl = ref<HTMLElement>();
const suffixEl = ref<HTMLElement>();
const height =
	props.small ? 36 :
	props.large ? 40 :
	38;

const focus = () => inputEl.value?.focus();
const onInput = (ev: Event) => {
	changed.value = true;
	emit('change', ev);
};
const onKeydown = (ev: KeyboardEvent) => {
	emit('keydown', ev);

	if (ev.code === 'Enter') {
		emit('enter');
	}
};

const updated = () => {
	changed.value = false;
	if (props.type === 'number') {
		emit('update:modelValue', parseFloat(String(v.value)));
	} else {
		emit('update:modelValue', v.value);
	}
};

const debouncedUpdated = debounce(1000, updated);

watch(modelValue, newValue => {
	v.value = newValue;
});

watch(v, newValue => {
	if (!props.manualSave) {
		if (props.debounce) {
			debouncedUpdated();
		} else {
			updated();
		}
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
defineExpose<InputExpose>({ focus, getInputElement: () => inputEl.value });
</script>

<style lang="scss" scoped>
.matxzzsk {
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

		> input {
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
			transition: border-color 0.1s ease-out;

			&:hover {
				border-color: var(--inputBorderHover) !important;
			}
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

		.password-toggle { pointer-events: auto; }

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
			> input {
				border-color: var(--accent) !important;
				//box-shadow: 0 0 0 4px var(--focus);
			}
		}

		&.disabled {
			opacity: 0.7;

			&, * {
				cursor: not-allowed !important;
			}
		}
	}

	> .save {
		margin: 8px 0 0 0;
	}
}
</style>
