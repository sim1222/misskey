<template>
<div class="zhyxdalp">
	<XValue :value="value"/>
</div>
</template>

<script lang="ts" setup>
import { } from 'vue';
import XValue from './MkObjectView.value.vue';

defineProps<{
	value: Record<string, unknown>;
}>();
</script>

<style lang="scss" scoped>
.zhyxdalp {

}
</style>
