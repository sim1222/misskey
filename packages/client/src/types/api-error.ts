export interface ApiError { message: string; id?: string; code?: string; kind?: string; info?: unknown }

export function toApiError(error: unknown): ApiError {
 if (typeof error !== 'object' || error === null) return { message: String(error) };
 return {
  ...error,
  message: 'message' in error && typeof error.message === 'string' ? error.message : String(error),
  id: 'id' in error && typeof error.id === 'string' ? error.id : undefined,
  code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
  kind: 'kind' in error && typeof error.kind === 'string' ? error.kind : undefined,
 };
}
