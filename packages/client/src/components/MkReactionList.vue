<template>
<div ref="el">
	<MkModalWindow ref="dialog" :width="800" class="window" @close="dialog?.close()" @click="dialog?.close()" @closed="$emit('closed')">
		<template #header>リアクションリスト</template>
		<MkStickyContainer class="container">
			<FormFolder v-for="x in tes" class="_gap">
				<template #label>
					<MkReactionIcon :reaction="x.type" :custom-emojis="note.emojis"/>
					{{ x.type.replace("@.", "") }}
				</template>
				<template #suffix>{{ x.count + "人がリアクションしました" }}</template>
				<XReaction :key="x.type" :reaction="x.type" :count="x.count" :is-initial="initialReactions.has(x.type)" :note="note"/>
				<div class="userList">
					<MkA v-for="u in x.users" :key="u.id" :to="`/@${u.username}@${u.host ? u.host : ''}`" @click="dialog?.close()">
						<MkUserCardMini :user="u"/>
					</MkA>
				</div>
			</FormFolder>
			<MkError v-if="tes.length === 0"/>
		</MkStickyContainer>
	</MkModalWindow>
</div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as misskey from 'misskey-js';
import { NoteReaction, UserLite } from 'misskey-js/built/entities';
import { useNoteCapture } from '@/scripts/use-note-capture';
import MkFolder from '@/components/MkFolder.vue';
import FormFolder from '@/components/form/folder.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import * as os from '@/os';
import XDetails from '@/components/MkReactionsViewer.details.vue';
import XReaction from '@/components/MkReactionsViewer.reaction.vue';
import MkModal from '@/components/MkModal.vue';
import NotFound from "@/pages/not-found.vue";

const props = defineProps<{
	note: misskey.entities.Note;
}>();

type reactionUsers = {
	type: string;
	count: number;
	users: UserLite[];
}[]

const dialog = $ref<InstanceType<typeof MkModalWindow>>();
const el = ref<HTMLElement>();
const isDeleted = ref();
const reactions = ref([] as NoteReaction[]);
const users = ref([] as UserLite[]);
const tes = ref([] as reactionUsers);

const initialReactions = new Set(Object.keys(props.note.reactions));

onMounted(async () => {
	reactions.value = await os.api('notes/reactions', {
		noteId: props.note.id,
		limit: 100,
	});

	for (const [reaction, count] of Object.entries(props.note.reactions)) {
		const users = await os.apiGet('notes/reactions', {
			noteId: props.note.id,
			type: reaction,
			limit: 100,
		});
		tes.value.push({
			type: reaction,
			count: count,
			users: users.map(x => x.user),
		});
	}
});

const reload = defineEmits()

const getUsers = async (reaction: string) => {
	const reactions = await os.apiGet('notes/reactions', {
		noteId: props.note.id,
		type: reaction,
		limit: 100,
	});
	return reactions.map(x => x.user);
};

// useNoteCapture({
// 	rootEl: el,
// 	note: $$(props.note),
// 	isDeletedRef: isDeleted,
// });
</script>

<style scoped>
.window {
	max-height: 70vh;
}
.container {
	max-height: 70vh;
}
.userList {
	display: flex;
	flex-wrap: wrap;
}
</style>
