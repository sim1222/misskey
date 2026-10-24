import type { SigninResult } from './auth';
import type { Endpoints } from './api-contracts';
import type * as entities from './entities';

export type ApiRequest<E extends keyof Endpoints> = Endpoints[E]['req'];
export type DefaultApiRequest<E extends keyof Endpoints> = ApiRequest<E> & (E extends 'meta' | 'users/search' | 'users/search-by-username-and-host' ? { detail?: never } : unknown);
type DetailResponse<P, Lite, Full> = P extends { detail: false } ? Lite : 'detail' extends keyof P ? P extends { detail?: infer D } ? false extends D ? Lite | Full : Full : Full : Full;
type ResponseForRequest<E extends keyof Endpoints, P> =
 E extends 'signin' ? P extends { token: string } | { credentialId: string } ? SigninResult : Endpoints[E]['res'] :
 E extends 'users/search' | 'users/search-by-username-and-host' ? DetailResponse<P, entities.UserLite[], entities.UserDetailed[]> :
 E extends 'users/show' ? P extends { userIds: string[] } ? entities.UserDetailed[] : entities.UserDetailed :
 E extends 'meta' ? DetailResponse<P, entities.LiteInstanceMetadata, entities.DetailedInstanceMetadata> :
 Endpoints[E]['res'];

/** Resolve default requests separately for each member of an endpoint union. */
export type ApiResponse<E extends keyof Endpoints, P = never> = E extends unknown ? ResponseForRequest<E, [P] extends [never] ? DefaultApiRequest<E> : P> : never;

type RequestKeys<R> = R extends unknown ? keyof R : never;
export type ExactRequest<E extends keyof Endpoints, P extends ApiRequest<E>, Extra extends PropertyKey = never> = P & NoInfer<Record<Exclude<keyof P, RequestKeys<ApiRequest<E>> | Extra>, never>>;
/** Reject extra fields at the endpoint so request inference retains literal booleans. */
export type ExactEndpoint<E extends keyof Endpoints, P extends ApiRequest<E>, Extra extends PropertyKey = never> = E & NoInfer<Exclude<keyof P, RequestKeys<ApiRequest<E>> | Extra> extends never ? unknown : never>;
export type ApiArguments<E extends keyof Endpoints, P extends ApiRequest<E>> = {} extends ApiRequest<E>
 ? [data?: P, token?: string | null]
 : [data: P, token?: string | null];
export type ApiGetArguments<E extends keyof Endpoints, P extends ApiRequest<E>> = {} extends ApiRequest<E>
 ? [data?: P]
 : [data: P];
