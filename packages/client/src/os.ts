import type { PostFormProps } from '@/types/post';
import type { Paging, PagedEndpoint, PagedItem, PagingCursor } from '@/types/paging';
import { toApiError, type ApiError } from '@/types/api-error';
// TODO: なんでもかんでもos.tsに突っ込むのやめたいのでよしなに分割する

import { Component, markRaw, Ref, ref, defineAsyncComponent, isRef as importIsRef } from 'vue';
import { EventEmitter } from 'eventemitter3';
import insertTextAtCursor from 'insert-text-at-cursor';
import * as Misskey from '@/misskey';
import { apiUrl } from '@/config';
import MkPostFormDialog from '@/components/MkPostFormDialog.vue';
import MkWaitingDialog from '@/components/MkWaitingDialog.vue';
import { MenuItem } from '@/types/menu';
import { $i } from '@/account';
import type { Endpoints } from '../../shared/api-contracts';
import type { ApiRequest, ApiResponse, ApiArguments, ApiGetArguments, ExactEndpoint, DefaultApiRequest } from '../../shared/api';
import type { PopupProps, ComponentEvents } from '@/types/component';
import type { Form, GetFormResultType, FormDialogResult } from '@/scripts/form';

import { isFormResult } from '@/scripts/form';
import { parseDialogResult, isTextInput, isNumberInput, isDateInput } from '@/types/dialog';
import type { DialogResult } from '@/types/dialog';

export const pendingApiRequestsCount = ref(0);

export function api<E extends keyof Endpoints, const P extends ApiRequest<E> = DefaultApiRequest<E>>(endpoint: ExactEndpoint<E, P>, ...args: ApiArguments<NoInfer<E>, P>): Promise<ApiResponse<E, P>>;
export function api(endpoint: string, data: Record<string, unknown> = {}, token?: string | null): Promise<unknown> {
 return rawApi(endpoint, data, token);
}

