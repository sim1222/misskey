<template>
<div>
	<MkInput class="kudkigyw" :model-value="value" type="text" @update:modelValue="updateValue($event)">
		<template #label>{{ hpml.interpolate(block.text) }}</template>
	</MkInput>
</div>
</template>

<script lang="ts">
import { pageVariable } from '@/scripts/hpml/page-variable';
import { computed, defineComponent, PropType } from 'vue';
import MkInput from '../form/input.vue';

import { Hpml } from '@/scripts/hpml/evaluator';
import { TextInputVarBlock } from '@/scripts/hpml/block';

export default defineComponent({
	components: {
		MkInput
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

<style lang="scss" scoped>
.kudkigyw {
	display: inline-block;
	min-width: 300px;
	max-width: 450px;
	margin: 8px 0;
}
</style>
