/**
 * Copy index.html → 404.html for hosts that serve a custom 404 page.
 * Render static sites rely on rewrite rules; Node server.mjs handles SPA fallback.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist/frontend/browser');
const index = join(dist, 'index.html');
const notFound = join(dist, '404.html');

if (!existsSync(index)) {
  console.error('postbuild-static: index.html not found — run ng build first');
  process.exit(1);
}

copyFileSync(index, notFound);
console.log('postbuild-static: copied index.html → 404.html');
