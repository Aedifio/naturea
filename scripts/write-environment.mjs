/**
 * Back-compat entry point when Render build command still uses
 * `cd .. && node scripts/write-environment.mjs` with rootDir=frontend.
 * Prefer running from frontend/: `node scripts/write-environment.mjs`
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const frontendScript = join(repoRoot, 'frontend/scripts/write-environment.mjs');

if (!existsSync(frontendScript)) {
  console.error(`write-environment: frontend script not found at ${frontendScript}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [frontendScript], {
  stdio: 'inherit',
  env: process.env,
  cwd: join(repoRoot, 'frontend'),
});

process.exit(result.status ?? 1);
