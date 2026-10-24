declare const _VERSION_: string;
declare const _DEV_: boolean;
declare const _LANGS_: readonly (readonly [string, string])[];
declare const _ENV_: string | undefined;
declare const _PERF_PREFIX_: string;

interface NotificationAction {
	action: string;
	title: string;
	icon?: string;
}

interface NotificationOptions {
	actions?: NotificationAction[];
	renotify?: boolean;
	timestamp?: number;
	vibrate?: number[];
}
