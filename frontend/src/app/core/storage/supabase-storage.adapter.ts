import { Injectable } from '@angular/core';
import { StorageKey } from '../models/storage-keys';
import { LocalStorageAdapter } from './local-storage.adapter';
import { StorageAdapter } from './storage.interface';

/**
 * Supabase-backed storage adapter (step 2).
 * Currently delegates to localStorage — swap implementations when Supabase client is wired.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly fallback = new LocalStorageAdapter();

  get<T>(key: StorageKey): T | null {
    // TODO: fetch from Supabase app_kv_store or typed tables
    return this.fallback.get<T>(key);
  }

  set<T>(key: StorageKey, value: T): void {
    // TODO: upsert to Supabase
    this.fallback.set(key, value);
  }

  remove(key: StorageKey): void {
    // TODO: delete from Supabase
    this.fallback.remove(key);
  }

  list(prefix?: string): StorageKey[] {
    return this.fallback.list(prefix);
  }
}
