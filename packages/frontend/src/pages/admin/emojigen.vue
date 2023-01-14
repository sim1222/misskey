<template>
<MkStickyContainer>
	<template #header>
		<XHeader v-model:tab="tab" :tabs="headerTabs" />
	</template>
	<MkSpacer :content-max="700" :margin-min="16" :margin-max="32">
		<div class="cwepdizn _formRoot">
			<div v-if="tab === 'string'" class="local">
				<FormSection>
					<template #label>{{ $ts.preview }}</template>
					<p><img :src="previewUrl" class="img" :alt="emojiName" /></p>
				</FormSection>
				<FormButton primary class="_formBlock" @click="uploadEmoji('url')">{{ $ts.emojiApproval }}</FormButton>
				<FormSection>
					<template #label>{{ $ts.settings }}</template>
					<FormInput v-model="emojiName" class="_formBlock">
						<template #label>{{ $ts.emojiName }}</template>
					</FormInput>

					<FormTextarea v-model="text" class="_formBlock">
						<template #label>{{ $ts.text }}</template>
					</FormTextarea>

					<FormRadios v-model="emojiAlign" class="_formBlock">
						<template #label>{{ $ts._simkey.emojiAlign }}</template>
						<option value="left"><i class="fas fa-align-left" /></option>
						<option value="center"><i class="fas fa-align-center"></i></option>
						<option value="right"><i class="fas fa-align-right" /></option>
					</FormRadios>

					<FormFolder :default-open="false" class="_formBlock">
						<template #label>{{ $ts._simkey.emojiSizeSetting }}</template>
						<FormSection>
							<FormSwitch v-model="emojiSizeFixed" class="_formBlock">
								<template #label>{{ $ts._simkey.emojiSizeFixed }}</template>
							</FormSwitch>

							<FormSwitch v-model="emojiStretch" class="_formBlock">
								<template #label>{{ $ts._simkey.emojiStretch }}</template>
							</FormSwitch>
						</FormSection>
					</FormFolder>

					<FormFolder :default-open="false" class="_formBlock">
						<template #label>{{ $ts._pages.font }}</template>
						<FormRadios v-model="font" class="_formBlock">
							<option value="notosans-mono-bold">Noto Sans Mono CJK JP Bold</option>
							<option value="mplus-1p-black">M+ 1p black</option>
							<option value="rounded-x-mplus-1p-black">Rounded M+ 1p black</option>
							<option value="ipamjm">IPAmj明朝</option>
							<option value="aoyagireisyoshimo">青柳隷書しも</option>
							<option value="LinLibertine_RBah">LinLibertine Bold</option>
						</FormRadios>
					</FormFolder>


					<FormFolder :default-open="false" class="_formBlock">
						<template #label>{{ $ts._simkey.emojiColor }}</template>
						<FormSection>
							<div class="cwepdizn-colors">
								<div class="row">
									<button v-for="color in accentColors" :key="color" class="color rounded _button"
										@click="setAccentColor(color)">
										<div class="preview" :style="{ background: color }"></div>
									</button>
								</div>
							</div>

							<FormInput v-model="emojiColor" class="_formBlock" :style="{ color: '#' + emojiColor }">
								<template #prefix><i class="fas fa-palette"></i></template>
								<template #label @click="colorPick()">{{ $ts._simkey.emojiColor }}</template>
								<template #caption>#RRGGBB</template>
							</FormInput>
							<FormButton @click="colorPick()">{{ $ts._simkey.colorPicker }}</FormButton>
						</FormSection>
					</FormFolder>
				</FormSection>
			</div>

			<div v-else-if="tab === 'misetehoshii'" class="remote">
				<FormSection>
					<template #label>{{ $ts.preview }}</template>
					<canvas class="preview__content" ref="canvas" width="64" height="30" />
				</FormSection>
				<FormButton primary class="_formBlock" @click="uploadEmoji('')">{{ $ts._simkey.emojiApproval }}</FormButton>
				<FormSection>
					<template #label>{{ $ts.settings }}</template>
					<FormInput v-model="emojiName" class="_formBlock">
						<template #label>{{ $ts.emojiName }}</template>
					</FormInput>

					<FormTextarea v-model="text" value="見せてほしい" class="_formBlock">
						<template #label>{{ $ts.text }}</template>
					</FormTextarea>

					<FormRadios v-model="backColor" class="_formBlock">
						<template #label>{{ $ts._theme.color }}</template>
						<option v-for="c in backColors" v-bind:value="c">{{ c }}</option>
					</FormRadios>
				</FormSection>
				<FormSection>
					<template #label>見せてほしいメーカー</template>
					<div>Powered by <MkLink url="https://github.com/melt-adzuki/misetehoshii">misetehoshii</MkLink>
					</div>
				</FormSection>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { v4 as uuid } from 'uuid';
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import * as os from '@/os';
import { i18n } from '@/i18n';
import { defaultStore } from '@/store';
import { stream } from '@/stream';
import { uploadFile } from '@/scripts/upload';
import XHeader from './_header_.vue';
import MkTab from '@/components/MkTab.vue';
import MkLink from '@/components/MkLink.vue';
import FormSection from '@/components/form/section.vue';
import FormInput from '@/components/MkInput.vue';
import FormSwitch from '@/components/MkSwitch.vue';
import FormButton from '@/components/MkButton.vue';
import FormRadios from '@/components/MkRadios.vue';
import FormTextarea from '@/components/MkTextarea.vue';
import FormFolder from '@/components/MkFolder.vue';
import { definePageMetadata } from '@/scripts/page-metadata';
import { buttonImages } from "misetehoshii/src/assets";
import { draw } from "misetehoshii/src/canvas";

