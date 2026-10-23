import { Inject, Injectable } from '@nestjs/common';
import * as SyslogPro from 'syslog-pro';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import Logger from '@/logger.js';

@Injectable()
export class LoggerService {
	private syslogClient: SyslogPro.RFC5424 | null = null;

	constructor(
		@Inject(DI.config)
		private config: Config,
	) {
		if (this.config.syslog) {
			this.syslogClient = new SyslogPro.RFC5424({
				applacationName: 'Misskey',
				timestamp: true,
				encludeStructuredData: true,
				color: true,
				extendedColor: true,
				server: {
					target: config.syslog.host,
					port: config.syslog.port,
				},
			});
		}
	}

	public getLogger(domain: string, color?: ConstructorParameters<typeof Logger>[1], store?: boolean) {
		return new Logger(domain, color, store, this.syslogClient);
	}
}
