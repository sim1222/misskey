<template>
<div class="ipledcug">
	<div class="_fullinfo">
		<img src="https://s3.nca10.net/misskey/5c92993f-9d73-4fa8-b493-db0c4e262f18.png" class="_ghost"/>
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
