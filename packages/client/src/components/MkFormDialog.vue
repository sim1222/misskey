<template>
<XModalWindow
	ref="dialog"
	:width="450"
	:with-ok-button="true"
	:ok-button-disabled="false"
	@click="cancel()"
	@ok="ok()"
	@close="cancel()"
	@closed="emit('closed')"
>
	<template #header>
		{{ title }}
	</template>

	<MkSpacer :margin-min="20" :margin-max="32">
		<div class="xkpnjxcv _formRoot">
			<template v-for="{ key, item } in fields" :key="key">
				<FormNumberInput v-if="item.type === 'number'" :model-value="number(key)" type="number" :step="item.step || 1" class="_formBlock" @update:model-value="values[key] = $event">
					<template #label>{{ item.label || key }}<span v-if="item.required === false"> ({{ $ts.optional }})</span></template>
					<template v-if="item.description" #caption>{{ item.description }}</template>
				</FormNumberInput>
				<FormInput v-else-if="item.type === 'string' && !item.multiline" :model-value="text(key)" type="text" class="_formBlock" @update:model-value="values[key] = $event">
					<template #label>{{ item.label || key }}<span v-if="item.required === false"> ({{ $ts.optional }})</span></template>
					<template v-if="item.description" #caption>{{ item.description }}</template>
				</FormInput>
				<FormTextarea v-else-if="item.type === 'string' && item.multiline" :model-value="text(key)" class="_formBlock" @update:model-value="values[key] = $event">
					<template #label>{{ item.label || key }}<span v-if="item.required === false"> ({{ $ts.optional }})</span></template>
					<template v-if="item.description" #caption>{{ item.description }}</template>
				</FormTextarea>
				<FormSwitch v-else-if="item.type === 'boolean'" :model-value="boolean(key)" class="_formBlock" @update:model-value="values[key] = $event">
					{{ item.label || key }}
					<template v-if="item.description" #caption>{{ item.description }}</template>
				</FormSwitch>
				<FormSelect v-else-if="item.type === 'enum'" v-model="values[key]" class="_formBlock">
					<template #label>{{ item.label || key }}<span v-if="item.required === false"> ({{ $ts.optional }})</span></template>
					<option v-for="(choice, index) in item.enum" :key="index" :value="choice.value">{{ choice.label }}</option>
				</FormSelect>
				<FormRadios v-else-if="item.type === 'radio'" v-model="values[key]" class="_formBlock" :choices="item.options.map(choice => choice.value)">
					<template #label>{{ item.label || key }}<span v-if="item.required === false"> ({{ $ts.optional }})</span></template>
					<option v-for="(choice, index) in item.options" :key="index" :value="choice.value">{{ choice.label }}</option>
				</FormRadios>
				<FormRange v-else-if="item.type === 'range'" :model-value="number(key) ?? 0" :min="item.min" :max="item.max" :step="item.step" :text-converter="item.textConverter" class="_formBlock" @update:model-value="values[key] = $event">
					<template #label>{{ item.label || key }}<span v-if="item.required === false"> ({{ $ts.optional }})</span></template>
					<template v-if="item.description" #caption>{{ item.description }}</template>
				</FormRange>
				<MkButton v-else-if="item.type === 'button'" class="_formBlock" @click="item.action($event, values)">{{ item.content || key }}</MkButton>
			</template>
		</div>
	</MkSpacer>
</XModalWindow>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import FormInput from './form/input.vue';
import FormNumberInput from './form/number-input.vue';
import FormTextarea from './form/textarea.vue';
import FormSwitch from './form/switch.vue';
import FormSelect from './form/select.vue';
import FormRange from './form/range.vue';
import MkButton from './MkButton.vue';
import FormRadios from './form/radios.vue';
import XModalWindow from '@/components/MkModalWindow.vue';
import type { Form, FormDialogResult } from '@/scripts/form';

const props = defineProps<{ title: string | null; form: Form }>();
const emit = defineEmits<{
 (event: 'done', result: FormDialogResult<Record<string, unknown>>): void;
 (event: 'closed'): void;
}>();
const dialog = ref<InstanceType<typeof XModalWindow>>();
const values = reactive<Record<string, unknown>>(Object.fromEntries(Object.entries(props.form).map(([key, item]) => [key, item.default ?? null])));
const fields = computed(() => Object.entries(props.form).filter(([, item]) => !item.hidden).map(([key, item]) => ({ key, item })));
function text(key: string): string | null { const value = values[key]; return typeof value === 'string' ? value : null; }
function number(key: string): number | null { const value = values[key]; return typeof value === 'number' ? value : null; }
function boolean(key: string): boolean { return values[key] === true; }
function ok() { emit('done', { result: values }); dialog.value?.close(); }
function cancel() { emit('done', { canceled: true }); dialog.value?.close(); }
</script>

<style lang="scss" scoped>
.xkpnjxcv {

}
</style>
