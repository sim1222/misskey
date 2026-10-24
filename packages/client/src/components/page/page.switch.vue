<template>
<div class="hkcxmtwj">
	<MkSwitch :model-value="value" @update:modelValue="updateValue($event)">{{ hpml.interpolate(block.text) }}</MkSwitch>
</div>
</template>

<script lang="ts">
import { pageVariable } from '@/scripts/hpml/page-variable';
import { computed, defineComponent, PropType } from 'vue';
import MkSwitch from '../form/switch.vue';

import { Hpml } from '@/scripts/hpml/evaluator';
import { SwitchVarBlock } from '@/scripts/hpml/block';

export default defineComponent({
	components: {
		MkSwitch
	},
	props: {
		block: {
			type: Object as PropType<SwitchVarBlock>,
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
 return typeof current === 'boolean' ? current : false;
		});

		function updateValue(newValue: boolean) {
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
.hkcxmtwj {
	display: inline-block;
	margin: 16px auto;

	& + .hkcxmtwj {
		margin-left: 16px;
	}
}
</style>
