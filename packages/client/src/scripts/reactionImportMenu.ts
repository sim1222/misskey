import { $i } from '@/account';
import { i18n } from '@/i18n';
import * as os from '@/os';
import copyToClipboard from '@/scripts/copy-to-clipboard';
import { defineAsyncComponent } from 'vue';
import { entities } from 'misskey-js';
import { MenuItem } from '@/types/menu';
import { CustomEmoji } from 'misskey-js/built/entities';

export async function openReactionImportMenu(ev: MouseEvent, reaction: string) {

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

	const getEmojiId = async (emojiName: string) => {

		const isLocal = (emojiName.match(/(?<=@).*\.*(?=:)/g) == null || emojiName.match(/(?<=@).*\.*(?=:)/g)[0] == '.');
		if (isLocal) return null;
		const host = emojiName.match(/(?<=@).*\.*(?=:)/g)[0];
		const name = emojiName.match(/(?<=:).*(?=@.*\.*(?=:))/g)[0];
		if (!host || !name) return;


		const resList: Record<string, any>[] = await os.api('admin/emoji/list-remote', {
			host,
			query: name,
			limit: 100,
		});

		const emojiId = await resList.find(emoji => emoji.name == name && emoji.host == host)?.id;

		return emojiId;
	}

	const importEmoji = async (emojiName: string) => {
		const emojiId = await getEmojiId(emojiName);
		if (!await emojiId) return;
		os.api('admin/emoji/copy', {
			emojiId: emojiId,
		}).then(async emoji => os.popup(defineAsyncComponent(() => import('@/pages/admin/emoji-edit-dialog.vue')), {
			emoji: await getEmojiObject(emoji),
		}));
	};

	if (!($i?.isAdmin || $i?.isModerator)) return;
	if (!reaction) return;

	const menuItems: MenuItem[] = [{
		type: 'label',
		text: reaction,
	}, {
		type: 'button',
		icon: 'fas fa-copy',
		text: i18n.ts.copy,
		action: () => {
			copyToClipboard(reaction => {
				if (reaction.startsWith(':')) {
					return `:${reaction.match(/(?<=:).*(?=@.*\.*(?=:))/g)[0]}:` || reaction;
				} else {
					return reaction;
				}
			});
		},
		}];
	const emojiId = await getEmojiId(reaction) ? await getEmojiId(reaction) : reaction;
	if (reaction.startsWith(':') && emojiId) {
		menuItems.push({
			type: 'button',
			icon: 'fas fa-download',
			text: i18n.ts.import,
			action: async () => {
				const duplication: boolean = await os.api('meta').then(meta => {
					const emojis = meta.emojis;
					return emojis.some((emoji) => {
						return (emoji.name === reaction.match(/(?<=:).*(?=@.*\.*(?=:))/g)[0]);
					});
				});

				if (await duplication) {
					os.confirm({
						type: 'warning',
						text: '同じ名前の絵文字が存在します。インポートしますか？',
					}).then(res => {
						if (res.canceled) return;
						importEmoji(reaction);
					});
				} else {
					importEmoji(reaction);
				}
			},
		});
	}

	os.contextMenu(menuItems, ev);


}

