<template>
<div
	v-size="{ max: [310, 500] }" class="gafaadew"
	:class="{ modal, _popup: modal }"
	@dragover.stop="onDragover"
	@dragenter="onDragenter"
	@dragleave="onDragleave"
	@drop.stop="onDrop"
>
	<header>
		<button v-if="!fixed" class="cancel _button" @click="cancel"><i class="fas fa-times"></i></button>
		<button v-click-anime v-tooltip="i18n.ts.switchAccount" class="account _button" @click="openAccountMenu">
			<MkAvatar :user="postAccount ?? account" class="avatar"/>
		</button>
		<div class="right">
			<span class="text-count" :class="{ over: textLength > maxTextLength }">{{ maxTextLength - textLength }}</span>
			<span v-if="localOnly" class="local-only"><i class="fas fa-biohazard"></i></span>
			<button ref="visibilityButton" v-tooltip="i18n.ts.visibility" class="_button visibility" :disabled="channel != null" @click="setVisibility">
				<span v-if="visibility === 'public'"><i class="fas fa-globe"></i></span>
				<span v-if="visibility === 'home'"><i class="fas fa-home"></i></span>
				<span v-if="visibility === 'followers'"><i class="fas fa-unlock"></i></span>
				<span v-if="visibility === 'specified'"><i class="fas fa-envelope"></i></span>
			</button>
			<button v-tooltip="i18n.ts.previewNoteText" class="_button preview" :class="{ active: showPreview }" @click="showPreview = !showPreview"><i class="fas fa-file-code"></i></button>
			<button class="submit _buttonGradate" :disabled="!canPost" data-cy-open-post-form-submit @click="post">{{ submitText }}<i :class="reply ? 'fas fa-reply' : renote ? 'fas fa-quote-right' : 'fas fa-paper-plane'"></i></button>
		</div>
	</header>
	<div class="form" :class="{ fixed }">
		<XNoteSimple v-if="reply" class="preview" :note="reply"/>
		<XNoteSimple v-if="renote" class="preview" :note="renote"/>
		<div v-if="quoteId" class="with-quote"><i class="fas fa-quote-left"></i> {{ i18n.ts.quoteAttached }}<button @click="quoteId = null"><i class="fas fa-times"></i></button></div>
		<div v-if="visibility === 'specified'" class="to-specified">
			<span style="margin-right: 8px;">{{ i18n.ts.recipient }}</span>
			<div class="visibleUsers">
				<span v-for="u in visibleUsers" :key="u.id">
					<MkAcct :user="u"/>
					<button class="_button" @click="removeVisibleUser(u)"><i class="fas fa-times"></i></button>
				</span>
				<button class="_buttonPrimary" @click="addVisibleUser"><i class="fas fa-plus fa-fw"></i></button>
			</div>
		</div>
		<MkInfo v-if="hasNotSpecifiedMentions" warn class="hasNotSpecifiedMentions">{{ i18n.ts.notSpecifiedMentionWarning }} - <button class="_textButton" @click="addMissingMention()">{{ i18n.ts.add }}</button></MkInfo>
		<input v-show="useCw" ref="cwInputEl" v-model="cw" class="cw" :placeholder="i18n.ts.annotation" @keydown="onKeydown">
		<textarea ref="textareaEl" v-model="text" class="text" :class="{ withCw: useCw }" :disabled="posting" :placeholder="placeholder" data-cy-post-form-text @keydown="onKeydown" @paste="onPaste" @compositionupdate="onCompositionUpdate" @compositionend="onCompositionEnd"/>
		<div ref="mask" class="mask"></div>
		<input v-show="withHashtags" ref="hashtagsInputEl" v-model="hashtags" class="hashtags" :placeholder="i18n.ts.hashtags" list="hashtags">
		<XPostFormAttaches class="attaches" :files="files" @updated="updateFiles" @detach="detachFile" @changeSensitive="updateFileSensitive" @changeName="updateFileName"/>
		<XPollEditor v-if="poll" v-model="poll" />
		<XNotePreview v-if="showPreview" class="preview" :text="text"/>
		<footer>
			<button v-tooltip="i18n.ts.attachFile" class="_button" @click="chooseFileFrom"><i class="fas fa-photo-video"></i></button>
			<button v-tooltip="i18n.ts.attachVideoFile" class="_button" @click="chooseFileFromEnc"><i class="far fa-file-video"></i></button>
			<button v-tooltip="i18n.ts.poll" class="_button" :class="{ active: poll }" @click="togglePoll"><i class="fas fa-poll-h"></i></button>
			<button v-tooltip="i18n.ts.useCw" class="_button" :class="{ active: useCw }" @click="useCw = !useCw"><i class="fas fa-eye-slash"></i></button>
			<button v-tooltip="i18n.ts.mention" class="_button" @click="insertMention"><i class="fas fa-at"></i></button>
			<button v-tooltip="i18n.ts.hashtags" class="_button" :class="{ active: withHashtags }" @click="withHashtags = !withHashtags"><i class="fas fa-hashtag"></i></button>
			<button v-tooltip="i18n.ts.emoji" class="_button" @click="insertEmoji"><i class="fas fa-laugh-squint"></i></button>
			<button v-if="postFormActions.length > 0" v-tooltip="i18n.ts.plugin" class="_button" @click="showActions"><i class="fas fa-plug"></i></button>
		</footer>
		<datalist id="hashtags">
			<option v-for="hashtag in recentHashtags" :key="hashtag" :value="hashtag"/>
		</datalist>
	</div>
