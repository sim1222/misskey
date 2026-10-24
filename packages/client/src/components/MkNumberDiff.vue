<template>
<span class="ceaaebcd" :class="{ isPlus, isMinus, isZero }">
	<slot name="before"></slot>{{ isPlus ? '+' : '' }}{{ number(value) }}<slot name="after"></slot>
</span>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
import number from '@/filters/number';

export default defineComponent({
	props: {
		value: {
			type: Number as PropType<number | null>,
			required: true,
		},
	},

	setup(props) {
		const isPlus = computed(() => props.value != null && props.value > 0);
		const isMinus = computed(() => props.value != null && props.value < 0);
		const isZero = computed(() => props.value === 0);
		return {
			isPlus,
			isMinus,
			isZero,
			number,
		};
	},
});
</script>

<style lang="scss" scoped>
.ceaaebcd {
	&.isPlus {
		color: var(--success);
	}

	&.isMinus {
		color: var(--error);
	}

	&.isZero {
		opacity: 0.5;
	}
}
</style>
