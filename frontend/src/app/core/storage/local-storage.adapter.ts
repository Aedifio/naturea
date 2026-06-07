import { Injectable } from '@angular/core';
import { StorageKey } from '../models/storage-keys';
import { StorageAdapter } from './storage.interface';

@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: StorageKey): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[LocalStorageAdapter] write failed', key, e);
    }
  }

  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  list(prefix?: string): StorageKey[] {
    const keys: StorageKey[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && Object.values(StorageKey).includes(k as StorageKey)) {
        if (!prefix || k.startsWith(prefix)) {
          keys.push(k as StorageKey);
        }
      }
    }
    return keys;
  }
}