/** Dynamic script/console requests return unknown until the caller validates them. */
export function rawApi(endpoint: string, data: Record<string, unknown> = {}, token?: string | null): Promise<unknown> {
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const promise = new Promise<unknown>((resolve, reject) => {
		// Append a credential
		if ($i) data.i = $i.token;
		if (token !== undefined) data.i = token;

		// Send request
		fetch(endpoint.indexOf('://') > -1 ? endpoint : `${apiUrl}/${endpoint}`, {
			method: 'POST',
			body: JSON.stringify(data),
			credentials: 'omit',
			cache: 'no-cache',
		}).then(async (res) => {
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve(undefined);
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}

/** Cursor overrides are owned by the paginator; endpoint parameters remain correlated. */
export function apiPage<E extends PagedEndpoint>(pagination: Paging<E>, cursor: PagingCursor): Promise<PagedItem<E>[]>;
export function apiPage(pagination: { endpoint: PagedEndpoint; params?: Record<string, unknown> | import('vue').ComputedRef<Record<string, unknown> | null> }, cursor: PagingCursor): Promise<unknown[]> {
 const params = importIsRef<Record<string, unknown>>(pagination.params) ? pagination.params.value : pagination.params;
 return rawApi(pagination.endpoint, { ...params, ...cursor }).then(response => {
  if (!Array.isArray(response) || !response.every((item: unknown) => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string')) throw new TypeError('Invalid paginated response');
  return response;
 });
}

export function apiGet<E extends keyof Endpoints, const P extends ApiRequest<E> & { _cacheKey_?: string | number } = DefaultApiRequest<E> & { _cacheKey_?: string | number }>(endpoint: ExactEndpoint<E, P, '_cacheKey_'>, ...args: ApiGetArguments<NoInfer<E>, P>): Promise<ApiResponse<E, P>>;
export function apiGet(endpoint: string, data: Record<string, unknown> = {}): Promise<unknown> {
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const query = new URLSearchParams(Object.entries(data).map(([key, value]) => [key, String(value)]));

	const promise = new Promise<unknown>((resolve, reject) => {
		// Send request
		fetch(`${apiUrl}/${endpoint}?${query}`, {
			method: 'GET',
			credentials: 'omit',
			cache: 'default',
		}).then(async (res) => {
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve(undefined);
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}

function typedRequest<E extends keyof Endpoints, P extends ApiRequest<E>>(endpoint: E, data?: P, token?: string | null): Promise<ApiResponse<E, P>>;
function typedRequest(endpoint: string, data?: Record<string, unknown>, token?: string | null): Promise<unknown> { return rawApi(endpoint, data, token); }
type DialogApiArguments<E extends keyof Endpoints, P extends ApiRequest<E>> = {} extends ApiRequest<E>
 ? [data?: P, token?: string | null, onSuccess?: ((result: ApiResponse<E, P>) => void) | null, onFailure?: ((error: ApiError) => void) | null]
 : [data: P, token?: string | null, onSuccess?: ((result: ApiResponse<E, P>) => void) | null, onFailure?: ((error: ApiError) => void) | null];
export function apiWithDialog<E extends keyof Endpoints, const P extends ApiRequest<E> = DefaultApiRequest<E>>(endpoint: ExactEndpoint<E, P>, ...args: DialogApiArguments<NoInfer<E>, P>): Promise<ApiResponse<E, P>>;
export function apiWithDialog<E extends keyof Endpoints, const P extends ApiRequest<E> = DefaultApiRequest<E>>(
 endpoint: E,
 data?: P,
 token?: string | null,
 onSuccess?: ((result: ApiResponse<E, P>) => void) | null,
 onFailure?: ((error: ApiError) => void) | null,
): Promise<ApiResponse<E, P>> {
	const promise = typedRequest(endpoint, data, token);
	promiseDialog(promise, onSuccess, onFailure ?? ((err) => {
		alert({
			type: 'error',
			text: err.message + '\n' + err.id,
		});
	}));

	return promise;
}

export function promiseDialog<T>(
	promise: Promise<T>,
	onSuccess?: ((res: T) => void) | null,
	onFailure?: ((err: ApiError) => void) | null,
	text?: string,
): Promise<T> {
	const showing = ref(true);
	const success = ref(false);

	promise.then(res => {
		if (onSuccess) {
			showing.value = false;
			onSuccess(res);
		} else {
			success.value = true;
			window.setTimeout(() => {
				showing.value = false;
			}, 1000);
		}
	}).catch(err => {
		showing.value = false;
		if (onFailure) {
			onFailure(toApiError(err));
		} else {
			alert({
				type: 'error',
				text: err,
			});
		}
	});

	// NOTE: dynamic importすると挙動がおかしくなる(showingの変更が伝播しない)
	popup(MkWaitingDialog, {
		success: success,
		showing: showing,
		text: text,
	}, {}, 'closed');

	return promise;
}

let popupIdCount = 0;
export const popups = ref<{ id: number; component: Component; props: object; events: object }[]>([]);

const zIndexes = {
	low: 1000000,
	middle: 2000000,
	high: 3000000,
};
export function claimZIndex(priority: 'low' | 'middle' | 'high' = 'low'): number {
	zIndexes[priority] += 100;
	return zIndexes[priority];
}

export async function popup<C extends Component>(component: C, props: PopupProps<NoInfer<C>>, events: NoInfer<ComponentEvents<C>> = {}, disposeEvent?: string) {
	const popupComponent = markRaw<Component>(component);

	const id = ++popupIdCount;
	const dispose = () => {
		// このsetTimeoutが無いと挙動がおかしくなる(autocompleteが閉じなくなる)。Vueのバグ？
		window.setTimeout(() => {
			popups.value = popups.value.filter(popup => popup.id !== id);
		}, 0);
	};
	const state = {
		component: popupComponent,
		props,
		events: disposeEvent ? {
			...events,
			[disposeEvent]: dispose,
		} : events,
		id,
	};

	popups.value.push(state);

	return {
		dispose,
	};
}

export function pageWindow(path: string) {
	popup(defineAsyncComponent(() => import('@/components/MkPageWindow.vue')), {
		initialPath: path,
	}, {}, 'closed');
}

export function modalPageWindow(path: string) {
	popup(defineAsyncComponent(() => import('@/components/MkModalPageWindow.vue')), {
		initialPath: path,
	}, {}, 'closed');
}

export function toast(message: string) {
	popup(defineAsyncComponent(() => import('@/components/MkToast.vue')), {
		message,
	}, {}, 'closed');
}

export function alert(props: {
 icon?: string;
	type?: 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question';
	title?: string | null;
	text?: string | null;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDialog.vue')), props, {
			done: () => {
				resolve();
			},
		}, 'closed');
	});
}

export function confirm(props: {
	type: 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question';
	title?: string | null;
	text?: string | null;
}): Promise<{ canceled: boolean }> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDialog.vue')), {
			...props,
			showCancelButton: true,
		}, {
			done: (result: DialogResult<unknown>) => {
				resolve(result ? result : { canceled: true });
			},
		}, 'closed');
	});
}

export function inputText(props: {
 allowEmpty?: boolean;
	type?: 'text' | 'email' | 'password' | 'url';
	title?: string | null;
	text?: string | null;
	placeholder?: string | null;
	default?: string | null;
}): Promise<DialogResult<string | null>> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDialog.vue')), {
			title: props.title,
			text: props.text,
			input: {
				type: props.type,
				placeholder: props.placeholder,
				default: props.default,
			},
		}, {
			done: (result: DialogResult<unknown>) => {
				resolve(parseDialogResult(result, isTextInput));
			},
		}, 'closed');
	});
}

