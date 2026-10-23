// The spellings below are the actual syslog-pro 1.0.0 API.
declare module 'syslog-pro' {
	export interface RFC5424Options {
		applacationName?: string;
		timestamp?: boolean;
		encludeStructuredData?: boolean;
		color?: boolean;
		extendedColor?: boolean;
		server?: { target: string; port: number };
	}
	export class RFC5424 {
		constructor(options?: RFC5424Options);
		error(message: string): Promise<unknown>;
		warning(message: string): Promise<unknown>;
		info(message: string): Promise<unknown>;
	}
}