</div>
</template>

<script lang="ts" setup>

import type { NoteDraft, PollDraft, PostFormProps } from '@/types/post';
import { requireAccount } from '@/account';
const account = requireAccount();

import type { entities } from '@/misskey';
import { inject, watch, nextTick, onMounted, defineAsyncComponent, ref, computed } from 'vue';
import * as mfm from 'mfm-js';
import * as misskey from '@/misskey';
import insertTextAtCursor from 'insert-text-at-cursor';
import { length } from 'stringz';
import { toASCII } from 'punycode/';
import * as Acct from 'misskey-js/built/acct';
import { throttle } from 'throttle-debounce';
import XNoteSimple from '@/components/MkNoteSimple.vue';
import XNotePreview from '@/components/MkNotePreview.vue';
import XPostFormAttaches from '@/components/MkPostFormAttaches.vue';
import XPollEditor from '@/components/MkPollEditor.vue';
import { host, url } from '@/config';
import { erase, unique } from '@/scripts/array';
import { extractMentions } from '@/scripts/extract-mentions';
import { formatTimeString } from '@/scripts/format-time-string';
import { Autocomplete } from '@/scripts/autocomplete';
import * as os from '@/os';
import { stream } from '@/stream';
import { selectFiles } from '@/scripts/select-file';
import { selectFileEnc } from '@/scripts/select-file-enc';
import { defaultStore, notePostInterruptors, postFormActions } from '@/store';
import MkInfo from '@/components/MkInfo.vue';
import { i18n } from '@/i18n';
import { instance } from '@/instance';
import { getAccounts, openAccountMenu as openAccountMenu_ } from '@/account';
import { noteRequest, requestPoll } from '@/scripts/note-request';
import type { ApiRequest } from '@/types/api';
import { composeSettings } from '@/scripts/compose-settings';
import { uploadFile } from '@/scripts/upload';

const modal = inject('modal');

const props = withDefaults(defineProps<PostFormProps>(), {
	initialVisibleUsers: () => [],
 initialLocalOnly: undefined,
	autofocus: true,
});

const emit = defineEmits<{
	(ev: 'posted'): void;
	(ev: 'cancel'): void;
	(ev: 'esc'): void;
}>();