export function inputNumber(props: {
	title?: string | null;
	text?: string | null;
	placeholder?: string | null;
	default?: number | null;
}): Promise<DialogResult<number | null>> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDialog.vue')), {
			title: props.title,
			text: props.text,
			input: {
				type: 'number',
				placeholder: props.placeholder,
				default: props.default,
			},
		}, {
			done: (result: DialogResult<unknown>) => {
				resolve(parseDialogResult(result, isNumberInput));
			},
		}, 'closed');
	});
}

export function inputDate(props: {
	title?: string | null;
	text?: string | null;
	placeholder?: string | null;
	default?: Date | null;
}): Promise<DialogResult<Date>> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDialog.vue')), {
			title: props.title,
			text: props.text,
			input: {
				type: 'date',
				placeholder: props.placeholder,
				default: props.default?.toISOString().slice(0, 10),
			},
		}, {
			done: (result: DialogResult<unknown>) => {
				const value = parseDialogResult(result, isDateInput);
				resolve(value.canceled ? value : { result: new Date(value.result ?? 0), canceled: false });
			},
		}, 'closed');
	});
}

export function select<C = string>(props: {
 type?: 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question';
	title?: string | null;
	text?: string | null;
	default?: C | null;
} & ({
	items: {
		value: C;
		text: string;
	}[];
	groupedItems?: never;
} | {
	items?: never;
	groupedItems: {
		label: string;
		items: {
			value: C;
			text: string;
		}[];
	}[];
})): Promise<DialogResult<C | null>> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDialog.vue')), {
			title: props.title,
			text: props.text,
			select: {
				items: props.items,
				groupedItems: props.groupedItems,
				default: props.default,
			},
		}, {
			done: (result: DialogResult<unknown>) => {
                if (result.canceled) return resolve(result);
                if (result.result === null) return resolve({ canceled: false, result: null });
                const items = props.items ?? props.groupedItems.flatMap(group => group.items);
                const chosen = items.find(item => Object.is(item.value, result.result));
                if (chosen === undefined) throw new TypeError('Dialog returned a value outside its choices');
                resolve({ canceled: false, result: chosen.value });
			},
		}, 'closed');
	});
}

export function success() {
	return new Promise<void>((resolve, reject) => {
		const showing = ref(true);
		window.setTimeout(() => {
			showing.value = false;
		}, 1000);
		popup(defineAsyncComponent(() => import('@/components/MkWaitingDialog.vue')), {
			success: true,
			showing: showing,
		}, {
			done: () => resolve(),
		}, 'closed');
	});
}

export function waiting() {
	return new Promise<void>((resolve, reject) => {
		const showing = ref(true);
		popup(defineAsyncComponent(() => import('@/components/MkWaitingDialog.vue')), {
			success: false,
			showing: showing,
		}, {
			done: () => resolve(),
		}, 'closed');
	});
}

