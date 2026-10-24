import type { Statusbar } from '@/types/statusbar';
import { markRaw, ref } from 'vue';
import type { entities } from '@/misskey';
import type { ApiRequest } from '@/types/api';
import type { Form } from '@/scripts/form';
import type { serialize } from '@syuilo/aiscript/built/serializer';
import { StorageWatchers } from './scripts/storage-watchers';
import { Storage } from './pizzax';


export const postFormActions: { title: string; handler: (form: { text: string }, update: (key: string, value: string) => void) => void }[] = [];
export const userActions: { title: string; handler: (user: entities.UserDetailed) => void }[] = [];
export const noteActions: { title: string; handler: (note: entities.Note) => void }[] = [];
export const noteViewInterruptors: { handler: (note: entities.Note) => Promise<entities.Note> }[] = [];
export const notePostInterruptors: { handler: (note: ApiRequest<'notes/create'>) => Promise<ApiRequest<'notes/create'>> }[] = [];

// TODO: それぞれいちいちwhereとかdefaultというキーを付けなきゃいけないの冗長なのでなんとかする(ただ型定義が面倒になりそう)
//       あと、現行の定義の仕方なら「whereが何であるかに関わらずキー名の重複不可」という制約を付けられるメリットもあるからそのメリットを引き継ぐ方法も考えないといけない
export const defaultStore = markRaw(new Storage('base', {
	tutorial: {
		where: 'account',
		default: 0,
	},
	keepCw: {
		where: 'account',
		default: true,
	},
	showFullAcct: {
		where: 'account',
		default: false,
	},
	rememberNoteVisibility: {
		where: 'account',
		default: true
	},
	defaultNoteVisibility: {
		where: 'account',
		default: 'public' as import('../../shared/constants').NoteVisibility,
	},
	defaultNoteLocalOnly: {
		where: 'account',
		default: false,
	},
	uploadFolder: {
		where: 'account',
		default: null as string | null,
	},
	pastedFileName: {
		where: 'account',
		default: 'yyyy-MM-dd HH-mm-ss [{{number}}]',
	},
	keepOriginalUploading: {
		where: 'account',
		default: false,
	},
	memo: {
		where: 'account',
		default: null as string | null,
	},
	reactions: {
		where: 'account',
		default: ['👍', '❤️', '😆', '🤔', '😮', '🎉', '💢', '😥', '😇', '🍮'],
	},
	mutedWords: {
		where: 'account',
		default: [] as (string | string[])[],
	},
	mutedAds: {
		where: 'account',
		default: [] as string[],
	},

	menu: {
		where: 'deviceAccount',
		default: [
			'notifications',
			'favorites',
			'drive',
			'followRequests',
			'-',
			'explore',
			'announcements',
			'search',
			'-',
			'ui',
		],
	},
	visibility: {
		where: 'deviceAccount',
		default: 'public' as 'public' | 'home' | 'followers' | 'specified',
	},
	localOnly: {
		where: 'deviceAccount',
		default: false,
	},
	statusbars: {
		where: 'deviceAccount',
		default: [] as Statusbar[],
	},
	widgets: {
		where: 'deviceAccount',
		default: [] as {
			name: string;
			id: string;
			place?: string | null;
			data: Record<string, unknown>;
		}[],
	},
	tl: {
		where: 'deviceAccount',
		default: {
			src: 'home' as 'home' | 'local' | 'social' | 'global',
			arg: null,
		},
	},

	overridedDeviceKind: {
		where: 'device',
		default: null as null | 'smartphone' | 'tablet' | 'desktop',
	},
	serverDisconnectedBehavior: {
		where: 'device',
		default: 'quiet' as 'quiet' | 'reload' | 'dialog',
	},
	nsfw: {
		where: 'device',
		default: 'respect' as 'respect' | 'force' | 'ignore',
	},
	animation: {
		where: 'device',
		default: true,
	},
	animatedMfm: {
		where: 'device',
		default: true,
	},
	loadRawImages: {
		where: 'device',
		default: false,
	},
	imageNewTab: {
		where: 'device',
		default: false,
	},
	disableShowingAnimatedImages: {
		where: 'device',
		default: false,
	},
	disablePagesScript: {
		where: 'device',
		default: false,
	},
	useOsNativeEmojis: {
		where: 'device',
		default: false,
	},
	disableDrawer: {
		where: 'device',
		default: true
	},
	useBlurEffectForModal: {
		where: 'device',
		default: true,
	},
	useBlurEffect: {
		where: 'device',
		default: true,
	},
	showFixedPostForm: {
		where: 'device',
		default: false,
	},
	enableInfiniteScroll: {
		where: 'device',
		default: true,
	},
	useReactionPickerForContextMenu: {
		where: 'device',
		default: true
	},
	showGapBetweenNotesInTimeline: {
		where: 'device',
		default: false,
	},
	darkMode: {
		where: 'device',
		default: false,
	},
	instanceTicker: {
		where: 'device',
		default: 'remote' as 'none' | 'remote' | 'always',
	},
	reactionPickerSize: {
		where: 'device',
		default: 1,
	},
	reactionPickerWidth: {
		where: 'device',
		default: 3
	},
	reactionPickerHeight: {
		where: 'device',
		default: 4
	},
	reactionPickerUseDrawerForMobile: {
		where: 'device',
		default: false,
	},
	recentlyUsedEmojis: {
		where: 'device',
		default: [] as string[],
	},
	recentlyUsedUsers: {
		where: 'device',
		default: [] as string[],
	},
	defaultSideView: {
		where: 'device',
		default: false,
	},
	menuDisplay: {
		where: 'device',
		default: 'sideFull' as 'sideFull' | 'sideIcon' | 'top',
	},
	reportError: {
		where: 'device',
		default: false,
	},
	squareAvatars: {
		where: 'device',
		default: false,
	},
	postFormWithHashtags: {
		where: 'device',
		default: false,
	},
	postFormHashtags: {
		where: 'device',
		default: '',
	},
	themeInitial: {
		where: 'device',
		default: true,
	},
	numberOfPageCache: {
		where: 'device',
		default: 5,
	},
	aiChanMode: {
		where: 'device',
		default: false,
	},
	mediaProxy: {
		where: 'device',
		default: '',
	},
}));