const textareaEl = ref<HTMLTextAreaElement | null>(null);
const cwInputEl = ref<HTMLInputElement | null>(null);
const hashtagsInputEl = ref<HTMLInputElement | null>(null);
const visibilityButton = ref<HTMLElement | null>(null);

let posting = ref(false);
let text = ref(props.initialText ?? '');
let files = ref(props.initialFiles ?? []);
let poll = ref<PollDraft | null>(null);
let useCw = ref(false);
let showPreview = ref(false);
let cw = ref<string | null>(null);
const initialSettings = composeSettings(props, defaultStore.state);
let localOnly = ref(initialSettings.localOnly);
let visibility = ref(initialSettings.visibility);
let visibleUsers = ref<entities.UserLite[]>([]);
if (props.initialVisibleUsers) {
	props.initialVisibleUsers.forEach(pushVisibleUser);
}

let draghover = ref(false);
let quoteId = ref<string | null>(null);
let hasNotSpecifiedMentions = ref(false);
let recentHashtags = ref<string[]>(JSON.parse(localStorage.getItem('hashtags') || '[]'));
let imeText = ref('');

const typing = throttle(3000, () => {
	if (props.channel) {
		stream.send('typingOnChannel', { channel: props.channel.id });
	}
});

const draftKey = computed((): string => {
	let key = props.channel ? `channel:${props.channel.id}` : '';

	if (props.renote) {
		key += `renote:${props.renote.id}`;
	} else if (props.reply) {
		key += `reply:${props.reply.id}`;
	} else {
		key += 'note';
	}

	return key;
});

const placeholder = computed((): string => {
	if (props.renote) {
		return i18n.ts._postForm.quotePlaceholder;
	} else if (props.reply) {
		return i18n.ts._postForm.replyPlaceholder;
	} else if (props.channel) {
		return i18n.ts._postForm.channelPlaceholder;
	} else {
		const xs = [
			i18n.ts._postForm._placeholders.a,
			i18n.ts._postForm._placeholders.b,
			i18n.ts._postForm._placeholders.c,
			i18n.ts._postForm._placeholders.d,
			i18n.ts._postForm._placeholders.e,
			i18n.ts._postForm._placeholders.f,
		];
		return xs[Math.floor(Math.random() * xs.length)];
	}
});

const submitText = computed((): string => {
	return props.renote
		? i18n.ts.quote
		: props.reply
			? i18n.ts.reply
			: i18n.ts.note;
});

const textLength = computed((): number => {
	return length((text.value + imeText.value).trim());
});

const maxTextLength = computed((): number => {
	return instance.maxNoteTextLength ?? 1000;
});

const canPost = computed((): boolean => {
	return !posting.value &&
		(1 <= textLength.value || 1 <= files.value.length || !!poll.value || !!props.renote) &&
		(textLength.value <= maxTextLength.value) &&
		(!poll.value || poll.value.choices.length >= 2);
});

const withHashtags = computed(defaultStore.makeGetterSetter('postFormWithHashtags'));
const hashtags = computed<string>(defaultStore.makeGetterSetter('postFormHashtags'));

watch((text), () => {
	checkMissingMention();
});

watch((visibleUsers), () => {
	checkMissingMention();
}, {
	deep: true,
});

if (props.mention) {
	text.value = props.mention.host ? `@${props.mention.username}@${toASCII(props.mention.host)}` : `@${props.mention.username}`;
	text.value += ' ';
}

if (props.reply && (props.reply.user.username !== account.username || (props.reply.user.host != null && props.reply.user.host !== host))) {
	text.value = `@${props.reply.user.username}${props.reply.user.host != null ? '@' + toASCII(props.reply.user.host) : ''} `;
}

