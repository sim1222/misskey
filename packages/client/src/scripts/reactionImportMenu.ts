import { loadAdminEmoji } from '@/scripts/load-admin-emoji';
import { defineAsyncComponent } from 'vue';
import { $i } from '@/account';
import { i18n } from '@/i18n';
import * as os from '@/os';
import copyToClipboard from '@/scripts/copy-to-clipboard';
import { MenuItem } from '@/types/menu';

export async function openReactionImportMenu(ev: MouseEvent, reaction: string, noteId: string): Promise<void> {
	if (!reaction) return;

	const host = reaction.match(/(?<=@).*\.*(?=:)/g)?.[0];
	const name = reaction.match(/(?<=:).*(?=@.*\.*(?=:))/g)?.[0];
	const isLocal = (host === null || host === '.');
	const isCustom = reaction.startsWith(':');

	const getEmojiObject = loadAdminEmoji;

	const getEmojiId = async (): Promise<string | null> => {
		if (isLocal) return null;
		if (!host || !name) return null;
		if (!($i?.isAdmin || $i?.isModerator)) return null;

		const resList = await os.api('admin/emoji/list-remote', {
			host,
			query: name,
			limit: 100,
		});

		const emojiId = await resList.find(emoji => emoji.name === name && emoji.host === host)?.id;

		return emojiId ?? null;
	};

	const importEmoji = async (skip: boolean): Promise<void> => {
		const emojiId = await getEmojiId();
		if (!emojiId) return;
		os.api('admin/emoji/copy', {
			emojiId: emojiId,
		}).then(async emoji => {
			if (skip) return;
			const detail = await getEmojiObject(emoji);
            if (detail) os.popup(defineAsyncComponent(() => import('@/pages/admin/emoji-edit-dialog.vue')), { emoji: detail });
		});
	};

	const menuItems: MenuItem[] = [{
		type: 'label',
		text: reaction,
	}, {
		type: 'button',
		icon: 'fas fa-copy',
		text: i18n.ts.copy,
		action: (): void => {
			copyToClipboard(isCustom ? `:${name}:` : reaction);
		},
	}];

	const emojiId = await getEmojiId() ? await getEmojiId() : reaction;

	if (
		isCustom &&
		emojiId &&
		($i?.isAdmin || $i?.isModerator) &&
		!isLocal
	) {
		menuItems.push({
			type: 'button',
			icon: 'fas fa-check',
			text: 'リアクションする', //todo
			action: async () => {
				const duplication: boolean = await os.api('meta').then(meta => {
					const emojis = meta.emojis;
					return emojis.some((emoji) => {
						return (emoji.name === name);
					});
				});
				if (await duplication) {
					os.api('notes/reactions/create', {
						noteId: noteId,
						reaction: `:${name}:`,
					});
				} else {
					os.toast('絵文字をインポートしました');
					await importEmoji(true).then(() => {
						setTimeout(() => {
							os.api('notes/reactions/create', {
								noteId: noteId,
								reaction: `:${name}:`,
							});
						}, 2000); // インポートしてからバックエンドに浸透するのが遅いので2秒待つ
					});
				}
			},
		}, {
			type: 'button',
			icon: 'fas fa-download',
			text: i18n.ts.import,
			action: async () => {
				const duplication: boolean = await os.api('meta').then(meta => {
					const emojis = meta.emojis;
					return emojis.some((emoji) => {
						return (emoji.name === name);
					});
				});

				if (await duplication) {
					os.confirm({
						type: 'warning',
						text: i18n.ts._simkey.duplicateEmoji,
					}).then(res => {
						if (res.canceled) return;
						importEmoji(false);
					});
				} else {
					importEmoji(false);
				}
			},
		});
	}

	os.contextMenu(menuItems, ev);
}
