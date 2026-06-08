import { environment } from '../../../environments/environment';

const ENV_VAR_HINT: Record<string, string> = {
  supabaseUrl: 'SUPABASE_URL',
  supabaseAnonKey: 'SUPABASE_ANON_KEY',
  sentryDsn: 'SENTRY_DSN',
  sentryRelease: 'SENTRY_RELEASE (optional — defaults from package.json)',
};

export function assertAppEnvironment(): void {
  const missing: string[] = [];

  if (!environment.supabaseUrl?.trim()) missing.push('supabaseUrl');
  if (!environment.supabaseAnonKey?.trim()) missing.push('supabaseAnonKey');
  if (!environment.sentryDsn?.trim()) missing.push('sentryDsn');
  if (!environment.sentryRelease?.trim()) missing.push('sentryRelease');

  if (missing.length) {
    const vars = missing.map((key) => ENV_VAR_HINT[key] ?? key).join(', ');
    throw new Error(
      `Missing app configuration (${missing.join(', ')}). ` +
        `Set ${vars} in frontend/.env or Render env, then run \`npm run env\`.`,
    );
  }
}
