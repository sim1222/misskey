import type { ColdDeviceStorage, defaultStore } from '@/store';
import { defaultStoreSaveKeys, coldDeviceStorageSaveKeys } from './preferences-keys.ts';
import { preferenceShapes, hotPreferenceShapes, coldPreferenceShapes } from './preference-shapes.ts';
import { matchesRuntimeShape } from './runtime-shape.ts';
import { isRecord } from './form.ts';
export type HotPreferences = Partial<Pick<typeof defaultStore.state, typeof defaultStoreSaveKeys[number]>>;
export type ColdPreferences = Partial<Pick<typeof ColdDeviceStorage.default, typeof coldDeviceStorageSaveKeys[number]>>;
export interface PreferencesProfile {
 name: string; createdAt: string; updatedAt: string | null; misskeyVersion: string; host?: string;
 settings: { hot: HotPreferences; cold: ColdPreferences; fontSize: string | null; useSystemFont: string | null; wallpaper: string | null };
}
function fieldsMatch(value: unknown, fields: Readonly<Record<string, number>>): boolean {
 return isRecord(value) && Object.entries(value).every(([key, item]) => !Object.hasOwn(fields, key) || matchesRuntimeShape(item, fields[key], preferenceShapes));
}
export function isHotPreferences(value: unknown): value is HotPreferences { return fieldsMatch(value, hotPreferenceShapes); }
export function isColdPreferences(value: unknown): value is ColdPreferences { return fieldsMatch(value, coldPreferenceShapes); }
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const timestamp = (value: unknown) => typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
export function isPreferencesProfile(value: unknown): value is PreferencesProfile {
 if (!isRecord(value) || typeof value.name !== 'string' || !timestamp(value.createdAt) || !(value.updatedAt === null || timestamp(value.updatedAt)) || typeof value.misskeyVersion !== 'string' || !(value.host === undefined || typeof value.host === 'string')) return false;
 const settings = value.settings;
 return isRecord(settings) && isHotPreferences(settings.hot) && isColdPreferences(settings.cold) &&
  nullableString(settings.fontSize) && nullableString(settings.useSystemFont) && nullableString(settings.wallpaper);
}
