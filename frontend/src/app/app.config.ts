import { ApplicationConfig, APP_INITIALIZER, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { SupabaseStorageAdapter } from './core/storage/supabase-storage.adapter';
import { STORAGE_ADAPTER } from './core/storage/storage.interface';

function initAuth(auth: AuthService): () => void {
  void auth.init();
  return () => undefined;
}

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: STORAGE_ADAPTER, useClass: SupabaseStorageAdapter },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
