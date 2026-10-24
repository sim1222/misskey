<template>
<MkPagination ref="pagingComponent" :pagination="pagination">
	<template #empty>
		<div class="_fullinfo">
			<img src="https://xn--931a.moe/assets/info.jpg" class="_ghost"/>
			<div>{{ i18n.ts.noNotifications }}</div>
		</div>
	</template>

	<template #default="{ items: notifications }">
		<XList v-slot="{ item: notification }" class="elsfgstc" :items="notifications" :no-gap="true">
			<XNote v-if="['reply', 'quote', 'mention'].includes(notification.type) && notification.note" :key="notification.id" :note="notification.note"/>
			<XNotification v-else :key="notification.id" :notification="notification" :with-time="true" :full="true" class="_panel blur notification"/>
		</XList>
	</template>
</MkPagination>
</template>

<script lang="ts" setup>
import { onUnmounted, onMounted, computed, ref } from 'vue';
import { notificationTypes, isNotificationType } from '@/misskey';
import type { Paging, PaginationExposed } from '@/types/paging';
import MkPagination from '@/components/MkPagination.vue';
import XNotification from '@/components/MkNotification.vue';
import XList from '@/components/MkDateSeparatedList.vue';
import XNote from '@/components/MkNote.vue';

import { stream } from '@/stream';
import { requireAccount } from '@/account';
import type { entities, ChannelConnection, Channels } from '@/misskey';
const account = requireAccount();
import { i18n } from '@/i18n';

const props = defineProps<{
	includeTypes?: typeof notificationTypes[number][] | null;
	unreadOnly?: boolean;
}>();

const pagingComponent = ref<PaginationExposed<'i/notifications'>>();

const pagination: Paging<'i/notifications'> = {
	endpoint: 'i/notifications' as const,
	limit: 10,
	params: computed(() => ({
		includeTypes: props.includeTypes ?? undefined,
		excludeTypes: props.includeTypes ? undefined : (account.mutingNotificationTypes ?? []).filter(isNotificationType),
		unreadOnly: props.unreadOnly,
	})),
};

const onNotification = (notification: entities.Notification) => {
	const isMuted = props.includeTypes ? !props.includeTypes.includes(notification.type) : (account.mutingNotificationTypes ?? []).includes(notification.type);
	if (isMuted || document.visibilityState === 'visible') {
		stream.send('readNotification', {
			id: notification.id,
		});
	}

	if (!isMuted) {
		pagingComponent.value?.prepend({
			...notification,
			isRead: document.visibilityState === 'visible',
		});
	}
};

let connection: ChannelConnection<Channels['main']> | undefined;

onMounted(() => {
	connection = stream.useChannel('main');
	connection.on('notification', onNotification);
	connection.on('readAllNotifications', () => {
		if (pagingComponent.value) {
			for (const item of pagingComponent.value.queue) {
				item.isRead = true;
			}
			for (const item of pagingComponent.value.items) {
				item.isRead = true;
			}
		}
	});
	connection.on('readNotifications', notificationIds => {
		if (pagingComponent.value) {
			for (let i = 0; i < pagingComponent.value.queue.length; i++) {
				if (notificationIds.includes(pagingComponent.value.queue[i].id)) {
					pagingComponent.value.queue[i].isRead = true;
				}
			}
			for (let i = 0; i < (pagingComponent.value.items || []).length; i++) {
				if (notificationIds.includes(pagingComponent.value.items[i].id)) {
					pagingComponent.value.items[i].isRead = true;
				}
			}
		}
	});
});

onUnmounted(() => {
	if (connection) connection.dispose();
});
</script>

<style lang="scss" scoped>
.elsfgstc {
	background: var(--panel);
}
</style>
