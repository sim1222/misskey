// redis-lock 0.1.4: the callback receives an unlock function (not an error).
// Its custom promisify implementation is part of the public runtime API.
declare module 'redis-lock' {
	import { promisify } from 'node:util';
	import type Redis from 'ioredis';

	type Unlock = () => Promise<number | undefined>;
	interface Lock {
		(key: string, callback: (unlock: Unlock) => void): void;
		(key: string, timeout: number, callback: (unlock: Unlock) => void): void;
		[promisify.custom](key: string, timeout?: number): Promise<Unlock>;
	}
	function redisLock(client: Pick<Redis.Redis, 'set' | 'setnx' | 'del'>, retryDelay?: number): Lock;
	export = redisLock;
}
