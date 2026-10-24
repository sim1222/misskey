<template>
	<MkModal ref="modal" @click="done(true)" @closed="$emit('closed')">
		<div class="container">
			<div class="fullwidth top-caption">
				<div class="mk-dialog">
					<header>
						<Mfm v-if="title" class="title" :text="title"/>
						<span class="text-count" :class="{ over: remainingLength < 0 }">{{ remainingLength }}</span>
					</header>
					<textarea v-model="inputValue" autofocus :placeholder="input.placeholder" @keydown="onInputKeydown"></textarea>
					<div v-if="(showOkButton || showCancelButton)" class="buttons">
						<MkButton inline primary :disabled="remainingLength < 0" @click="ok">{{ i18n.ts.ok }}</MkButton>
						<MkButton inline @click="cancel" >{{ i18n.ts.cancel }}</MkButton>
					</div>
				</div>
			</div>
			<div class="hdrwpsaf fullwidth">
				<header>{{ image.name }}</header>
				<img :src="image.url ?? undefined" :alt="image.comment ?? undefined" :title="image.comment ?? undefined" @click="modal?.close()"/>
				<footer>
					<span>{{ image.type }}</span>
					<span>{{ bytes(image.size) }}</span>
					<span v-if="image.properties && image.properties.width">{{ number(image.properties.width) }}px × {{ number(image.properties.height) }}px</span>
				</footer>
			</div>
		</div>
	</MkModal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { length } from 'stringz';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import type { entities } from '@/misskey';
import type { DialogResult } from '@/types/dialog';
import { i18n } from '@/i18n';
import bytes from '@/filters/bytes';
import number from '@/filters/number';
const props = withDefaults(defineProps<{
 image: entities.DriveFile; title?: string;
 input: { placeholder?: string; default: string | null };
 showOkButton?: boolean; showCancelButton?: boolean; cancelableByBgClick?: boolean;
}>(), { showOkButton: true, showCancelButton: true, cancelableByBgClick: true });
const emit = defineEmits<{
 (event: 'done', result: DialogResult<string | null>): void;
 (event: 'closed'): void;
}>();
const modal = ref<InstanceType<typeof MkModal>>();
const inputValue = ref(props.input.default || null);
const remainingLength = computed(() => typeof inputValue.value === 'string' ? 512 - length(inputValue.value) : 512);
function done(canceled: boolean, result: string | null = null): void {
 emit('done', canceled ? { canceled: true, result: undefined } : { canceled: false, result });
 modal.value?.close();
}
function ok(): void { if (props.showOkButton) done(false, inputValue.value); }
function cancel(): void { done(true); }
function onKeydown(event: KeyboardEvent): void { if (event.which === 27) cancel(); }
function onInputKeydown(event: KeyboardEvent): void {
 if (event.which === 13 && event.ctrlKey) { event.preventDefault(); event.stopPropagation(); ok(); }
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<style lang="scss" scoped>
.container {
	display: flex;
	width: 100%;
	height: 100%;
	flex-direction: row;
	overflow: scroll;
	position: fixed;
	left: 0;
	top: 0;
}
@media (max-width: 850px) {
	.container {
		flex-direction: column;
	}
	.top-caption {
		padding-bottom: 8px;
	}
}
.fullwidth {
	width: 100%;
	margin: auto;
}
.mk-dialog {
	position: relative;
	padding: 32px;
	min-width: 320px;
	max-width: 480px;
	box-sizing: border-box;
	text-align: center;
	background: var(--panel);
	border-radius: var(--radius);
	margin: auto;

	> header {
		margin: 0 0 8px 0;
		position: relative;

		> .title {
			font-weight: bold;
			font-size: 20px;
		}

		> .text-count {
			opacity: 0.7;
			position: absolute;
			right: 0;
		}
	}

	> .buttons {
		margin-top: 16px;

		> * {
			margin: 0 8px;
		}
	}

	> textarea {
		display: block;
		box-sizing: border-box;
		padding: 0 24px;
		margin: 0;
		width: 100%;
		font-size: 16px;
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--fg);
		font-family: inherit;
		max-width: 100%;
		min-width: 100%;
		min-height: 90px;

		&:focus-visible {
			outline: none;
		}

		&:disabled {
			opacity: 0.5;
		}
	}
}
.hdrwpsaf {
	display: flex;
	flex-direction: column;
	height: 100%;

	> header,
	> footer {
		align-self: center;
		display: inline-block;
		padding: 6px 9px;
		font-size: 90%;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 6px;
		color: #fff;
	}

	> header {
		margin-bottom: 8px;
		opacity: 0.9;
	}

	> img {
		display: block;
		flex: 1;
		min-height: 0;
		object-fit: contain;
		width: 100%;
		cursor: zoom-out;
		image-orientation: from-image;
	}

	> footer {
		margin-top: 8px;
		opacity: 0.8;

		> span + span {
			margin-left: 0.5em;
			padding-left: 0.5em;
			border-left: solid 1px rgba(255, 255, 255, 0.5);
		}
	}
}
</style>
