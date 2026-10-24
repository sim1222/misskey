<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :content-max="700">
		<div class="jqqmcavi">
			<MkButton v-if="pageId && author" class="button" inline link :to="`/@${ author.username }/pages/${ currentName }`"><i class="fas fa-external-link-square-alt"></i> {{ $ts._pages.viewPage }}</MkButton>
			<MkButton v-if="!readonly" inline primary class="button" @click="save"><i class="fas fa-save"></i> {{ $ts.save }}</MkButton>
			<MkButton v-if="pageId" inline class="button" @click="duplicate"><i class="fas fa-copy"></i> {{ $ts.duplicate }}</MkButton>
			<MkButton v-if="pageId && !readonly" inline class="button" danger @click="del"><i class="fas fa-trash-alt"></i> {{ $ts.delete }}</MkButton>
		</div>

		<div v-if="tab === 'settings'">
			<div class="_formRoot">
				<MkInput v-model="title" class="_formBlock">
					<template #label>{{ $ts._pages.title }}</template>
				</MkInput>

				<MkInput v-model="summary" class="_formBlock">
					<template #label>{{ $ts._pages.summary }}</template>
				</MkInput>

				<MkInput v-model="name" class="_formBlock">
					<template #prefix>{{ url }}/@{{ author?.username }}/pages/</template>
					<template #label>{{ $ts._pages.url }}</template>
				</MkInput>

				<MkSwitch v-model="alignCenter" class="_formBlock">{{ $ts._pages.alignCenter }}</MkSwitch>

				<MkSelect v-model="font" class="_formBlock">
					<template #label>{{ $ts._pages.font }}</template>
					<option value="serif">{{ $ts._pages.fontSerif }}</option>
					<option value="sans-serif">{{ $ts._pages.fontSansSerif }}</option>
				</MkSelect>

				<MkSwitch v-model="hideTitleWhenPinned" class="_formBlock">{{ $ts._pages.hideTitleWhenPinned }}</MkSwitch>

				<div class="eyeCatch">
					<MkButton v-if="eyeCatchingImageId == null && !readonly" @click="setEyeCatchingImage"><i class="fas fa-plus"></i> {{ $ts._pages.eyeCatchingImageSet }}</MkButton>
					<div v-else-if="eyeCatchingImage">
						<img :src="(eyeCatchingImage.url) ?? undefined" :alt="eyeCatchingImage.name" style="max-width: 100%;"/>
						<MkButton v-if="!readonly" @click="removeEyeCatchingImage()"><i class="fas fa-trash-alt"></i> {{ $ts._pages.eyeCatchingImageRemove }}</MkButton>
					</div>
				</div>
			</div>
		</div>

		<div v-else-if="tab === 'contents'">
			<div>
				<XBlocks v-model="content" class="content" :hpml="hpml"/>

				<MkButton v-if="!readonly" @click="add()"><i class="fas fa-plus"></i></MkButton>
			</div>
		</div>

		<div v-else-if="tab === 'variables'">
			<div class="qmuvgica">
				<XDraggable v-show="variables.length > 0" v-model="variables" tag="div" class="variables" item-key="name" handle=".drag-handle" :group="{ name: 'variables' }" animation="150" :swap-threshold="0.5">
					<template #item="{element}">
						<XVariable
							:model-value="element"
							:removable="true"
							:hpml="hpml"
							:name="element.name"
							:title="element.name"
							:draggable="true"
							@remove="() => removeVariable(element)"
						/>
					</template>
				</XDraggable>

				<MkButton v-if="!readonly" class="add" @click="addVariable()"><i class="fas fa-plus"></i></MkButton>
			</div>
		</div>

		<div v-else-if="tab === 'script'">
			<div>
				<MkTextarea v-model="script" class="_code"/>
			</div>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import type { PageBlockList } from '@/types/page-editor';
import { toApiError } from '@/types/api-error';
import { isRecord } from '@/scripts/form';
import type { ApiRequest } from '@/types/api';
import type { BlockDraft } from '@/scripts/hpml/block';
import type { Variable } from '@/scripts/hpml/expr';
import type { entities } from '@/misskey';
import { defineAsyncComponent, computed, provide, watch, ref } from 'vue';
import 'prismjs';

