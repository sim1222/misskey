<template>
<div class="mk-app">
	<RouterView/>

	<XCommon/>
</div>
</template>

<script lang="ts" setup>
import { shallowReactive } from 'vue';
import { provide } from 'vue';
import XCommon from './_common_/common.vue';
import { mainRouter } from '@/router';
import { type PageMetadataRef, provideMetadataReceiver } from '@/scripts/page-metadata';
import { instanceName } from '@/config';

let pageMetadata = shallowReactive<{ current: PageMetadataRef | null }>({ current: null });

provide('router', mainRouter);
provideMetadataReceiver((info) => {
	pageMetadata.current = info;
	if (pageMetadata.current?.value) {
		document.title = `${pageMetadata.current?.value.title} | ${instanceName}`;
	}
});

document.documentElement.style.overflowY = 'scroll';
</script>

<style lang="scss" scoped>
.mk-app {
	// ほんとは単に 100vh と書きたいところだが... https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
	min-height: calc(var(--vh, 1vh) * 100);
	box-sizing: border-box;
}
</style>
