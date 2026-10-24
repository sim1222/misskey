import type { entities } from '@/misskey';
export type AutocompleteResult = { type: 'user'; value: entities.User } | { type: 'hashtag' | 'emoji' | 'mfmTag'; value: string };
