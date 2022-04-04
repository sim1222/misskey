<template>
<div class="ipledcug">
	<div class="_fullinfo">
		<img src="https://s3.nca10.net/misskey/fa9c9206-933d-4ab9-a091-dfddda1e356a.png" class="_ghost"/>
		<div>{{ $ts.notFoundDescription }}</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import * as symbols from '@/symbols';
import { i18n } from '@/i18n';

defineExpose({
	[symbols.PAGE_INFO]: {
		title: i18n.ts.notFound,
		icon: 'fas fa-exclamation-triangle',
		bg: 'var(--bg)',
	},
});
</script>
