/**
 * Shape of generated environment files — no secrets here.
 * Run `npm run env` (reads frontend/.env) to create gitignored:
 *   - environment.ts
 *   - environment.prod.ts
 */
export const environment = {
  production: false,
  appVersion: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  sentryDsn: '',
  sentryRelease: '',
};
