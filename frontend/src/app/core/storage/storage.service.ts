import { Inject, Injectable } from '@angular/core';
import { StorageKey } from '../models/storage-keys';
import { STORAGE_ADAPTER, StorageAdapter } from './storage.interface';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(@Inject(STORAGE_ADAPTER) private readonly adapter: StorageAdapter) {}

  get<T>(key: StorageKey): T | null {
    return this.adapter.get<T>(key);
  }

  set<T>(key: StorageKey, value: T): void {
    this.adapter.set(key, value);
  }

  remove(key: StorageKey): void {
    this.adapter.remove(key);
  }

  getOrDefault<T>(key: StorageKey, fallback: T): T {
    const v = this.get<T>(key);
    return v ?? fallback;
  }
}
