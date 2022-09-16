<template>
  <div class="poamfof fill">
      <transition :name="$store.state.animation ? 'fade' : ''" mode="out-in">
          <div v-if="player.url" class="player">
	          <iframe v-if="!fetching && !media.type"  :src="player.url + (player.url.match(/\?/) ? '&autoplay=1&auto_play=1' : '?autoplay=1&auto_play=1')" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen/>
						<video v-else-if="!fetching && media.type.startsWith('video/')" :key="media.id" :video="media" :poster="media.thumbnailUrl" >
							<source :src="media.url" :type="media.type">
						</video>
						<div v-else-if="!fetching && media.type.startsWith('audio/') && media.type !== 'audio/midi'" class="audio">
							<audio ref="audioEl" class="audio" :src="media.url" :title="media.name" controls preload="metadata"
								@volumechange="volumechange" />
						</div>
          </div>
      </transition>
			<MkLoading v-if="fetching" />
      <MkError v-else-if="!player.url || !media.type.match(/(video|audio)\//)" />
  </div>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
import { computed } from 'vue';
import { url as local, lang } from '@/config';
import * as os from '@/os';
import { DriveFile } from 'misskey-js/built/entities';
import { ColdDeviceStorage } from '@/store';

const props = defineProps<{
    url: string;
}>();

console.log(props.url);

try {
	
} catch (error) {
	
}

const requestUrl = new URL(props.url);

const audioEl = $ref<HTMLAudioElement | null>();
let media = $ref<DriveFile>();
let fetching = $ref(true);
let title = $ref<string | null>(null);
let player = $ref({
    url: null,
    width: null,
    height: null,
});

const requestLang = (lang || 'ja-JP').replace('ja-KS', 'ja-JP');

if (props.url.hostname === 'www.youtube.com' && props.url.pathname.match('^/watch')) {
	fetch(`/url?url=${encodeURIComponent(props.url.href)}&lang=${requestLang}`).then(res => {
		res.json().then(info => {
			if (info.url == null) return;
			title = info.title;
			fetching = false;
			player = info.player;
		});
	});
} else {
	const id = props.url;
	media = await os.api('drive/files/show', { fileId: id });
}

if (props.url) {
	const id = props.url;
	media = await os.api('drive/files/show', { fileId: id });
}

function volumechange() {
	if (audioEl) ColdDeviceStorage.set('mediaVolume', audioEl.volume);
}

definePageMetadata(computed(() => props.url ? {
	title: title?.toString() || 'ytplayer',
	path: `/notes/${props.url}`,
	icon: 'fa-brands fa-youtube'
} : null));

console.log(await player.url);
</script>

<style lang="scss">
.poamfof {
	position: relative;
	overflow: hidden;
	border-radius: 0 0 var(--radius) var(--radius);
	.player {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			height: calc(100% - 10px);
			width: calc(100% - 10px);
			padding: 5px;
			iframe {
					width: 100%;
					height: 100%;
			}
			video {
					width: 100%;
					height: 100%;
			}
			.audio {
					width: 100%;
					height: 100%;
			}
	}
}
.fill {
	height: 100%;
}
</style>