export function form<F extends Form>(title: string | null, form: F): Promise<FormDialogResult<GetFormResultType<F>>> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkFormDialog.vue')), { title, form }, {
			done: (result: FormDialogResult<Record<string, unknown>>) => {
				if (result.canceled) resolve(result);
				else if (isFormResult(form, result.result)) resolve({ result: result.result });
				else reject(new TypeError("Invalid form result"));
			},
		}, 'closed');
	});
}

export async function selectUser() {
	return new Promise<Misskey.entities.User>((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkUserSelectDialog.vue')), {}, {
			ok: (user: Misskey.entities.User) => {
				resolve(user);
			},
		}, 'closed');
	});
}

export function selectDriveFile(multiple: true): Promise<Misskey.entities.DriveFile[]>;
export function selectDriveFile(multiple: false): Promise<Misskey.entities.DriveFile>;
export function selectDriveFile(multiple: boolean): Promise<Misskey.entities.DriveFile | Misskey.entities.DriveFile[]>;
export async function selectDriveFile(multiple: boolean) {
	return new Promise<Misskey.entities.DriveFile | Misskey.entities.DriveFile[]>((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDriveSelectDialog.vue')), {
			type: 'file',
			multiple,
		}, {
			done: (files: Misskey.entities.DriveFile[] | Misskey.entities.DriveFolder[] | undefined) => {
				if (files && files.every((file): file is Misskey.entities.DriveFile => "type" in file)) {
					resolve(multiple ? files : files[0]);
				}
			},
		}, 'closed');
	});
}

export function selectDriveFolder(multiple: true): Promise<Misskey.entities.DriveFolder[]>;
export function selectDriveFolder(multiple: false): Promise<Misskey.entities.DriveFolder | undefined>;
export function selectDriveFolder(multiple: boolean): Promise<Misskey.entities.DriveFolder | Misskey.entities.DriveFolder[] | undefined>;
export async function selectDriveFolder(multiple: boolean) {
	return new Promise<Misskey.entities.DriveFolder | Misskey.entities.DriveFolder[] | undefined>((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkDriveSelectDialog.vue')), {
			type: 'folder',
			multiple,
		}, {
			done: (folders: Misskey.entities.DriveFile[] | Misskey.entities.DriveFolder[] | undefined) => {
				if (folders && folders.every((folder): folder is Misskey.entities.DriveFolder => "parentId" in folder)) {
					resolve(multiple ? folders : folders[0]);
				}
			},
		}, 'closed');
	});
}

type ReactionChoice = { reaction: string; withRenote: boolean };
type EmojiOptions = { asReactionPicker?: boolean; showPinned?: boolean };
export function pickEmoji(src: EventTarget | null | undefined, opts: EmojiOptions & { asReactionPicker: true }): Promise<ReactionChoice>;
export function pickEmoji(src: EventTarget | null | undefined, opts: EmojiOptions & { asReactionPicker?: false }): Promise<string>;
export function pickEmoji(src: EventTarget | null | undefined, opts: EmojiOptions): Promise<string | ReactionChoice>;
export function pickEmoji(src: EventTarget | null | undefined, opts: EmojiOptions): Promise<string | ReactionChoice> {
 return new Promise((resolve, reject) => {
  popup(defineAsyncComponent(() => import('@/components/MkEmojiPickerDialog.vue')), {
   src: src instanceof HTMLElement ? src : undefined, ...opts,
  }, {
   done: (emoji: string | ReactionChoice) => {
    if ((opts.asReactionPicker === true) === (typeof emoji === 'string')) {
     reject(new TypeError('Emoji picker result does not match its mode')); return;
    }
    resolve(emoji);
   },
  }, 'closed');
 });
}

export async function cropImage(image: Misskey.entities.DriveFile, options: {
	aspectRatio: number;
}): Promise<Misskey.entities.DriveFile> {
	return new Promise((resolve, reject) => {
		popup(defineAsyncComponent(() => import('@/components/MkCropperDialog.vue')), {
			file: image,
			aspectRatio: options.aspectRatio,
		}, {
			ok: (x: Misskey.entities.DriveFile) => {
				resolve(x);
			},
		}, 'closed');
	});
}