definePageMetadata(computed(() => ({
	title: i18n.ts._simkey.emojiGen,
	icon: 'fas fa-kiss-wink-heart',
})));

const tab = ref('string');
const headerTabs = $computed(() => [{
	key: 'string',
	title: i18n.ts._simkey.emojiNormal,
}, {
	key: 'misetehoshii',
	title: i18n.ts._simkey.emojiIfilter,
}]);

const font = ref('rounded-x-mplus-1p-black');
const text = ref('');
const emojiName = ref('');
const emojiAlign = ref('center');
const emojiSizeFixed = ref(false);
const emojiStretch = ref(false);
const emojiColor = ref('90ee90');
const previewUrl = ref('');
const accentColors = [
	'#ff00ff',
	'#ff0080',
	'#D55353',
	'#ff8080',
	'#ff8040',
	'#ffff80',
	'#80ff80',
	'#90ee90',
	'#80ffff',
	'#0080ff',
	'#8080ff',
];

const backColor = ref('blue');
const canvas = ref<HTMLCanvasElement>();
const buttonImage = computed(() => buttonImages[backColor.value]);
const backColors = [
	'blue',
	'peacockGreen',
	'green',
	'yellow',
	'red',
	'pink',
	'disabled',
];

const updateCanvas = (): void => {
	const context = canvas.value!.getContext("2d")!;
	draw({ context, text: text.value, button: buttonImage.value });
};

watch([font, text, emojiAlign, emojiSizeFixed, emojiStretch, emojiColor, backColor], () => {
	preview();
	updateCanvas();
});

const colorPick = (): void => {
	const input = document.createElement('input') as HTMLInputElement;
	input.type = 'color';
	input.value = `#${emojiColor.value}`;
	input.addEventListener('input', () => {
		emojiColor.value = input.value.replace('#', '');
	});
	(window as any).__misskey_input_ref__ = input;
	input.click();
};

const makeUrl = (): string => {
	const API_URL = 'https://emoji-gen.ninja/emoji';

	const query = {
		text: encodeURI(text.value),
		color: emojiColor.value + 'FF',
		back_color: '00000000',
		font: font.value,
		size_fixed: !emojiSizeFixed.value ? 'true' : 'false',
		align: 'center',
		stretch: !emojiStretch.value ? 'true' : 'false',
		public_fg: 'false',
		locale: 'ja',
	};

	return API_URL + '?' + Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
};

