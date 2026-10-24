// Public declarations for the unchanged misskey-js 0.0.14 streaming runtime.
// Channel/event payloads follow this branch's server/api/stream implementations.
import { EventEmitter } from 'eventemitter3';
import type * as E from '../../../shared/entities';

type Events<T> = { [K in keyof T]: (payload: T[K]) => void };
export interface ServerStats { cpu: number; mem: { used: number; active: number }; net: { rx: number; tx: number }; fs: { r: number; w: number } }
export interface QueueStats { deliver: QueueStat; inbox: QueueStat }
export interface QueueStat { activeSincePrevTick: number; active: number; waiting: number; delayed: number }
interface MainEvents {
 notification: E.Notification; mention: E.Note; reply: E.Note; renote: E.Note;
 follow: E.UserDetailed; followed: E.User; unfollow: E.User; meUpdated: E.User;
 pageEvent: { pageId: string; event: string; var: unknown; userId: string; user: E.User };
 urlUploadFinished: { marker?: string | null; file: E.DriveFile };
 readAllNotifications: undefined; readNotifications: string[]; unreadNotification: E.Notification;
 unreadMention: string; readAllUnreadMentions: undefined; unreadSpecifiedNote: string;
 readAllUnreadSpecifiedNotes: undefined; readAllMessagingMessages: undefined;
 messagingMessage: E.MessagingMessage; unreadMessagingMessage: E.MessagingMessage;
 readAllAntennas: undefined; unreadAntenna: E.Antenna; readAllAnnouncements: undefined;
 readAllChannels: undefined; unreadChannel: string; myTokenRegenerated: undefined;
 signin: E.Signin; registryUpdated: { scope?: string[]; key: string; value: unknown };
 driveFileCreated: E.DriveFile; readAntenna: E.Antenna; receiveFollowRequest: E.User;
}
interface Timeline { params: null; events: Events<{ note: E.Note }>; receives: null }
interface Channel { params: unknown; events: object; receives: object | null }
interface LogRequest { requestLog: { id: string | number; length?: number } }
export interface Channels {
 main: { params: null; events: Events<MainEvents>; receives: null };
 homeTimeline: Timeline; localTimeline: Timeline; hybridTimeline: Timeline; globalTimeline: Timeline;
 antenna: { params: { antennaId: string }; events: Events<{ note: E.Note }>; receives: null };
 userList: { params: { listId: string }; events: Events<{ note: E.Note; userAdded: E.User; userRemoved: E.User }>; receives: null };
 channel: { params: { channelId: string }; events: Events<{ note: E.Note; typing: string }>; receives: null };
 hashtag: { params: { q: string[][] }; events: Events<{ note: E.Note }>; receives: null };
 drive: { params: null; events: Events<{ fileCreated: E.DriveFile; fileUpdated: E.DriveFile; fileDeleted: string; folderCreated: E.DriveFolder; folderUpdated: E.DriveFolder; folderDeleted: string }>; receives: null };
 messagingIndex: { params: null; events: Events<{ message: E.MessagingMessage; read: string[] }>; receives: null };
 messaging: { params: { otherparty?: string | null; group?: string | null }; events: Events<{ message: E.MessagingMessage; deleted: string; read: string[] | { ids: string[]; userId: string }; typers: E.UserLite[] }>; receives: { read: { id: string } } };
 serverStats: { params: null; events: Events<{ stats: ServerStats; statsLog: ServerStats[] }>; receives: LogRequest };
 queueStats: { params: null; events: Events<{ stats: QueueStats; statsLog: QueueStats[] }>; receives: LogRequest };
 admin: { params: null; events: Events<{ newAbuseUserReport: { id: string; targetUserId: string; reporterId: string; comment: string } }>; receives: null };
}
export type NoteUpdatedEvent = {
 [K in keyof NoteUpdates]: { id: string; type: K; body: NoteUpdates[K] }
}[keyof NoteUpdates];
interface NoteUpdates {
 reacted: { reaction: string; emoji?: { name: string; url: string } | null; userId: string };
 unreacted: { reaction: string; userId: string };
 deleted: { deletedAt: string };
 pollVoted: { choice: number; userId: string };
}
interface ClientMessages {
 readNotification: { id: string };
 typingOnChannel: { channel: string };
 typingOnMessaging: { partner: string } | { group: string };
 subNote: { id: string }; unsubNote: { id: string };
 s: { id: string }; sr: { id: string }; un: { id: string };
}
export declare class Connection<C extends Channel = Channel> extends EventEmitter<C['events']> {
 readonly channel: string; readonly id: string; name?: string; inCount: number; outCount: number;
 send<K extends keyof C['receives']>(type: K, body: C['receives'][K]): void;
 dispose(): void;
}
export default class Stream extends EventEmitter<Events<{ _connected_: undefined; _disconnected_: undefined; emojiAdded: { emoji: E.CustomEmoji }; noteUpdated: NoteUpdatedEvent }>> {
 constructor(origin: string, user: { token: string } | null, options?: { WebSocket?: typeof WebSocket });
 state: 'initializing' | 'reconnecting' | 'connected';
 useChannel<C extends keyof Channels>(channel: C, ...args: Channels[C]['params'] extends null ? [params?: Channels[C]['params'], name?: string] : [params: Channels[C]['params'], name?: string]): Connection<Channels[C]>;
 send<K extends keyof ClientMessages>(type: K, payload: ClientMessages[K]): void;
 close(): void;
}
