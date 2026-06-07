import { ApplicationConfig, APP_INITIALIZER, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { DemoDataSeedService } from './core/services/demo-data-seed.service';
import { LocalStorageAdapter } from './core/storage/local-storage.adapter';
import { STORAGE_ADAPTER } from './core/storage/storage.interface';

function initDemoData(seed: DemoDataSeedService): () => void {
  return () => seed.seedIfNeeded();
}

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: STORAGE_ADAPTER, useClass: LocalStorageAdapter },
    {
      provide: APP_INITIALIZER,
      useFactory: initDemoData,
      deps: [DemoDataSeedService],
      multi: true,
    },
  ],
};
