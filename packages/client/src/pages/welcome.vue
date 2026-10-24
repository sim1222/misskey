<template>
<div v-if="meta">
	<XSetup v-if="meta.requireSetup"/>
	<XEntrance v-else/>
</div>
</template>

<script lang="ts" setup>
import type { entities } from '@/misskey';
import { computed, ref } from 'vue';
import XSetup from './welcome.setup.vue';
import XEntrance from './welcome.entrance.a.vue';
import { instanceName } from '@/config';
import * as os from '@/os';
import { definePageMetadata } from '@/scripts/page-metadata';

let meta = ref<entities.DetailedInstanceMetadata | null>(null);

os.api('meta', { detail: true }).then(res => {
	meta.value = res;
});





definePageMetadata(computed(() => ({
	title: instanceName,
	icon: null,
})));
</script>
