<template>
<div>
	<MkTextarea :model-value="value" @update:modelValue="updateValue($event)">
		<template #label>{{ hpml.interpolate(block.text) }}</template>
	</MkTextarea>
</div>
</template>

<script lang="ts">
import { pageVariable } from '@/scripts/hpml/page-variable';
import { computed, defineComponent, PropType } from 'vue';
import MkTextarea from '../form/textarea.vue';

import { Hpml } from '@/scripts/hpml/evaluator';

import { TextInputVarBlock } from '@/scripts/hpml/block';

export default defineComponent({
	components: {
		MkTextarea
	},
	props: {
		block: {
			type: Object as PropType<TextInputVarBlock>,
			required: true
		},
		hpml: {
			type: Object as PropType<Hpml>,
			required: true
		}
	},
	setup(props, ctx) {
		const value = computed(() => {
			const current = pageVariable(props.hpml, props.block.name);
 return typeof current === 'string' || current == null ? current : undefined;
		});

		function updateValue(newValue: string | null | undefined) {
			if (props.block.name == null) return;
			props.hpml.updatePageVar(props.block.name, newValue);
			props.hpml.eval();
		}

		return {
			value,
			updateValue
		};
	}
});
</script>
