import { environment } from '../../../environments/environment';

export function assertSupabaseEnvironment(): void {
  const missing: string[] = [];
  if (!environment.supabaseUrl?.trim()) missing.push('supabaseUrl');
  if (!environment.supabaseAnonKey?.trim()) missing.push('supabaseAnonKey');

  if (missing.length) {
    throw new Error(
      `Missing Supabase configuration (${missing.join(', ')}). ` +
        'Run `npm run env` after setting SUPABASE_URL and SUPABASE_ANON_KEY in frontend/.env.',
    );
  }
}
