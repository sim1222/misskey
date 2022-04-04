<template>
<MkPagination ref="pagingComponent" :pagination="pagination">
	<template #empty>
		<div class="_fullinfo">
			<img src="https://s3.nca10.net/misskey/70aaeca5-ac88-4879-9553-bb620046c38b.png" class="_ghost"/>
			<div>{{ $ts.noUsers }}</div>
		</div>
	</template>

	<template #default="{ items: users }">
		<div class="efvhhmdq">
			<MkUserInfo v-for="user in users" :key="user.id" class="user" :user="user"/>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkUserInfo from '@/components/user-info.vue';
import MkPagination from '@/components/ui/pagination.vue';
import { Paging } from '@/components/ui/pagination.vue';
import { userPage } from '@/filters/user';

const props = defineProps<{
	pagination: Paging;
	noGap?: boolean;
}>();

const pagingComponent = ref<InstanceType<typeof MkPagination>>();
</script>

<style lang="scss" scoped>
.efvhhmdq {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	grid-gap: var(--margin);
}
</style>
