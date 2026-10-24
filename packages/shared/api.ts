import type { SigninResult } from './auth';
import type { Endpoints } from './api-contracts';
import type * as entities from './entities';

export type ApiRequest<E extends keyof Endpoints> = Endpoints[E]['req'];
export type ApiResponse<E extends keyof Endpoints, P = ApiRequest<E>> =
 E extends 'signin' ? P extends { token: string } | { credentialId: string } ? SigninResult : Endpoints[E]['res'] :
 E extends 'users/search' | 'users/search-by-username-and-host' ? P extends { detail: false } ? entities.UserLite[] : entities.UserDetailed[] :
 E extends 'users/show' ? P extends { userIds: string[] } ? entities.UserDetailed[] : entities.UserDetailed :
 E extends 'meta' ? P extends { detail: false } ? entities.LiteInstanceMetadata : entities.DetailedInstanceMetadata :
 Endpoints[E]['res'];

type RequestKeys<R> = R extends unknown ? keyof R : never;
export type ExactRequest<E extends keyof Endpoints, P extends ApiRequest<E>, Extra extends PropertyKey = never> = P & Record<Exclude<keyof P, RequestKeys<ApiRequest<E>> | Extra>, never>;
export type ApiArguments<E extends keyof Endpoints, P extends ApiRequest<E>> = {} extends ApiRequest<E>
 ? [data?: ExactRequest<E, P>, token?: string | null]
 : [data: ExactRequest<E, P>, token?: string | null];
export type ApiGetArguments<E extends keyof Endpoints, P extends ApiRequest<E>> = {} extends ApiRequest<E>
 ? [data?: ExactRequest<E, P, '_cacheKey_'> & { _cacheKey_?: string | number }]
 : [data: ExactRequest<E, P, '_cacheKey_'> & { _cacheKey_?: string | number }];
