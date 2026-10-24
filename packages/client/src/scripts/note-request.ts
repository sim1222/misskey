import type { ApiRequest } from '@/types/api';
import type { PollDraft } from '@/types/post';
type NoteRequest = ApiRequest<'notes/create'>;
export function requestPoll(poll: PollDraft | null): NoteRequest['poll'] {
 if (!poll) return null;
 return { ...poll, expiresAt: typeof poll.expiresAt === 'string' ? new Date(poll.expiresAt).getTime() : poll.expiresAt };
}
/** A post needs at least one content field; all other fields keep their API types. */
export function noteRequest(draft: Partial<NoteRequest>): NoteRequest | undefined {
 if (typeof draft.text === 'string' && draft.text.length > 0) return { ...draft, text: draft.text };
 if (draft.fileIds?.length) return { ...draft, fileIds: draft.fileIds };
 if (draft.mediaIds?.length) return { ...draft, mediaIds: draft.mediaIds };
 if (draft.poll) return { ...draft, poll: draft.poll };
 if (draft.renoteId) return { ...draft, renoteId: draft.renoteId };
 return undefined;
}