// TODO: 他のタブと永続化されたstateを同期

const PREFIX = 'miux:';

export type Plugin = {
 version: string; author: string; description?: string; permissions?: string[]; config?: Form;
	id: string;
	name: string;
	active: boolean;
	configData: Record<string, unknown>;
	token: string | null;
	ast: ReturnType<typeof serialize>;
};

/**
 * 常にメモリにロードしておく必要がないような設定情報を保管するストレージ(非リアクティブ)
 */
import { defaultSound } from '@/scripts/sound-settings';
import lightTheme from '@/themes/l-simkey.json5';
import darkTheme from '@/themes/d-simkey.json5';

export class ColdDeviceStorage {
	public static default = {
		lightTheme,
		darkTheme,
		syncDeviceDarkMode: true,
		plugins: [] as Plugin[],
		mediaVolume: 0.5,
		sound_masterVolume: 0.3,
		sound_note: defaultSound('syuilo/down'),
		sound_noteMy: defaultSound('syuilo/up'),
		sound_notification: defaultSound('syuilo/pope2'),
		sound_chat: defaultSound('syuilo/pope1'),
		sound_chatBg: defaultSound('syuilo/waon'),
		sound_antenna: defaultSound('syuilo/triple'),
		sound_channel: defaultSound('syuilo/square-pico'),
	};

	public static watchers = new StorageWatchers<typeof ColdDeviceStorage.default>();

	public static get<T extends keyof typeof ColdDeviceStorage.default>(key: T): typeof ColdDeviceStorage.default[T] {
		// TODO: indexedDBにする
		//       ただしその際はnullチェックではなくキー存在チェックにしないとダメ
		//       (indexedDBはnullを保存できるため、ユーザーが意図してnullを格納した可能性がある)
		const value = localStorage.getItem(PREFIX + key);
		if (value == null) {
			return ColdDeviceStorage.default[key];
		} else {
			return JSON.parse(value);
		}
	}

	public static set<T extends keyof typeof ColdDeviceStorage.default>(key: T, value: typeof ColdDeviceStorage.default[T]): void {
		// 呼び出し側のバグ等で undefined が来ることがある
		// undefined を文字列として localStorage に入れると参照する際の JSON.parse でコケて不具合の元になるため無視
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (value === undefined) {
			console.error(`attempt to store undefined value for key '${key}'`);
			return;
		}

		localStorage.setItem(PREFIX + key, JSON.stringify(value));

		this.watchers.emit(key, value);
	}

	public static watch<K extends keyof typeof ColdDeviceStorage.default>(key: K, callback: (value: typeof ColdDeviceStorage.default[K]) => void) {
		this.watchers.on(key, callback);
	}

	// TODO: VueのcustomRef使うと良い感じになるかも
	public static ref<T extends keyof typeof ColdDeviceStorage.default>(key: T) {
		const v = ColdDeviceStorage.get(key);
		const r = ref(v);
		// TODO: このままではwatcherがリークするので開放する方法を考える
		this.watch(key, v => {
			r.value = v;
		});
		return r;
	}

	/**
	 * 特定のキーの、簡易的なgetter/setterを作ります
	 * 主にvue場で設定コントロールのmodelとして使う用
	 */
	public static makeGetterSetter<K extends keyof typeof ColdDeviceStorage.default>(key: K) {
		// TODO: VueのcustomRef使うと良い感じになるかも
		const valueRef = ColdDeviceStorage.ref(key);
		return {
			get: () => {
				return valueRef.value;
			},
			set: (value: typeof ColdDeviceStorage.default[K]) => {
				const val = value;
				ColdDeviceStorage.set(key, val);
			},
		};
	}
}

// このファイルに書きたくないけどここに書かないと何故かVeturが認識しない
declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$store: typeof defaultStore;
	}
}