if (props.reply && props.reply.text != null) {
	const ast = mfm.parse(props.reply.text);
	const otherHost = props.reply.user.host;

	for (const x of extractMentions(ast)) {
		const mention = x.host ?
			`@${x.username}@${toASCII(x.host)}` :
			(otherHost == null || otherHost === host) ?
				`@${x.username}` :
				`@${x.username}@${toASCII(otherHost)}`;

		// 自分は除外
		if (account.username === x.username && (x.host == null || x.host === host)) continue;

		// 重複は除外
		if (text.value.includes(`${mention} `)) continue;

		text.value += `${mention} `;
	}
}

if (props.channel) {
	visibility.value = 'public';
	localOnly.value = true; // TODO: チャンネルが連合するようになった折には消す
}

// 公開以外へのリプライ時は元の公開範囲を引き継ぐ
if (props.reply && ['home', 'followers', 'specified'].includes(props.reply.visibility)) {
	visibility.value = props.reply.visibility;
	if (props.reply.visibility === 'specified') {
 const reply = props.reply;
		os.api('users/show', {
			userIds: (reply.visibleUserIds ?? []).filter(uid => uid !== account.id && uid !== reply.userId),
		}).then(users => {
			users.forEach(pushVisibleUser);
		});

		if (props.reply.userId !== account.id) {
			os.api('users/show', { userId: props.reply.userId }).then(user => {
				pushVisibleUser(user);
			});
		}
	}
}

if (props.specified) {
	visibility.value = 'specified';
	pushVisibleUser(props.specified);
}

// keep cw when reply
if (defaultStore.state.keepCw && props.reply && props.reply.cw) {
	useCw.value = true;
	cw.value = props.reply.cw;
}

function watchForDraft() {
	watch((text), () => saveDraft());
	watch((useCw), () => saveDraft());
	watch((cw), () => saveDraft());
	watch((poll), () => saveDraft());
	watch((files), () => saveDraft(), { deep: true });
	watch((visibility), () => saveDraft());
	watch((localOnly), () => saveDraft());
}

function checkMissingMention() {
	if (visibility.value === 'specified') {
		const ast = mfm.parse(text.value);

		for (const x of extractMentions(ast)) {
			if (!visibleUsers.value.some(u => (u.username === x.username) && (u.host === x.host))) {
				hasNotSpecifiedMentions.value = true;
				return;
			}
		}
		hasNotSpecifiedMentions.value = false;
	}
}

function addMissingMention() {
	const ast = mfm.parse(text.value);

	for (const x of extractMentions(ast)) {
		if (!visibleUsers.value.some(u => (u.username === x.username) && (u.host === x.host))) {
			os.api('users/show', { username: x.username, host: x.host }).then(user => {
				visibleUsers.value.push(user);
			});
		}
	}
}

function togglePoll() {
	if (poll.value) {
		poll.value = null;
	} else {
		poll.value = {
			choices: ['', ''],
			multiple: false,
			expiresAt: null,
			expiredAfter: null,
		};
	}
}



function focus() {
	if (textareaEl.value) {
		textareaEl.value.focus();
		textareaEl.value.setSelectionRange(textareaEl.value.value.length, textareaEl.value.value.length);
	}
}

function chooseFileFrom(ev: MouseEvent) {
	selectFiles(ev.currentTarget ?? ev.target, i18n.ts.attachFile).then(files_ => {
		for (const file of files_) {
			files.value.push(file);
		}
	});
}

function chooseFileFromEnc(ev: MouseEvent) {
	selectFileEnc(ev.currentTarget ?? ev.target, i18n.ts.attachVideoFile).then(files_ => {
		files.value.push(files_);
	});
}

function detachFile(id: string) {
	files.value = files.value.filter(x => x.id !== id);
}

function updateFiles(_files: entities.DriveFile[]) {
	files.value = _files;
}

function updateFileSensitive(file: entities.DriveFile, sensitive: boolean) {
	files.value[files.value.findIndex(x => x.id === file.id)].isSensitive = sensitive;
}

function updateFileName(file: entities.DriveFile, name: string) {
	files.value[files.value.findIndex(x => x.id === file.id)].name = name;
}

