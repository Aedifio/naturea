import { inject, Injectable, Injector } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { assertAppEnvironment } from '../config/assert-app-environment';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;
  private readonly injector = inject(Injector);

  constructor() {
    assertAppEnvironment();
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  get auth() {
    return this.client.auth;
  }

  from(table: string) {
    return this.wrapThenable(this.client.from(table));
  }

  storage(bucket: string) {
    return this.wrapObject(this.client.storage.from(bucket));
  }

  rpc<T = unknown>(fn: string, params?: Record<string, unknown>) {
    return this.wrapThenable(this.client.rpc(fn, params));
  }

  private async beforeDataAccess(): Promise<void> {
    await this.injector.get(AuthService).ensureAccountActive();
  }

  private wrapThenable<T extends object>(value: T): T {
    return new Proxy(value, {
      get: (target, prop, receiver) => {
        const original = Reflect.get(target, prop, receiver);
        if (prop === 'then' && typeof original === 'function') {
          return (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
            this.beforeDataAccess().then(() => original.call(target, onFulfilled, onRejected));
        }
        if (typeof original === 'function') {
          return (...args: unknown[]) => {
            const result = original.apply(target, args);
            if (result && typeof result === 'object') {
              return this.wrapThenable(result as object);
            }
            return result;
          };
        }
        return original;
      },
    }) as T;
  }

  private wrapObject<T extends object>(value: T): T {
    return new Proxy(value, {
      get: (target, prop, receiver) => {
        const original = Reflect.get(target, prop, receiver);
        if (typeof original !== 'function') return original;
        return (...args: unknown[]) => {
          const result = original.apply(target, args);
          if (result && typeof result === 'object' && typeof (result as PromiseLike<unknown>).then === 'function') {
            return this.beforeDataAccess().then(() => result);
          }
          if (result && typeof result === 'object') {
            return this.wrapObject(result as object);
          }
          return result;
        };
      },
    }) as T;
  }
}
