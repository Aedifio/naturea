import { ApplicationConfig, APP_INITIALIZER, ErrorHandler, LOCALE_ID, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, Router, withEnabledBlockingInitialNavigation } from '@angular/router';
import { createErrorHandler, TraceService } from '@sentry/angular';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { SupabaseStorageAdapter } from './core/storage/supabase-storage.adapter';
import { STORAGE_ADAPTER } from './core/storage/storage.interface';
import { environment } from '../environments/environment';

function initAuth(auth: AuthService): () => Promise<void> {
  return () => auth.init();
}

const sentryProviders = environment.sentryDsn?.trim()
  ? [
      {
        provide: ErrorHandler,
        useValue: createErrorHandler({ logErrors: true, showDialog: false }),
      },
      { provide: TraceService, deps: [Router] },
      provideAppInitializer(() => {
        inject(TraceService);
      }),
    ]
  : [];

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: STORAGE_ADAPTER, useClass: SupabaseStorageAdapter },
    ...sentryProviders,
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