function upload(file: File, name?: string) {
	uploadFile(file, defaultStore.state.uploadFolder, name).then(res => {
		files.value.push(res);
	});
}

function setVisibility() {
	if (props.channel) {
		// TODO: information dialog
		return;
	}

	os.popup(defineAsyncComponent(() => import('@/components/MkVisibilityPicker.vue')), {
		currentVisibility: visibility.value,
		currentLocalOnly: localOnly.value,
		src: visibilityButton.value,
	}, {
		changeVisibility: (v: misskey.NoteVisibility) => {
			visibility.value = v;
			if (defaultStore.state.rememberNoteVisibility) {
				defaultStore.set('visibility', visibility.value);
			}
		},
		changeLocalOnly: (v: boolean) => {
			localOnly.value = v;
			if (defaultStore.state.rememberNoteVisibility) {
				defaultStore.set('localOnly', localOnly.value);
			}
		},
	}, 'closed');
}

function pushVisibleUser(user: entities.UserLite) {
	if (!visibleUsers.value.some(u => u.username === user.username && u.host === user.host)) {
		visibleUsers.value.push(user);
	}
}

function addVisibleUser() {
	os.selectUser().then(user => {
		pushVisibleUser(user);
	});
}

function removeVisibleUser(user: entities.UserLite) {
	visibleUsers.value = erase(user, visibleUsers.value);
}

function clear() {
	text.value = '';
	files.value = [];
	poll.value = null;
	quoteId.value = null;
}

function onKeydown(ev: KeyboardEvent) {
	if ((ev.which === 10 || ev.which === 13) && (ev.ctrlKey || ev.metaKey) && canPost.value) post();
	if (ev.which === 27) emit('esc');
	typing();
}

function onCompositionUpdate(ev: CompositionEvent) {
	imeText.value = ev.data;
	typing();
}

function onCompositionEnd(ev: CompositionEvent) {
	imeText.value = '';
}

async function onPaste(ev: ClipboardEvent) {
 const evclipboardData = ev.clipboardData;
 if (evclipboardData == null) return;

	for (const { item, i } of Array.from(evclipboardData.items).map((item, i) => ({ item, i }))) {
		if (item.kind === 'file') {
			const file = item.getAsFile();
 if (!file) continue;
			const lio = file.name.lastIndexOf('.');
			const ext = lio >= 0 ? file.name.slice(lio) : '';
			const formatted = `${formatTimeString(new Date(file.lastModified), defaultStore.state.pastedFileName).replace(/{{number}}/g, `${i + 1}`)}${ext}`;
			upload(file, formatted);
		}
	}

	const paste = evclipboardData.getData('text');

	if (!props.renote && !quoteId.value && paste.startsWith(url + '/notes/')) {
		ev.preventDefault();

		os.confirm({
			type: 'info',
			text: i18n.ts.quoteQuestion,
		}).then(({ canceled }) => {
			if (canceled) {
				if (textareaEl.value == null) return;
				insertTextAtCursor(textareaEl.value, paste);
				return;
			}

			quoteId.value = paste.substr(url.length).match(/^\/notes\/(.+?)\/?$/)?.[1] ?? null;
		});
	}
}

function onDragover(ev: DragEvent) {
 const evdataTransfer = ev.dataTransfer;
 if (evdataTransfer == null) return;

	if (!evdataTransfer.items[0]) return;
	const isFile = evdataTransfer.items[0].kind === 'file';
	const isDriveFile = evdataTransfer.types[0] === _DATA_TRANSFER_DRIVE_FILE_;
	if (isFile || isDriveFile) {
		ev.preventDefault();
		draghover.value = true;
		switch (evdataTransfer.effectAllowed) {
			case 'all':
			case 'uninitialized':
			case 'copy':
			case 'copyLink':
			case 'copyMove':
				evdataTransfer.dropEffect = 'copy';
				break;
			case 'linkMove':
			case 'move':
				evdataTransfer.dropEffect = 'move';
				break;
			default:
				evdataTransfer.dropEffect = 'none';
				break;
		}
	}
}

