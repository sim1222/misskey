<template>
<div>
	<div>{{ hpml.interpolate(block.title) }}</div>
	<MkRadio v-for="item in block.values" :key="item" :modelValue="value" :value="item" @update:modelValue="updateValue($event)">{{ item }}</MkRadio>
</div>
</template>

<script lang="ts">
import { pageVariable } from '@/scripts/hpml/page-variable';
import { computed, defineComponent, PropType } from 'vue';
import MkRadio from '../form/radio.vue';

import { Hpml } from '@/scripts/hpml/evaluator';
import { RadioButtonVarBlock } from '@/scripts/hpml/block';

export default defineComponent({
	components: {
		MkRadio
	},
	props: {
		block: {
			type: Object as PropType<RadioButtonVarBlock>,
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
