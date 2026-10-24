import type { entities } from '@/misskey';
import type { NoteVisibility } from '../../../shared/constants';
export interface PostFormProps {
 reply?: entities.Note | null; renote?: entities.Note | null; channel?: Pick<entities.Channel, 'id' | 'name'>;
 mention?: entities.User; specified?: entities.User;
 initialText?: string; initialVisibility?: NoteVisibility; initialFiles?: entities.DriveFile[];
 initialLocalOnly?: boolean; initialVisibleUsers?: entities.User[]; initialNote?: entities.Note;
 instant?: boolean; fixed?: boolean; autofocus?: boolean;
}

export interface PollDraft {
 choices: string[]; multiple: boolean;
 expiresAt?: string | number | null; expiredAfter?: number | null;
}

export interface NoteDraft {
 updatedAt: string;
 data: { text: string; useCw: boolean; cw: string | null; visibility: NoteVisibility; localOnly: boolean; files?: entities.DriveFile[]; poll?: PollDraft | null };
}