function onDragenter(ev: DragEvent) {
	draghover.value = true;
}

function onDragleave(ev: DragEvent) {
	draghover.value = false;
}

function onDrop(ev: DragEvent): void {
 const evdataTransfer = ev.dataTransfer;
 if (evdataTransfer == null) return;

	draghover.value = false;

	// ファイルだったら
	if (evdataTransfer.files.length > 0) {
		ev.preventDefault();
		for (const x of Array.from(evdataTransfer.files)) upload(x);
		return;
	}

	//#region ドライブのファイル
	const driveFile = evdataTransfer.getData(_DATA_TRANSFER_DRIVE_FILE_);
	if (driveFile != null && driveFile !== '') {
		const file = JSON.parse(driveFile);
		files.value.push(file);
		ev.preventDefault();
	}
	//#endregion
}

function saveDraft() {
	const draftData: Record<string, NoteDraft> = JSON.parse(localStorage.getItem('drafts') || '{}');

	draftData[draftKey.value] = {
		updatedAt: new Date().toISOString(),
		data: {
			text: text.value,
			useCw: useCw.value,
			cw: cw.value,
			visibility: visibility.value,
			localOnly: localOnly.value,
			files: files.value,
			poll: poll.value,
		},
	};

	localStorage.setItem('drafts', JSON.stringify(draftData));
}

function deleteDraft() {
	const draftData: Record<string, NoteDraft> = JSON.parse(localStorage.getItem('drafts') || '{}');

	delete draftData[draftKey.value];

	localStorage.setItem('drafts', JSON.stringify(draftData));
}

async function post() {
	const draftData = {
		text: text.value === '' ? undefined : text.value,
		fileIds: files.value.length > 0 ? files.value.map(f => f.id) : undefined,
		replyId: props.reply ? props.reply.id : undefined,
		renoteId: props.renote ? props.renote.id : quoteId.value ? quoteId.value : undefined,
		channelId: props.channel ? props.channel.id : undefined,
		poll: requestPoll(poll.value),
		cw: useCw.value ? cw.value || '' : undefined,
		localOnly: localOnly.value,
		visibility: visibility.value,
		visibleUserIds: visibility.value === 'specified' ? visibleUsers.value.map(u => u.id) : undefined,
	};

	if (withHashtags.value && hashtags.value && hashtags.value.trim() !== '') {
		const hashtags_ = hashtags.value.trim().split(' ').map((x) => x.startsWith('#') ? x : '#' + x).join(' ');
		draftData.text = draftData.text ? `${draftData.text} ${hashtags_}` : hashtags_;
	}

 const initialRequest = noteRequest(draftData);
 if (!initialRequest) return;
 let postData: ApiRequest<'notes/create'> = initialRequest;
	// plugin
	if (notePostInterruptors.length > 0) {
		for (const interruptor of notePostInterruptors) {
			postData = await interruptor.handler(JSON.parse(JSON.stringify(postData)));
		}
	}

	let token: string | undefined;

	const chosenAccount = postAccount.value;
 if (chosenAccount) {
		const storedAccounts = await getAccounts();
		token = storedAccounts.find(x => x.id === chosenAccount.id)?.token;
	}

	posting.value = true;
	os.api('notes/create', postData, token).then(() => {
		clear();
		nextTick(() => {
			deleteDraft();
			emit('posted');
			if (postData.text && postData.text !== '') {
				const hashtags_ = mfm.parse(postData.text).filter(x => x.type === 'hashtag').map(x => x.props.hashtag);
				const history = JSON.parse(localStorage.getItem('hashtags') || '[]') as string[];
				localStorage.setItem('hashtags', JSON.stringify(unique(hashtags_.concat(history))));
			}
			posting.value = false;
			postAccount.value = null;
		});
	}).catch(err => {
		posting.value = false;
		os.alert({
			type: 'error',
			text: err.message + '\n' + (err as any).id,
		});
	});
}

