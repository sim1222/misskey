// Generated from backend/types.ts; do not edit.
export const ffVisibility = ["public","followers","private"] as const;
export const mutedNoteReasons = ["word","manual","spam","other"] as const;
export const noteVisibilities = ["public","home","followers","specified"] as const;
export const notificationTypes = ["follow","mention","reply","renote","quote","reaction","pollVote","pollEnded","receiveFollowRequest","followRequestAccepted","groupInvited","app"] as const;
export type NoteVisibility = typeof noteVisibilities[number];
export function isNoteVisibility(value: unknown): value is NoteVisibility { return noteVisibilities.some(type => type === value); }
export type NotificationType = typeof notificationTypes[number];
export function isNotificationType(value: unknown): value is NotificationType { return notificationTypes.some(type => type === value); }
export function isNotificationTypes(value: unknown): value is NotificationType[] { return Array.isArray(value) && value.every(isNotificationType); }
