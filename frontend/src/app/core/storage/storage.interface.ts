import { StorageKey } from '../models/storage-keys';

export interface StorageAdapter {
  get<T>(key: StorageKey): T | null;
  set<T>(key: StorageKey, value: T): void;
  remove(key: StorageKey): void;
  list(prefix?: string): StorageKey[];
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
