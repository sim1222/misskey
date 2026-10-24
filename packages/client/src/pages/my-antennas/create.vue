<template>
<div class="geegznzt">
	<XAntenna :antenna="draft" @created="onAntennaCreated"/>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import XAntenna from './editor.vue';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
import { useRouter } from '@/router';

const router = useRouter();

let draft = ref({
	name: '',
	src: 'all' as const,
	userListId: null,
	userGroupId: null,
	users: [],
	keywords: [],
	excludeKeywords: [],
	withReplies: false,
	caseSensitive: false,
	withFile: false,
	notify: false,
});

function onAntennaCreated() {
	router.push('/my/antennas');
}





definePageMetadata({
	title: i18n.ts.manageAntennas,
	icon: 'fas fa-satellite',
});
</script>

<style lang="scss" scoped>

</style>