import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-okaidia.css';
import 'vue-prism-editor/dist/prismeditor.min.css';
import { v4 as uuid } from 'uuid';
import XVariable from './page-editor.script-block.vue';
import XBlocks from './page-editor.blocks.vue';
import MkTextarea from '@/components/form/textarea.vue';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/form/select.vue';
import MkSwitch from '@/components/form/switch.vue';
import MkInput from '@/components/form/input.vue';
import type { Type } from '@/scripts/hpml';
import type { Expr } from '@/scripts/hpml/expr';
import { blockDefs } from '@/scripts/hpml/index';
import { HpmlTypeChecker } from '@/scripts/hpml/type-checker';
import { url } from '@/config';
import { collectPageVars } from '@/scripts/collect-page-vars';
import * as os from '@/os';
import { selectFile } from '@/scripts/select-file';
import { mainRouter } from '@/router';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
import { $i } from '@/account';
const XDraggable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const props = defineProps<{
	initPageId?: string;
	initPageName?: string;
	initUser?: string;
}>();

let tab = ref('settings');
let author = ref<entities.User | null>($i);
let readonly = ref(false);
let page = ref<entities.Page | null>(null);
let pageId = ref<string | null>(null);
let currentName = ref<string | null>(null);
let title = ref('');
let summary = ref<string | null>(null);
let name = ref(Date.now().toString());
let eyeCatchingImage = ref<entities.DriveFile | null>(null);
let eyeCatchingImageId = ref<string | null>(null);
let font = ref<'serif' | 'sans-serif'>('sans-serif');
let content = ref<BlockDraft[]>([]);
let alignCenter = ref(false);
let hideTitleWhenPinned = ref(false);
let variables = ref<Variable[]>([]);
const hpml = ref(new HpmlTypeChecker());
let script = ref('');

provide('readonly', readonly.value);
provide('getScriptBlockList', getScriptBlockList);
provide('getPageBlockList', getPageBlockList);

watch((eyeCatchingImageId), async () => {
	if (eyeCatchingImageId.value == null) {
		eyeCatchingImage.value = null;
	} else {
		eyeCatchingImage.value = await os.api('drive/files/show', {
			fileId: eyeCatchingImageId.value,
		});
	}
});

function getSaveOptions(): ApiRequest<'pages/create'> {
	return {
		title: title.value.trim(),
		name: name.value.trim(),
		summary: summary.value,
		font: font.value,
		script: script.value,
		hideTitleWhenPinned: hideTitleWhenPinned.value,
		alignCenter: alignCenter.value,
		content: content.value,
		variables: variables.value,
		eyeCatchingImageId: eyeCatchingImageId.value,
	};
}

function save() {
	const options = getSaveOptions();

	const onError = (error: unknown) => {
 const err = toApiError(error);
		if (err.id === '3d81ceae-475f-4600-b2a8-2bc116157532') {
			if (isRecord(err.info) && err.info.param === 'name') {
				os.alert({
					type: 'error',
					title: i18n.ts._pages.invalidNameTitle,
					text: i18n.ts._pages.invalidNameText,
				});
			}
		} else if (err.code === 'NAME_ALREADY_EXISTS') {
			os.alert({
				type: 'error',
				text: i18n.ts._pages.nameAlreadyExists,
			});
		}
	};

	if (pageId.value) {
		os.api('pages/update', { ...options, pageId: pageId.value })
		.then(page => {
			currentName.value = name.value.trim();
			os.alert({
				type: 'success',
				text: i18n.ts._pages.updated,
			});
		}).catch(onError);
	} else {
		os.api('pages/create', options)
		.then(created => {
			pageId.value = created.id;
			currentName.value = name.value.trim();
			os.alert({
				type: 'success',
				text: i18n.ts._pages.created,
			});
			mainRouter.push(`/pages/edit/${pageId.value}`);
		}).catch(onError);
	}
}