let openingEmojiPicker: Awaited<ReturnType<typeof popup>> | null = null;
let activeTextarea: HTMLTextAreaElement | HTMLInputElement | null = null;
export async function openEmojiPicker(src: EventTarget | null | undefined, opts: { asReactionPicker?: boolean; showPinned?: boolean }, initialTextarea: typeof activeTextarea) {
	if (openingEmojiPicker) return;

	activeTextarea = initialTextarea;

	const textareas = document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>('textarea, input');
	for (const textarea of Array.from(textareas)) {
		textarea.addEventListener('focus', () => {
			activeTextarea = textarea;
		});
	}

	const observer = new MutationObserver(records => {
		for (const record of records) {
			for (const node of Array.from(record.addedNodes).filter(node => node instanceof HTMLElement) as HTMLElement[]) {
				const textareas = node.querySelectorAll('textarea, input') as NodeListOf<NonNullable<typeof activeTextarea>>;
				for (const textarea of Array.from(textareas).filter(textarea => textarea.dataset.preventEmojiInsert == null)) {
					if (document.activeElement === textarea) activeTextarea = textarea;
					textarea.addEventListener('focus', () => {
						activeTextarea = textarea;
					});
				}
			}
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: false,
		characterData: false,
	});

	openingEmojiPicker = await popup(defineAsyncComponent(() => import('@/components/MkEmojiPickerWindow.vue')), {
		src: src instanceof HTMLElement ? src : undefined,
		...opts,
	}, {
		chosen: (emoji: string | ReactionChoice) => {
			if (activeTextarea) insertTextAtCursor(activeTextarea, typeof emoji === 'string' ? emoji : emoji.reaction);
		},
		closed: () => {
			openingEmojiPicker!.dispose();
			openingEmojiPicker = null;
			observer.disconnect();
		},
	});
}

export function popupMenu(items: MenuItem[] | Ref<MenuItem[]>, src?: EventTarget | null, options?: {
	align?: string;
	width?: number;
	viaKeyboard?: boolean;
}) {
	return new Promise<void>((resolve, reject) => {
		let dispose: () => void;
		popup(defineAsyncComponent(() => import('@/components/MkPopupMenu.vue')), {
			items,
			src: src instanceof HTMLElement ? src : undefined,
			width: options?.width,
			align: options?.align,
			viaKeyboard: options?.viaKeyboard,
		}, {
			closed: () => {
				resolve();
				dispose();
			},
		}).then(res => {
			dispose = res.dispose;
		});
	});
}

export function contextMenu(items: MenuItem[] | Ref<MenuItem[]>, ev: MouseEvent) {
	ev.preventDefault();
	return new Promise<void>((resolve, reject) => {
		let dispose: () => void;
		popup(defineAsyncComponent(() => import('@/components/MkContextMenu.vue')), {
			items,
			ev,
		}, {
			closed: () => {
				resolve();
				dispose();
			},
		}).then(res => {
			dispose = res.dispose;
		});
	});
}

export function post(props: PostFormProps & { animation?: boolean } = {}, onClosed?: () => void) {
	return new Promise<void>((resolve, reject) => {
		// NOTE: MkPostFormDialogをdynamic importするとiOSでテキストエリアに自動フォーカスできない
		// NOTE: ただ、dynamic importしない場合、MkPostFormDialogインスタンスが使いまわされ、
		//       Vueが渡されたコンポーネントに内部的に__propsというプロパティを生やす影響で、
		//       複数のpost formを開いたときに場合によってはエラーになる
		//       もちろん複数のpost formを開けること自体Misskeyサイドのバグなのだが
		let dispose: () => void;
		const { animation: _animation, ...formProps } = props;
		popup(MkPostFormDialog, formProps, {
			closed: () => {
				resolve();
				dispose();
				onClosed?.();
			},
		}).then(res => {
			dispose = res.dispose;
		});
	});
}

export const deckGlobalEvents = new EventEmitter();

/*
export function checkExistence(fileData: ArrayBuffer): Promise<any> {
	return new Promise((resolve, reject) => {
		const data = new FormData();
		data.append('md5', getMD5(fileData));

		os.api('drive/files/find-by-hash', {
			md5: getMD5(fileData)
		}).then(resp => {
			resolve(resp.length > 0 ? resp[0] : null);
		});
	});
}*/
