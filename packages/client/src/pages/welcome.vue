<template>
<div v-if="meta">
	<XSetup v-if="meta.requireSetup"/>
	<XEntrance v-else/>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import XSetup from './welcome.setup.vue';
import XEntrance from './welcome.entrance.a.vue';
import { instanceName } from '@/config';
import * as os from '@/os';
import { definePageMetadata } from '@/scripts/page-metadata';

let meta = ref(null);

os.api('meta', { detail: true }).then(res => {
	meta.value = res;
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata(computed(() => ({
	title: instanceName,
	icon: null,
})));
</script>
