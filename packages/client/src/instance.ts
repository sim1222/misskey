import { computed, reactive } from 'vue';
import * as Misskey from '@/misskey';
import { api } from './os';

// TODO: 他のタブと永続化されたstateを同期

const instanceData = localStorage.getItem('instance');

// TODO: instanceをリアクティブにするかは再考の余地あり

export const instance: Partial<Misskey.entities.InstanceMetadata> = reactive(instanceData ? JSON.parse(instanceData) : {
	// TODO: set default values
});

export async function fetchInstance() {
	const meta = await api('meta', {
		detail: false
	});

	Object.assign(instance, meta);

	localStorage.setItem('instance', JSON.stringify(instance));
}

export const emojiCategories = computed(() => {
	if (instance.emojis == null) return [];
	const categories = new Set<string | null>();
	for (const emoji of instance.emojis) {
		categories.add(emoji.category);
	}
	return Array.from(categories);
});

export const emojiTags = computed(() => {
	if (instance.emojis == null) return [];
	const tags = new Set<string>();
	for (const emoji of instance.emojis) {
		for (const tag of emoji.aliases) {
			tags.add(tag);
		}
	}
	return Array.from(tags);
});

// このファイルに書きたくないけどここに書かないと何故かVeturが認識しない
declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$instance: typeof instance;
	}
}
