<template>
<div
	ref="rootEl"
	class="_section"
	@dragover.prevent.stop="onDragover"
	@drop.prevent.stop="onDrop"
>
	<div class="_content mk-messaging-room">
		<div class="body">
			<MkPagination v-if="pagination" ref="pagingComponent" :key="userAcct || groupId" :pagination="pagination">
				<template #empty>
					<div class="_fullinfo">
						<img src="https://xn--931a.moe/assets/info.jpg" class="_ghost"/>
						<div>{{ i18n.ts.noMessagesYet }}</div>
					</div>
				</template>

				<template #default="{ items: messages, fetching: pFetching }">
					<XList
						v-if="messages.length > 0"
						v-slot="{ item: message }"
						:class="{ messages: true, 'deny-move-transition': pFetching }"
						:items="messages"
						direction="up"
						reversed
					>
						<XMessage :key="message.id" :message="message" :is-group="group != null"/>
					</XList>
				</template>
			</MkPagination>
		</div>
		<footer>
			<div v-if="typers.length > 0" class="typers">
				<I18n :src="i18n.ts.typingUsers" text-tag="span" class="users">
					<template #users>
						<b v-for="typer in typers" :key="typer.id" class="user">{{ typer.username }}</b>
					</template>
				</I18n>
				<MkEllipsis/>
			</div>
			<transition :name="animation ? 'fade' : ''">
				<div v-show="showIndicator" class="new-message">
					<button class="_buttonPrimary" @click="onIndicatorClick"><i class="fas fa-fw fa-arrow-circle-down"></i>{{ i18n.ts.newMessageExists }}</button>
				</div>
			</transition>
			<XForm v-if="!fetching" ref="formEl" :user="user" :group="group" class="form"/>
		</footer>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, watch, onMounted, nextTick, onBeforeUnmount, ref } from 'vue';
import * as Misskey from 'misskey-js';
import * as Acct from 'misskey-js/built/acct';
import XMessage from './messaging-room.message.vue';
import XForm from './messaging-room.form.vue';
import XList from '@/components/MkDateSeparatedList.vue';
import MkPagination, { Paging } from '@/components/MkPagination.vue';
import { isBottomVisible, onScrollBottom, scrollToBottom } from '@/scripts/scroll';
import * as os from '@/os';
import { stream } from '@/stream';
import * as sound from '@/scripts/sound';
import { i18n } from '@/i18n';
import { $i } from '@/account';
import { defaultStore } from '@/store';
import { definePageMetadata } from '@/scripts/page-metadata';

const props = defineProps<{
	userAcct?: string;
	groupId?: string;
}>();

let rootEl = ref<HTMLDivElement>();
let formEl = ref<InstanceType<typeof XForm>>();
let pagingComponent = ref<InstanceType<typeof MkPagination>>();

let fetching = ref(true);
let user: Misskey.entities.UserDetailed | null = ref(null);
let group: Misskey.entities.UserGroup | null = ref(null);
let typers: Misskey.entities.User[] = ref([]);
let connection: Misskey.ChannelConnection<Misskey.Channels['messaging']> | null = ref(null);
let showIndicator = ref(false);
const {
	animation,
} = defaultStore.reactiveState;

let pagination: Paging | null = ref(null);

watch([() => props.userAcct, () => props.groupId], () => {
	if (connection.value) connection.value.dispose();
	fetch();
});

async function fetch() {
	fetching.value = true;

	if (props.userAcct) {
		const acct = Acct.parse(props.userAcct);
		user.value = await os.api('users/show', { username: acct.username, host: acct.host || undefined });
		group.value = null;
		
		pagination.value = {
			endpoint: 'messaging/messages',
			limit: 20,
			params: {
				userId: user.value.id,
			},
			reversed: true,
			pageEl: (rootEl).value,
		};
		connection.value = stream.useChannel('messaging', {
			otherparty: user.value.id,
		});
	} else {
		user.value = null;
		group.value = await os.api('users/groups/show', { groupId: props.groupId });

		pagination.value = {
			endpoint: 'messaging/messages',
			limit: 20,
			params: {
				groupId: group.value?.id,
			},
			reversed: true,
			pageEl: (rootEl).value,
		};
		connection.value = stream.useChannel('messaging', {
			group: group.value?.id,
		});
	}

	connection.value.on('message', onMessage);
	connection.value.on('read', onRead);
	connection.value.on('deleted', onDeleted);
	connection.value.on('typers', _typers => {
		typers.value = _typers.filter(u => u.id !== $i?.id);
	});

	document.addEventListener('visibilitychange', onVisibilitychange);

	nextTick(() => {
		thisScrollToBottom();
		window.setTimeout(() => {
			fetching.value = false;
		}, 300);
	});
}

function onDragover(ev: DragEvent) {
	if (!ev.dataTransfer) return;

	const isFile = ev.dataTransfer.items[0].kind === 'file';
	const isDriveFile = ev.dataTransfer.types[0] === _DATA_TRANSFER_DRIVE_FILE_;

	if (isFile || isDriveFile) {
		ev.dataTransfer.dropEffect = ev.dataTransfer.effectAllowed === 'all' ? 'copy' : 'move';
	} else {
		ev.dataTransfer.dropEffect = 'none';
	}
}

