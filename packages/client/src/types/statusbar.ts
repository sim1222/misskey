export interface StatusbarSettings {
 url?: string; userListId?: string; shuffle?: boolean; colored?: boolean;
 display?: 'marquee' | 'oneByOne'; marqueeDuration?: number; marqueeReverse?: boolean;
 oneByOneInterval?: number; refreshIntervalSec?: number;
}
export interface Statusbar {
 id: string; name?: string; type: 'rss' | 'federation' | 'userList' | null;
 size: 'verySmall' | 'small' | 'medium' | 'large' | 'veryLarge'; black: boolean;
 props: StatusbarSettings;
}