function del() {
	os.confirm({
		type: 'warning',
		text: i18n.t('removeAreYouSure', { x: title.value.trim() }),
	}).then(({ canceled }) => {
		if (canceled || pageId.value == null) return;
		os.api('pages/delete', {
			pageId: pageId.value,
		}).then(() => {
			os.alert({
				type: 'success',
				text: i18n.ts._pages.deleted,
			});
			mainRouter.push('/pages');
		});
	});
}

function duplicate() {
	title.value = title.value + ' - copy';
	name.value = name.value + '-copy';
	os.api('pages/create', getSaveOptions()).then(created => {
		pageId.value = created.id;
		currentName.value = name.value.trim();
		os.alert({
			type: 'success',
			text: i18n.ts._pages.created,
		});
		mainRouter.push(`/pages/edit/${pageId.value}`);
	});
}

async function add() {
	const { canceled, result: type } = await os.select({
		title: i18n.ts._pages.chooseBlock,
		groupedItems: getPageBlockList(),
	});
	if (canceled || type == null) return;

	const id = uuid();
	content.value.push({ id, type });
}

async function addVariable() {
	let { canceled, result: name } = await os.inputText({
		title: i18n.ts._pages.enterVariableName,
	});
	if (canceled) return;

	if (name == null) return;
 name = name.trim();

	if (hpml.value.isUsedName(name)) {
		os.alert({
			type: 'error',
			text: i18n.ts._pages.variableNameIsAlreadyUsed,
		});
		return;
	}

	const id = uuid();
	variables.value.push({ id, name, type: null });
}

function removeVariable(v: Variable) {
	variables.value = variables.value.filter(x => x.name !== v.name);
}

function getPageBlockList(): ReturnType<PageBlockList> {
	return [{
		label: i18n.ts._pages.contentBlocks,
		items: [
			{ value: 'section', text: i18n.ts._pages.blocks.section },
			{ value: 'text', text: i18n.ts._pages.blocks.text },
			{ value: 'image', text: i18n.ts._pages.blocks.image },
			{ value: 'textarea', text: i18n.ts._pages.blocks.textarea },
			{ value: 'note', text: i18n.ts._pages.blocks.note },
			{ value: 'canvas', text: i18n.ts._pages.blocks.canvas },
		],
	}, {
		label: i18n.ts._pages.inputBlocks,
		items: [
			{ value: 'button', text: i18n.ts._pages.blocks.button },
			{ value: 'radioButton', text: i18n.ts._pages.blocks.radioButton },
			{ value: 'textInput', text: i18n.ts._pages.blocks.textInput },
			{ value: 'textareaInput', text: i18n.ts._pages.blocks.textareaInput },
			{ value: 'numberInput', text: i18n.ts._pages.blocks.numberInput },
			{ value: 'switch', text: i18n.ts._pages.blocks.switch },
			{ value: 'counter', text: i18n.ts._pages.blocks.counter },
		],
	}, {
		label: i18n.ts._pages.specialBlocks,
		items: [
			{ value: 'if', text: i18n.ts._pages.blocks.if },
			{ value: 'post', text: i18n.ts._pages.blocks.post },
		],
	}];
}

function getScriptBlockList(type: Type = null) {
	const list: { category?: string; label: string; items: { value: Expr['type']; text: string }[] }[] = [];

	const blocks = blockDefs.filter(block => type == null || block.out == null || block.out === type || typeof block.out === 'number');

	for (const block of blocks) {
		const category = list.find(x => x.category === block.category);
		if (category) {
			category.items.push({
				value: block.type,
				text: i18n.t(`_pages.script.blocks.${block.type}`),
			});
		} else {
			list.push({
				category: block.category,
				label: i18n.t(`_pages.script.categories.${block.category}`),
				items: [{
					value: block.type,
					text: i18n.t(`_pages.script.blocks.${block.type}`),
				}],
			});
		}
	}

	const userFns = variables.value.filter(x => x.type === 'fn');
	if (userFns.length > 0) {
		list.unshift({
			label: i18n.t('_pages.script.categories.fn'),
			items: userFns.map(v => ({
				value: `fn:${v.name}` as const,
				text: v.name,
			})),
		});
	}

	return list;
}

