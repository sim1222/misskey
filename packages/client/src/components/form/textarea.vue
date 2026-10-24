<template>
<div class="adhpbeos">
	<div class="label" @click="focus"><slot name="label"></slot></div>
	<div class="input" :class="{ disabled, focused, tall, pre }">
		<textarea
			ref="inputEl"
			v-model="v"
			v-adaptive-border
			:class="{ code, _monospace: code }"
			:disabled="disabled"
			:required="required"
			:readonly="readonly"
			:placeholder="placeholder"
			:autocomplete="autocomplete"
			:spellcheck="spellcheck"
			@focus="focused = true"
			@blur="focused = false"
			@keydown="onKeydown($event)"
			@input="onInput"
		></textarea>
	</div>
	<div class="caption"><slot name="caption"></slot></div>

	<MkButton v-if="manualSave && changed" primary class="save" @click="updated"><i class="fas fa-save"></i> {{ i18n.ts.save }}</MkButton>
</div>
</template>

<script lang="ts" setup generic="T extends string | null | undefined">
import { onMounted, nextTick, ref, shallowReactive, computed, watch, toRefs, type TextareaHTMLAttributes } from 'vue';
import { debounce } from 'throttle-debounce';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n';

const props = defineProps<{
 modelValue: T; type?: string; required?: boolean; readonly?: boolean; disabled?: boolean;
 pattern?: string; placeholder?: string; autofocus?: boolean;
 autocomplete?: TextareaHTMLAttributes['autocomplete']; spellcheck?: TextareaHTMLAttributes['spellcheck'];
 code?: boolean; tall?: boolean; pre?: boolean; debounce?: boolean; manualSave?: boolean;
}>();
const emit = defineEmits<{
 (event: 'change', value: Event): void;
 (event: 'keydown', value: KeyboardEvent): void;
 (event: 'enter'): void;
 (event: 'update:modelValue', value: string | T): void;
}>();
const { modelValue, autofocus } = toRefs(props);
const state = shallowReactive<{ value: string | T }>({ value: modelValue.value });
const v = computed<string | T>({ get: () => state.value, set: value => { state.value = value; } });
const focused = ref(false);
const changed = ref(false);
const invalid = ref(false);

const inputEl = ref<HTMLTextAreaElement | null>(null);
const focus = () => inputEl.value?.focus();
function onInput(event: Event) { changed.value = true; emit('change', event); }
function onKeydown(event: KeyboardEvent) { emit('keydown', event); if (event.code === 'Enter') emit('enter'); }
function updated() { changed.value = false; emit('update:modelValue', v.value); }
const debouncedUpdated = debounce(1000, updated);
watch(modelValue, value => { v.value = value; });
watch(v, () => {
 if (!props.manualSave) { if (props.debounce) debouncedUpdated(); else updated(); }
 if (inputEl.value) invalid.value = inputEl.value.validity.badInput;
});
onMounted(() => { nextTick(() => { if (autofocus?.value) focus(); }); });
defineExpose({ focus });
</script>

<style lang="scss" scoped>
.adhpbeos {
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

		> textarea {
			appearance: none;
			-webkit-appearance: none;
			display: block;
			width: 100%;
			min-width: 100%;
			max-width: 100%;
			min-height: 130px;
			margin: 0;
			padding: 12px;
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

		&.focused {
			> textarea {
				border-color: var(--accent) !important;
			}
		}

		&.disabled {
			opacity: 0.7;

			&, * {
				cursor: not-allowed !important;
			}
		}

		&.tall {
			> textarea {
				min-height: 200px;
			}
		}

		&.pre {
			> textarea {
				white-space: pre;
			}
		}
	}

	> .save {
		margin: 8px 0 0 0;
	}
}
</style>