function cancel() {
	emit('cancel');
}

function insertMention() {
	os.selectUser().then(user => {
		if (textareaEl.value == null) return;
		insertTextAtCursor(textareaEl.value, '@' + Acct.toString(user) + ' ');
	});
}

async function insertEmoji(ev: MouseEvent) {
	os.openEmojiPicker(ev.currentTarget ?? ev.target, {}, textareaEl.value);
}

function showActions(ev: MouseEvent) {
	os.popupMenu(postFormActions.map(action => ({
		text: action.title,
		action: () => {
			action.handler({
				text: text.value,
			}, (key: string, value: string) => {
				if (key === 'text') { text.value = value; }
			});
		},
	})), ev.currentTarget ?? ev.target);
}

let postAccount = ref<misskey.entities.UserDetailed | null>(null);

function openAccountMenu(ev: MouseEvent) {
	openAccountMenu_({
		withExtraOperation: false,
		includeCurrentAccount: true,
		active: postAccount.value != null ? postAccount.value.id : account.id,
		onChoose: (chosenAccount) => {
			if (chosenAccount.id === account.id) {
				postAccount.value = null;
			} else {
				postAccount.value = chosenAccount;
			}
		},
	}, ev);
}

watch([textareaEl, cwInputEl, hashtagsInputEl], ([textarea, cwInput, hashtagInput], _previous, onCleanup) => {
 const instances: Autocomplete[] = [];
 if (textarea) instances.push(new Autocomplete(textarea, text));
 const cwElement = cwInput;
 if (cwElement) instances.push(new Autocomplete(cwElement, cw));
 if (hashtagInput) instances.push(new Autocomplete(hashtagInput, hashtags));
 onCleanup(() => instances.forEach(instance => instance.detach()));
}, { flush: 'post' });

onMounted(() => {
	if (props.autofocus) {
		focus();

		nextTick(() => {
			focus();
		});
	}


	nextTick(() => {
		// 書きかけの投稿を復元
		if (!props.instant && !props.mention && !props.specified) {
			const drafts: Record<string, NoteDraft> = JSON.parse(localStorage.getItem('drafts') || '{}');
 const draft = drafts[draftKey.value];
			if (draft) {
				text.value = draft.data.text;
				useCw.value = draft.data.useCw;
				cw.value = draft.data.cw;
				visibility.value = draft.data.visibility;
				localOnly.value = draft.data.localOnly;
				files.value = (draft.data.files || []).filter(draftFile => draftFile);
				if (draft.data.poll) {
					poll.value = draft.data.poll;
				}
			}
		}

		// 削除して編集
		if (props.initialNote) {
			const init = props.initialNote;
			text.value = init.text ? init.text : '';
			files.value = init.files;
			cw.value = init.cw ?? null;
			useCw.value = init.cw != null;
			if (init.poll) {
				poll.value = {
					choices: init.poll.choices.map(x => x.text),
					multiple: init.poll.multiple,
					expiresAt: init.poll.expiresAt,
					expiredAfter: undefined,
				};
			}
			visibility.value = init.visibility;
			localOnly.value = init.localOnly ?? false;
			quoteId.value = init.renote ? init.renote.id : null;
		}

		nextTick(() => watchForDraft());
	});
});
</script>

