<template>
<div :class="$style.root">
	<div ref="scrollEl" :class="[$style.scrollbox, { [$style.scroll]: isScrolling }]">
		<div v-for="note in notes" :key="note.id" :class="$style.note">
			<div class="_panel blur" :class="$style.content">
				<div :class="$style.body">
					<MkA v-if="note.replyId" class="reply" :to="`/notes/${note.replyId}`"><i class="ti ti-arrow-back-up"></i></MkA>
					<Mfm v-if="note.text" :text="note.text" :author="note.user" :i="$i" />
					<MkA v-if="note.renoteId" class="rp" :to="`/notes/${note.renoteId}`">RN: ...</MkA>
				</div>
				<div v-if="note.files.length > 0" :class="$style.richcontent">
					<MkMediaList :media-list="note.files" />
				</div>
				<div v-if="note.poll">
					<MkPoll :note="note" :readOnly="true" />
				</div>
			</div>
			<MkReactionsViewer ref="reactionsViewer" :note="note" />
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import MkReactionsViewer from '@/components/MkReactionsViewer.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import MkPoll from '@/components/MkPoll.vue';
import * as os from '@/os';
import { Note } from 'misskey-js/built/entities';
import { onUpdated } from 'vue';
import { getScrollContainer } from '@/scripts/scroll';

let notes = $ref<Note[]>([]);
let isScrolling = $ref(false);
let scrollEl = $ref<HTMLElement>();

os.apiGet('notes/featured').then(_notes => {
	notes = _notes;
});

onUpdated(() => {
	if (!scrollEl) return;
	const container = getScrollContainer(scrollEl);
	const containerHeight = container ? container.clientHeight : window.innerHeight;
	if (scrollEl.offsetHeight > containerHeight) {
		isScrolling = true;
	}
});
</script>

<style lang="scss" module>
@keyframes scroll {
	0% {
		transform: translate3d(0, 0, 0);
	}
	5% {
		transform: translate3d(0, 0, 0);
	}
	75% {
		transform: translate3d(0, calc(-100% + 90vh), 0);
	}
	90% {
		transform: translate3d(0, calc(-100% + 90vh), 0);
	}
}

.root {
	text-align: right;
}

.scrollbox {
	&.scroll {
		animation: scroll 45s linear infinite;
	}
}

.note {
	margin: 16px 0 16px auto;
}

.content {
	padding: 16px;
	margin: 0 0 0 auto;
	max-width: max-content;
	border-radius: 16px;
	-webkit-backdrop-filter: var(--blur, blur(15px));
	backdrop-filter: var(--blur, blur(15px));
	background: var(--panel);
}

.richcontent {
	min-width: 250px;
}
</style>
