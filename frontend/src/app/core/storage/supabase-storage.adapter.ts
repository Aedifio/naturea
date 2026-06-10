import { Injectable, signal } from '@angular/core';
import { StorageKey } from '../models/storage-keys';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageAdapter } from './storage.interface';

/** In-memory cache backed by Supabase `app_kv_store`. */
@Injectable({ providedIn: 'root' })
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly cache = new Map<string, unknown>();
  private readonly hydrated = signal(false);

  readonly isHydrated = this.hydrated.asReadonly();

  constructor(private readonly supabase: SupabaseService) {}

  /** Load all KV rows after authentication. */
  async hydrate(): Promise<void> {
    const { data, error } = await this.supabase.from('app_kv_store').select('storage_key, data');
    if (error) {
      console.error('[SupabaseStorage] hydrate failed', error);
      return;
    }
    this.cache.clear();
    for (const row of data ?? []) {
      this.cache.set(row.storage_key, row.data);
    }
    this.hydrated.set(true);
  }

  clearCache(): void {
    this.cache.clear();
    this.hydrated.set(false);
  }

  get<T>(key: StorageKey): T | null {
    const v = this.cache.get(key);
    return v === undefined ? null : (v as T);
  }

  set<T>(key: StorageKey, value: T): void {
    this.cache.set(key, value);
    void this.persist(key, value);
  }

  remove(key: StorageKey): void {
    this.cache.delete(key);
    void this.supabase
      .from('app_kv_store')
      .delete()
      .eq('storage_key', key)
      .then(({ error }) => {
        if (error) console.error('[SupabaseStorage] remove failed', key, error);
      });
  }

  list(prefix?: string): StorageKey[] {
    const keys: StorageKey[] = [];
    for (const k of this.cache.keys()) {
      if (!prefix || k.startsWith(prefix)) {
        keys.push(k as StorageKey);
      }
    }
    return keys;
  }

  private async persist<T>(key: StorageKey, value: T): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (!data.session) return;

    const { error } = await this.supabase.from('app_kv_store').upsert(
      { storage_key: key, data: value as object },
      { onConflict: 'storage_key' },
    );
    if (error) console.error('[SupabaseStorage] persist failed', key, error);
  }
}
