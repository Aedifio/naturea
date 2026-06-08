/**
 * Writes src/environments/environment.ts and environment.prod.ts from env vars.
 * Loads frontend/.env when present (local dev). Fails if required vars are missing.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envDir = join(frontendRoot, 'src/environments');

function loadDotEnv() {
  const envPath = join(frontendRoot, '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env) || !process.env[key]?.trim()) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const required = [
  ['SUPABASE_URL', process.env.SUPABASE_URL],
  ['SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY],
];

const missing = required
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

if (missing.length) {
  console.error(
    `write-environment: missing required environment variable(s): ${missing.join(', ')}`,
  );
  console.error('Set them in Render, or locally in frontend/.env (see .env.example).');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY.trim();

function escapeTsString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function writeEnvironment(filename, production) {
  const outPath = join(envDir, filename);
  const contents = `export const environment = {
  production: ${production},
  supabaseUrl: '${escapeTsString(supabaseUrl)}',
  supabaseAnonKey: '${escapeTsString(supabaseAnonKey)}',
};
`;
  writeFileSync(outPath, contents, 'utf8');
  console.log(`Wrote ${outPath}`);
}

writeEnvironment('environment.ts', false);
writeEnvironment('environment.prod.ts', true);
