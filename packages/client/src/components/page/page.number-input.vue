<template>
<div>
	<MkNumberInput class="kudkigyw" :model-value="value" type="number" @update:modelValue="updateValue($event)">
		<template #label>{{ hpml.interpolate(block.text) }}</template>
	</MkNumberInput>
</div>
</template>

<script lang="ts">
import { pageVariable } from '@/scripts/hpml/page-variable';
import { computed, defineComponent, PropType } from 'vue';
import MkInput from '../form/input.vue';
import MkNumberInput from '../form/number-input.vue';

import { Hpml } from '@/scripts/hpml/evaluator';
import { NumberInputVarBlock } from '@/scripts/hpml/block';

export default defineComponent({
	components: {
		MkNumberInput,
		MkInput
	},
	props: {
		block: {
			type: Object as PropType<NumberInputVarBlock>,
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
 return typeof current === 'number' || current == null ? current : undefined;
		});

		function updateValue(newValue: number) {
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

<style lang="scss" scoped>
.kudkigyw {
	display: inline-block;
	min-width: 300px;
	max-width: 450px;
	margin: 8px 0;
}
</style>
