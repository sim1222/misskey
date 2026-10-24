import type { Endpoints } from './api-contracts';
import type { Block } from './page-block';
import type { Variable } from './page-expr';
import type * as Wire from './schema-entities';
import type { entities as SDK } from 'misskey-js';

export type ID = SDK.ID;
export type DateString = SDK.DateString;
export type UserLite = Omit<Wire.UserLite, 'avatarBlurhash' | 'avatarColor' | 'emojis'> & {
 avatarBlurhash: string | null; avatarColor: null; driveCapacityOverrideMb: number | null;
 emojis: { name: string; url: string | null }[];
 instance?: Pick<Instance, 'name' | 'softwareName' | 'softwareVersion' | 'iconUrl' | 'faviconUrl' | 'themeColor'>;
};
export type UserDetailed = Omit<Wire.UserDetailedNotMe, keyof Wire.UserLite | 'bannerBlurhash' | 'bannerColor' | 'pinnedNotes'> & UserLite & { bannerBlurhash: string | null; bannerColor: null; pinnedNotes: Note[]; isAdmin: boolean; isModerator: boolean; isBot: boolean; isCat: boolean } & Partial<MeDetailedOnly>;
export type User = UserLite | UserDetailed;
export type UserList = Omit<Wire.UserList, 'userIds'> & { userIds: string[] };
export interface Integrations {
 twitter?: { accessToken: string; accessTokenSecret: string; userId: string; screenName: string };
 github?: { accessToken: string; id: string; login: string };
 discord?: { accessToken: string; refreshToken: string; expiresDate: number; id: string; username: string; discriminator: string };
}
export type MeDetailedOnly = Omit<Wire.MeDetailedOnly, 'integrations' | 'securityKeysList'> & { showTimelineReplies: boolean; ffVisibility: 'public' | 'followers' | 'private'; integrations: Integrations; securityKeysList: { id: string; name: string; lastUsed: string | null }[] };
export type MeDetailed = UserDetailed & MeDetailedOnly;
export type NoteReaction = Omit<Wire.NoteReaction, 'user'> & { user: UserLite; note?: Note };
export interface MessagingMessage {
 id: string; createdAt: string; userId: string; user: UserLite; text: string | null;
 fileId?: string | null; file?: DriveFile | null; recipientId: string | null; recipient?: UserLite | null;
 groupId: string | null; group?: UserGroup | null; isRead: boolean; reads: string[];
}
export type ServerInfo = SDK.ServerInfo;
export type Stats = SDK.Stats;
export type Page = Omit<Wire.Page, 'user' | 'content' | 'variables'> & {
 user: UserLite; content: Block[]; variables: Variable[]; hideTitleWhenPinned: boolean; alignCenter: boolean;
 font: string; script: string; eyeCatchingImageId: string | null; eyeCatchingImage: DriveFile | null;
 attachedFiles: DriveFile[]; likedCount: number; isLiked?: boolean;
};
export type PageEvent = SDK.PageEvent;
export type Announcement = SDK.Announcement;
export type Antenna = Wire.Antenna;
export type App = Wire.App;
export type AuthSession = SDK.AuthSession;
export interface Ad { id: string; expiresAt: string; place: string; priority: string; ratio: number; url: string; imageUrl: string; memo: string }
export type NoteFavorite = Omit<Wire.NoteFavorite, 'note'> & { note: Note };
export type FollowRequest = SDK.FollowRequest;
export type Channel = Wire.Channel & { hasUnreadNote?: boolean };
export type Following = Omit<Wire.Following, 'followee' | 'follower'> & { followee?: UserDetailed; follower?: UserDetailed };
export type FollowingFolloweePopulated = Following & { followee: UserDetailed };
export type FollowingFollowerPopulated = Following & { follower: UserDetailed };
export type Blocking = Wire.Blocking;
export type Instance = Wire.FederationInstance & { latestStatus?: number | null; latestRequestReceivedAt?: string | null };
export type Signin = SDK.Signin;
export type UserSorting = SDK.UserSorting;
export type OriginType = SDK.OriginType;

