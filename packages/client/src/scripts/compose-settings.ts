import { isNoteVisibility, type NoteVisibility } from '../../../shared/constants.ts';
export interface ComposePreferences {
 rememberNoteVisibility: boolean;
 visibility: string; localOnly: boolean;
 defaultNoteVisibility: string; defaultNoteLocalOnly: boolean;
}
/** An explicitly supplied false must take precedence over either saved setting. */
export function composeSettings(initial: { initialVisibility?: NoteVisibility; initialLocalOnly?: boolean }, preferences: ComposePreferences): { visibility: NoteVisibility; localOnly: boolean } {
 const visibility = initial.initialVisibility ?? (preferences.rememberNoteVisibility ? preferences.visibility : preferences.defaultNoteVisibility);
 if (!isNoteVisibility(visibility)) throw new TypeError('Invalid saved note visibility');
 return {
  visibility,
  localOnly: initial.initialLocalOnly ?? (preferences.rememberNoteVisibility ? preferences.localOnly : preferences.defaultNoteLocalOnly),
 };
}
