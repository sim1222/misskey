export const soundTypes = ['note', 'noteMy', 'notification', 'chat', 'chatBg', 'antenna', 'channel'] as const;
export type SoundType = typeof soundTypes[number];
export interface SoundSetting { type: string | null; volume: number }
export function soundKey<T extends SoundType>(type: T): `sound_${T}` { return `sound_${type}`; }
export function defaultSound(type: string): SoundSetting { return { type, volume: 1 }; }