export type DriveFile = Omit<Wire.DriveFile, 'folder' | 'user'> & { folder?: DriveFolder | null; user?: UserLite | null };
export type DriveFolder = Wire.DriveFolder;
export type Note = Omit<Wire.Note, 'user' | 'poll' | 'channel' | 'visibility' | 'reactions' | 'files' | 'fileIds' | 'reply' | 'renote' | 'replyId' | 'renoteId' | 'myReaction'> & {
 myReaction?: string | null; _prId_?: string; _featuredId_?: string; user: UserLite; files: DriveFile[]; fileIds: string[]; replyId: string | null; renoteId: string | null;
 reply?: Note | null; renote?: Note | null; visibility: 'public' | 'home' | 'followers' | 'specified'; reactions: Record<string, number>;
 channel?: { id: string; name: string }; poll?: { expiresAt: string | null; multiple: boolean; choices: { text: string; votes: number; isVoted: boolean }[] };
};
type NotificationRefs<N> = N extends unknown ? Omit<N, 'user' | 'note'> &
 (N extends { user: SDK.User } ? { user: UserLite } : object) &
 (N extends { note: SDK.Note } ? { note: Note } : object) : never;
type NotificationCases = NotificationRefs<Exclude<SDK.Notification, { type: 'groupInvited' }>> |
 { id: string; createdAt: string; isRead: boolean; type: 'pollEnded'; note: Note; user?: UserLite; userId?: string; } |
 { id: string; createdAt: string; isRead: boolean; type: 'groupInvited'; user: UserLite; userId: string; invitation: { id: string; group: UserGroup; }; };
type NotificationField = 'user' | 'userId' | 'icon' | 'header' | 'body' | 'note' | 'reaction' | 'choice' | 'invitation';
type WithAbsentFields<T> = T extends unknown ? T & { [K in Exclude<NotificationField, keyof T>]?: never } : never;
export type Notification = WithAbsentFields<NotificationCases>;
export interface UserGroup { id: string; createdAt: string; name: string; ownerId: string; userIds: string[]; }
export interface Clip { id: string; createdAt: string; userId: string; user: UserLite; name: string; description: string | null; isPublic: boolean; }
export interface GalleryPost { id: string; createdAt: string; updatedAt: string; userId: string; user: UserLite; title: string; description: string | null; fileIds: string[]; files: DriveFile[]; tags: string[]; isSensitive: boolean; likedCount: number; isLiked?: boolean; }
// The endpoint's response predates its stale published SDK/schema declarations.
// These fields and detail-only fields follow server/api/endpoints/meta.ts.
export type LiteInstanceMetadata = Omit<Endpoints['meta']['res'], 'name' | 'bannerUrl' | 'mascotImageUrl' | 'errorImageUrl' | 'feedbackUrl' | 'repositoryUrl' | 'features' | 'cacheRemoteFiles' | 'requireSetup' | 'proxyAccountName' | 'maxNoteTextLength' | 'emojis' | 'ads'> & {
 name: string | null; bannerUrl: string | null; mascotImageUrl: string | null; errorImageUrl: string | null;
 feedbackUrl: string | null; repositoryUrl: string | null;
 faviconUrl?: string | null; themeColor: string | null; backgroundImageUrl: string | null; logoImageUrl: string | null;
 ads: Pick<Ad, 'id' | 'url' | 'place' | 'ratio' | 'imageUrl'>[];
 maxNoteTextLength: number; emojis: (CustomEmoji & { id: string; host: string | null })[];
};
export type DetailedInstanceMetadata = LiteInstanceMetadata & {
 cacheRemoteFiles: boolean; requireSetup: boolean; proxyAccountName: string | null;
 pinnedPages: string[]; pinnedClipId: string | null;
 features: NonNullable<Endpoints['meta']['res']['features']> & { emailRequiredForSignup: boolean };
};
export type InstanceMetadata = DetailedInstanceMetadata;
export type QueueCount = { waiting: number; active: number; completed: number; failed: number; delayed: number; };
export type CustomEmoji = { id?: string; name: string; url: string; aliases: string[]; category: string | null; };
export type Muting = { id: string; createdAt: string; muteeId: string; mutee: UserDetailed; };

export interface Hashtag { tag: string; mentionedUsersCount: number; mentionedLocalUsersCount: number; mentionedRemoteUsersCount: number; attachedUsersCount: number; attachedLocalUsersCount: number; attachedRemoteUsersCount: number; }