const preview = (): void => {
	previewUrl.value = makeUrl();
};

const setAccentColor = (color) => {
	emojiColor.value = color.replace('#', '');
};

const uploadFileFromUrlWithId = (url: string) => new Promise<string>(async resolve => {
	const marker = uuid();

	// 先にコネクションを貼り、アップロードが完了したかどうかを監視する
	const connection = stream.useChannel('main');

	connection.on('urlUploadFinished', async response => {
		if (response.marker === marker) {
			resolve(response.file.id);
			connection.dispose();
		}
	});

	// 絵文字をアップロード
	await os.api('drive/files/upload-from-url', {
		url,
		folderId: defaultStore.state.uploadFolder,
		marker,
	});
});

const getEmojiObject = emojiId => new Promise<Record<string, any> | null>(async resolve => {
	const sinceId = await os.api('admin/emoji/list', {
		limit: 1,
		untilId: emojiId.id,
	});

	if (!sinceId || !sinceId[0] || !sinceId[0].id) {
		resolve(null);
		return;
	}

	const id = await os.api('admin/emoji/list', {
		limit: 1,
		sinceId: sinceId[0].id,
	});

	if (!id || !id[0]) {
		resolve(null);
		return;
	}

	resolve(id[0]);
});

const uploadEmoji = async (type: string) => {

	if (type == 'url') {
		const emojiUrl = makeUrl();
		const fileId = await uploadFileFromUrlWithId(emojiUrl);

		// ドライブにアップロードされたファイルをリネーム
		await os.api('drive/files/update', {
			fileId,
			name: emojiName.value + '.png',
		});

		const emojiId = await os.api('admin/emoji/add', { fileId });
		const emoji = await getEmojiObject(emojiId);

		if (!emoji) {
			os.alert({
				type: 'error',
				text: i18n.ts.failedToUploadEmoji,
			});
		}
		os.popup(defineAsyncComponent(() => import('@/pages/emoji-edit-dialog.vue')), { emoji });
	} else {
		const canvasImg = new Promise<Blob>(resolve => {
			canvas.value!.toBlob(blob => resolve(blob?.slice(0, blob.size, 'image/png') as Blob));
		});
		const file = new File([await canvasImg], emojiName.value + '.png', { type: 'image/png' });
		const fileId = (await uploadFile(file, defaultStore.state.uploadFolder, undefined, true)).id;

		// ドライブにアップロードされたファイルをリネーム
		await os.api('drive/files/update', {
			fileId,
			name: emojiName.value + '.png',
		});

		const emojiId = await os.api('admin/emoji/add', { fileId });
		const emoji = await getEmojiObject(emojiId);

		if (!emoji) {
			os.alert({
				type: 'error',
				text: i18n.ts.failedToUploadEmoji,
			});
		}
		os.popup(defineAsyncComponent(() => import('@/pages/emoji-edit-dialog.vue')), { emoji });
	}


};


</script>

<style lang="scss" scoped>
.preview-img {
	height: 128px;
}

.cwepdizn {
	::v-deep(.cwepdizn-colors) {
		text-align: center;

		>.row {
			>.color {
				display: inline-block;
				position: relative;
				width: 64px;
				height: 64px;
				border-radius: 8px;

				>.preview {
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					margin: auto;
					width: 42px;
					height: 42px;
					border-radius: 4px;
					box-shadow: 0 2px 4px rgb(0 0 0 / 30%);
					transition: transform 0.15s ease;
				}

				&:hover {
					>.preview {
						transform: scale(1.1);
					}
				}

				&.active {
					box-shadow: 0 0 0 2px var(--divider) inset;
				}

				&.rounded {
					border-radius: 999px;

					>.preview {
						border-radius: 999px;
					}
				}

				&.char {
					line-height: 42px;
				}
			}
		}
	}
}
</style>
