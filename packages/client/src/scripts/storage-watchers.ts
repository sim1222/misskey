/** A listener list retains the relationship between a storage key and its value. */
export class StorageWatchers<T extends object> {
 private listeners: { [K in keyof T]?: ((value: T[K]) => void)[] } = {};
 on<K extends keyof T>(key: K, callback: (value: T[K]) => void): void {
  const listeners: ((value: T[K]) => void)[] = this.listeners[key] ?? [];
  listeners.push(callback);
  this.listeners[key] = listeners;
 }
 emit<K extends keyof T>(key: K, value: T[K]): void {
  for (const listener of this.listeners[key] ?? []) listener(value);
 }
}