function onDrop(ev: DragEvent): void {
	if (!ev.dataTransfer) return;

	// ファイルだったら
	if (ev.dataTransfer.files.length === 1) {
		formEl.value.upload(ev.dataTransfer.files[0]);
		return;
	} else if (ev.dataTransfer.files.length > 1) {
		os.alert({
			type: 'error',
			text: i18n.ts.onlyOneFileCanBeAttached,
		});
		return;
	}

	//#region ドライブのファイル
	const driveFile = ev.dataTransfer.getData(_DATA_TRANSFER_DRIVE_FILE_);
	if (driveFile != null && driveFile !== '') {
		const file = JSON.parse(driveFile);
		formEl.value.file = file;
	}
	//#endregion
}

function onMessage(message) {
	sound.play('chat');

	const _isBottom = isBottomVisible(rootEl.value, 64);

	pagingComponent.value.prepend(message);
	if (message.userId !== $i?.id && !document.hidden) {
		connection.value?.send('read', {
			id: message.id,
		});
	}

	if (_isBottom) {
		// Scroll to bottom
		nextTick(() => {
			thisScrollToBottom();
		});
	} else if (message.userId !== $i?.id) {
		// Notify
		notifyNewMessage();
	}
}

function onRead(x) {
	if (user.value) {
		if (!Array.isArray(x)) x = [x];
		for (const id of x) {
			if (pagingComponent.value.items.some(y => y.id === id)) {
				const exist = pagingComponent.value.items.map(y => y.id).indexOf(id);
				pagingComponent.value.items[exist] = {
					...pagingComponent.value.items[exist],
					isRead: true,
				};
			}
		}
	} else if (group.value) {
		for (const id of x.ids) {
			if (pagingComponent.value.items.some(y => y.id === id)) {
				const exist = pagingComponent.value.items.map(y => y.id).indexOf(id);
				pagingComponent.value.items[exist] = {
					...pagingComponent.value.items[exist],
					reads: [...pagingComponent.value.items[exist].reads, x.userId],
				};
			}
		}
	}
}

function onDeleted(id) {
	const msg = pagingComponent.value.items.find(m => m.id === id);
	if (msg) {
		pagingComponent.value.items = pagingComponent.value.items.filter(m => m.id !== msg.id);
	}
}

function thisScrollToBottom() {
	scrollToBottom((rootEl).value, { behavior: 'smooth' });
}

function onIndicatorClick() {
	showIndicator.value = false;
	thisScrollToBottom();
}

let scrollRemove: (() => void) | null = ref(null);

function notifyNewMessage() {
	showIndicator.value = true;

	scrollRemove.value = onScrollBottom(rootEl.value, () => {
		showIndicator.value = false;
		scrollRemove.value = null;
	});
}

function onVisibilitychange() {
	if (document.hidden) return;
	for (const message of pagingComponent.value.items) {
		if (message.userId !== $i?.id && !message.isRead) {
			connection.value?.send('read', {
				id: message.id,
			});
		}
	}
}

onMounted(() => {
	fetch();
});

onBeforeUnmount(() => {
	connection.value?.dispose();
	document.removeEventListener('visibilitychange', onVisibilitychange);
	if (scrollRemove.value) scrollRemove.value();
});

definePageMetadata(computed(() => !fetching.value ? user.value ? {
	userName: user.value,
	avatar: user.value,
} : {
	title: group.value?.name,
	icon: 'fas fa-users',
} : null));
</script>

<style lang="scss" scoped>
.mk-messaging-room {
	position: relative;
	overflow: auto;

	> .body {
		.more {
			display: block;
			margin: 16px auto;
			padding: 0 12px;
			line-height: 24px;
			color: #fff;
			background: rgba(#000, 0.3);
			border-radius: 12px;

			&:hover {
				background: rgba(#000, 0.4);
			}

			&:active {
				background: rgba(#000, 0.5);
			}

			&.fetching {
				cursor: wait;
			}

			> i {
				margin-right: 4px;
			}
		}

		.messages {
			padding: 8px 0;

			> ::v-deep(*) {
				margin-bottom: 16px;
			}
		}
	}

	> footer {
		width: 100%;
		position: sticky;
		z-index: 2;
		bottom: 0;
		padding-top: 8px;
		bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);

		> .new-message {
			width: 100%;
			padding-bottom: 8px;
			text-align: center;

			> button {
				display: inline-block;
				margin: 0;
				padding: 0 12px;
				line-height: 32px;
				font-size: 12px;
				border-radius: 16px;

				> i {
					display: inline-block;
					margin-right: 8px;
				}
			}
		}

		> .typers {
			position: absolute;
			bottom: 100%;
			padding: 0 8px 0 8px;
			font-size: 0.9em;
			color: var(--fgTransparentWeak);

			> .users {
				> .user + .user:before {
					content: ", ";
					font-weight: normal;
				}

				> .user:last-of-type:after {
					content: " ";
				}
			}
		}

		> .form {
			max-height: 12em;
			overflow-y: scroll;
			border-top: solid 0.5px var(--divider);
		}
	}
}

.fade-enter-active, .fade-leave-active {
	transition: opacity 0.1s;
}

.fade-enter-from, .fade-leave-to {
	transition: opacity 0.5s;
	opacity: 0;
}
</style>
