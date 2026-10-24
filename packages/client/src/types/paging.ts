import type { ComputedRef } from 'vue';
import type { Endpoints, ApiResponse } from '@/types/api';

export type PagedEndpoint = { [K in keyof Endpoints]: Endpoints[K]['res'] extends { id: string }[] ? K : never }[keyof Endpoints];
export type PagedItem<E extends PagedEndpoint> = (ApiResponse<E> extends (infer Item)[] ? Item : never) & { id: string; _shouldInsertAd_?: boolean };
export type EndpointOf<Item> = { [K in PagedEndpoint]: PagedItem<K> extends Item ? K : never }[PagedEndpoint];
type Params<E extends PagedEndpoint> = {} extends Endpoints[E]['req'] ? { params?: Endpoints[E]['req'] | ComputedRef<Endpoints[E]['req'] | null> } : { params: Endpoints[E]['req'] | ComputedRef<Endpoints[E]['req'] | null> };
export type Paging<E extends PagedEndpoint = PagedEndpoint> = { [K in E]: {
 endpoint: K; limit?: number; noPaging?: boolean; reversed?: boolean; offsetMode?: boolean;
} & Params<K> }[E];
export interface PagingCursor { limit?: number; offset?: number; sinceId?: string; untilId?: string }
export interface PaginationExposed<E extends PagedEndpoint = PagedEndpoint> {
 items: PagedItem<E>[]; queue: PagedItem<E>[]; backed: boolean;
 reload(): void; prepend(item: PagedItem<E>): void; append(item: PagedItem<E>): void;
 removeItem(finder: (item: PagedItem<E>) => boolean): void;
 updateItem(id: string, replacer: (item: PagedItem<E>) => PagedItem<E>): void;
}