<style lang="scss" scoped>
.gafaadew {
	position: relative;

	&.modal {
		width: 100%;
		max-width: 520px;
	}

	> header {
		z-index: 1000;
		height: 66px;

		> .cancel {
			padding: 0;
			font-size: 20px;
			width: 64px;
			line-height: 66px;
		}

		> .account {
			height: 100%;
			aspect-ratio: 1/1;
			display: inline-flex;
			vertical-align: bottom;

			> .avatar {
				width: 28px;
				height: 28px;
				margin: auto;
			}
		}

		> .right {
			position: absolute;
			top: 0;
			right: 0;

			> .text-count {
				opacity: 0.7;
				line-height: 66px;
			}

			> .visibility {
				height: 34px;
				width: 34px;
				margin: 0 0 0 8px;

				& + .localOnly {
					margin-left: 0 !important;
				}
			}

			> .local-only {
				margin: 0 0 0 12px;
				opacity: 0.7;
			}

			> .preview {
				display: inline-block;
				padding: 0;
				margin: 0 8px 0 0;
				font-size: 16px;
				width: 34px;
				height: 34px;
				border-radius: 6px;

				&:hover {
					background: var(--X5);
				}

				&.active {
					color: var(--accent);
				}
			}

			> .submit {
				margin: 16px 16px 16px 0;
				padding: 0 12px;
				line-height: 34px;
				font-weight: bold;
				vertical-align: bottom;
				border-radius: 4px;
				font-size: 0.9em;

				&:disabled {
					opacity: 0.7;
				}

				> i {
					margin-left: 6px;
				}
			}
		}
	}

	> .form {
		> .preview {
			padding: 16px;
		}

		> .with-quote {
			margin: 0 0 8px 0;
			color: var(--accent);

			> button {
				padding: 4px 8px;
				color: var(--accentAlpha04);

				&:hover {
					color: var(--accentAlpha06);
				}

				&:active {
					color: var(--accentDarken30);
				}
			}
		}

		> .to-specified {
			padding: 6px 24px;
			margin-bottom: 8px;
			overflow: auto;
			white-space: nowrap;

			> .visibleUsers {
				display: inline;
				top: -1px;
				font-size: 14px;

				> button {
					padding: 4px;
					border-radius: 8px;
				}

				> span {
					margin-right: 14px;
					padding: 8px 0 8px 8px;
					border-radius: 8px;
					background: var(--X4);

					> button {
						padding: 4px 8px;
					}
				}
			}
		}

		> .hasNotSpecifiedMentions {
			margin: 0 20px 16px 20px;
		}

		> .cw,
		> .hashtags,
		> .text {
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

			&:focus {
				outline: none;
			}

			&:disabled {
				opacity: 0.5;
			}
		}

		> .cw {
			z-index: 1;
			padding-bottom: 8px;
			border-bottom: solid 0.5px var(--divider);
		}

		> .hashtags {
			z-index: 1;
			padding-top: 8px;
			padding-bottom: 8px;
			border-top: solid 0.5px var(--divider);
		}

		> .text {
			max-width: 100%;
			min-width: 100%;
			min-height: 90px;
			height: 250px;

			&.withCw {
				padding-top: 8px;
			}
		}

		> footer {
			padding: 0 16px 16px 16px;

			> button {
				display: inline-block;
				padding: 0;
				margin: 0;
				font-size: 16px;
				width: 48px;
				height: 48px;
				border-radius: 6px;

				&:hover {
					background: var(--X5);
				}

				&.active {
					color: var(--accent);
				}
			}
		}
	}

	&.max-width_500px {
		> header {
			height: 50px;

			> .cancel {
				width: 50px;
				line-height: 50px;
			}

			> .right {
				> .text-count {
					line-height: 50px;
				}

				> .submit {
					margin: 8px;
				}
			}
		}

		> .form {
			> .to-specified {
				padding: 6px 16px;
			}

			> .cw,
			> .hashtags,
			> .text {
				padding: 0 16px;
			}

			> .text {
				min-height: 80px;
			}

			> footer {
				padding: 0 8px 8px 8px;
			}
		}
	}

	&.max-width_310px {
		> .form {
			> footer {
				> button {
					font-size: 14px;
					width: 44px;
				height: 44px;
				}
			}
		}
	}
}
</style>
