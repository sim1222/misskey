<template>
<XNotes ref="tlComponent" :no-gap="!$store.state.showGapBetweenNotesInTimeline" :pagination="pagination" @queue="emit('queue', $event)" @before="emit('before')" @after="emit('after')"/>
</template>

<script lang="ts" setup>
import type { entities } from '@/misskey';
import type { Paging, EndpointOf } from '@/types/paging';
import { requireValue } from '@/scripts/require-value';
import { ref, computed, provide, onUnmounted } from 'vue';
import XNotes from '@/components/MkNotes.vue';

import { stream } from '@/stream';
import * as sound from '@/scripts/sound';
import { $i } from '@/account';

const props = defineProps<{
	src: 'antenna' | 'home' | 'local' | 'social' | 'global' | 'mentions' | 'directs' | 'list' | 'channel';
	list?: string;
	antenna?: string;
	channel?: string;
	sound?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'note'): void;
 (ev: 'before'): void;
 (ev: 'after'): void;
	(ev: 'queue', count: number): void;
}>();

provide('inChannel', computed(() => props.src === 'channel'));

const tlComponent = ref<InstanceType<typeof XNotes>>();

const untilDate = ref<number>();
const prepend = (note: entities.Note) => {
 if (untilDate.value != null && new Date(note.createdAt).getTime() > untilDate.value) return;
	tlComponent.value?.pagingComponent?.prepend(note);

	emit('note');

	if (props.sound) {
		sound.play($i && (note.userId === $i.id) ? 'noteMy' : 'note');
	}
};

const onUserAdded = () => {
	tlComponent.value?.pagingComponent?.reload();
};

const onUserRemoved = () => {
	tlComponent.value?.pagingComponent?.reload();
};

const onChangeFollowing = () => {
	if (!tlComponent.value?.pagingComponent?.backed) {
		tlComponent.value?.pagingComponent?.reload();
	}
};

const connections: { dispose(): void }[] = [];
const pagination = ((): Paging<EndpointOf<entities.Note>> => {
if (props.src === 'antenna') {
	const endpoint = 'antennas/notes';
	const query = {
		antennaId: requireValue(props.antenna, 'Antenna ID'),
	};
	const connection = stream.useChannel('antenna', {
		antennaId: requireValue(props.antenna, 'Antenna ID'),
	});
	connection.on('note', prepend);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ ...query, untilDate: untilDate.value })) };
} else if (props.src === 'home') {
	const endpoint = 'notes/timeline';
	const connection = stream.useChannel('homeTimeline');
	connection.on('note', prepend);

	const connection2 = stream.useChannel('main');
	connection2.on('follow', onChangeFollowing);
	connection2.on('unfollow', onChangeFollowing);

 connections.push(connection);
 connections.push(connection2);
 return { endpoint, limit: 10, params: computed(() => ({ untilDate: untilDate.value })) };
} else if (props.src === 'local') {
	const endpoint = 'notes/local-timeline';
	const connection = stream.useChannel('localTimeline');
	connection.on('note', prepend);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ untilDate: untilDate.value })) };
} else if (props.src === 'social') {
	const endpoint = 'notes/hybrid-timeline';
	const connection = stream.useChannel('hybridTimeline');
	connection.on('note', prepend);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ untilDate: untilDate.value })) };
} else if (props.src === 'global') {
	const endpoint = 'notes/global-timeline';
	const connection = stream.useChannel('globalTimeline');
	connection.on('note', prepend);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ untilDate: untilDate.value })) };
} else if (props.src === 'mentions') {
	const endpoint = 'notes/mentions';
	const connection = stream.useChannel('main');
	connection.on('mention', prepend);

 connections.push(connection);
 return { endpoint, limit: 10 };
} else if (props.src === 'directs') {
	const endpoint = 'notes/mentions';
	const query = {
		visibility: 'specified',
	};
	const onNote = (note: entities.Note) => {
		if (note.visibility === 'specified') {
			prepend(note);
		}
	};
	const connection = stream.useChannel('main');
	connection.on('mention', onNote);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ ...query, untilDate: untilDate.value })) };
} else if (props.src === 'list') {
	const endpoint = 'notes/user-list-timeline';
	const query = {
		listId: requireValue(props.list, 'List ID'),
	};
	const connection = stream.useChannel('userList', {
		listId: requireValue(props.list, 'List ID'),
	});
	connection.on('note', prepend);
	connection.on('userAdded', onUserAdded);
	connection.on('userRemoved', onUserRemoved);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ ...query, untilDate: untilDate.value })) };
} else if (props.src === 'channel') {
	const endpoint = 'channels/timeline';
	const query = {
		channelId: requireValue(props.channel, 'Channel ID'),
	};
	const connection = stream.useChannel('channel', {
		channelId: requireValue(props.channel, 'Channel ID'),
	});
	connection.on('note', prepend);

 connections.push(connection);
 return { endpoint, limit: 10, params: computed(() => ({ ...query, untilDate: untilDate.value })) };
}
throw new TypeError("Unknown timeline source");
})();

onUnmounted(() => {
	for (const connection of connections) connection.dispose();
});

function focus() { tlComponent.value?.focus(); }
function timetravel(date?: Date) {
 if (date && !Number.isFinite(date.getTime())) throw new TypeError('Invalid timeline date');
 untilDate.value = date?.getTime();
}
defineExpose({ focus, timetravel });
</script>
