import type * as misskey from '@/misskey';
import { inject, isRef, onActivated, onMounted, provide, ref, type InjectionKey, type Ref } from 'vue';

export type PageMetadata = {
 title: string; subtitle?: string; icon?: string | null;
 avatar?: misskey.entities.User | null; userName?: misskey.entities.User | null; bg?: string;
 hideHeader?: boolean;
 action?: { icon?: string; text?: string; handler: (event: MouseEvent) => void };
};
export type PageMetadataRef = Readonly<Ref<PageMetadata | null>>;
export const setPageMetadata: InjectionKey<(metadata: PageMetadataRef) => void> = Symbol('setPageMetadata');
export const pageMetadataProvider: InjectionKey<PageMetadataRef> = Symbol('pageMetadataProvider');
export function definePageMetadata(metadata: PageMetadata | null | PageMetadataRef): void {
 const value = isRef(metadata) ? metadata : ref(metadata);
 provide(pageMetadataProvider, value);
 const set = inject(setPageMetadata);
 if (set) { set(value); onMounted(() => set(value)); onActivated(() => set(value)); }
}
export function provideMetadataReceiver(callback: (metadata: PageMetadataRef) => void): void { provide(setPageMetadata, callback); }
export function injectPageMetadata(): PageMetadataRef | undefined { return inject(pageMetadataProvider); }