function setEyeCatchingImage(img: MouseEvent) {
	selectFile(img.currentTarget ?? img.target, null).then(file => {
		eyeCatchingImageId.value = file.id;
	});
}

function removeEyeCatchingImage() {
	eyeCatchingImageId.value = null;
}



async function init() {

	watch((variables), () => {
		hpml.value.variables = variables.value;
	}, { deep: true });

	watch((content), () => {
		hpml.value.pageVars = collectPageVars(content.value);
	}, { deep: true });

	if (props.initPageId) {
		page.value = await os.api('pages/show', {
			pageId: props.initPageId,
		});
	} else if (props.initPageName && props.initUser) {
		page.value = await os.api('pages/show', {
			name: props.initPageName,
			username: props.initUser,
		});
		readonly.value = true;
	}

	if (page.value) {
		author.value = page.value.user;
		pageId.value = page.value.id;
		title.value = page.value.title;
		name.value = page.value.name;
		currentName.value = page.value.name;
		summary.value = page.value.summary;
		if (page.value.font !== 'serif' && page.value.font !== 'sans-serif') throw new TypeError('Invalid page font');
 font.value = page.value.font;
		script.value = page.value.script;
		hideTitleWhenPinned.value = page.value.hideTitleWhenPinned;
		alignCenter.value = page.value.alignCenter;
		content.value = page.value.content;
		variables.value = page.value.variables;
		eyeCatchingImageId.value = page.value.eyeCatchingImageId;
	} else {
		const id = uuid();
		content.value = [{
			id,
			type: 'text',
			text: 'Hello World!',
		}];
	}
}

init();

const headerActions = computed(() => []);

const headerTabs = computed(() => [{
	key: 'settings',
	title: i18n.ts._pages.pageSetting,
	icon: 'fas fa-cog',
}, {
	key: 'contents',
	title: i18n.ts._pages.contents,
	icon: 'fas fa-sticky-note',
}, {
	key: 'variables',
	title: i18n.ts._pages.variables,
	icon: 'fas fa-magic',
}, {
	key: 'script',
	title: i18n.ts.script,
	icon: 'fas fa-code',
}]);

definePageMetadata(computed(() => {
	let title = i18n.ts._pages.newPage;
	if (props.initPageId) {
		title = i18n.ts._pages.editPage;
	}
	else if (props.initPageName && props.initUser) {
		title = i18n.ts._pages.readPage;
	}
	return {
		title: title,
		icon: 'fas fa-pencil-alt',
		};
}));
</script>

<style lang="scss" scoped>
.jqqmcavi {
	> .button {
		& + .button {
			margin-left: 8px;
		}
	}
}

.gwbmwxkm {
	position: relative;

	> header {
		> .title {
			z-index: 1;
			margin: 0;
			padding: 0 16px;
			line-height: 42px;
			font-size: 0.9em;
			font-weight: bold;
			box-shadow: 0 1px rgba(#000, 0.07);

			> i {
				margin-right: 6px;
			}

			&:empty {
				display: none;
			}
		}

		> .buttons {
			position: absolute;
			z-index: 2;
			top: 0;
			right: 0;

			> button {
				padding: 0;
				width: 42px;
				font-size: 0.9em;
				line-height: 42px;
			}
		}
	}

	> section {
		padding: 0 32px 32px 32px;

		@media (max-width: 500px) {
			padding: 0 16px 16px 16px;
		}

		> .view {
			display: inline-block;
			margin: 16px 0 0 0;
			font-size: 14px;
		}

		> .content {
			margin-bottom: 16px;
		}

		> .eyeCatch {
			margin-bottom: 16px;

			> div {
				> img {
					max-width: 100%;
				}
			}
		}
	}
}

.qmuvgica {
	padding: 16px;

	> .variables {
		margin-bottom: 16px;
	}

	> .add {
		margin-bottom: 16px;
	}
}
</style>
