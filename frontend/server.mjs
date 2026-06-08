/**
 * Minimal static server with SPA fallback for Render (Node web service).
 * Render static sites ignore Netlify-style `_redirects`; this guarantees
 * deep links and browser refresh work without dashboard rewrite rules.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist/frontend/browser');
const port = Number(process.env.PORT) || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const absolute = normalize(join(root, relative));
  if (!absolute.startsWith(root)) return null;
  return absolute;
}

async function sendFile(res, filePath) {
  const data = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(data);
}

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolvePath(req.url ?? '/');
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  try {
    if (req.method === 'HEAD') {
      res.writeHead(200);
      res.end();
      return;
    }
    await sendFile(res, filePath);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : null;
    if (code !== 'ENOENT') {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }

    const isAsset = extname(filePath) !== '';
    if (isAsset) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    try {
      await sendFile(res, join(root, 'index.html'));
    } catch {
      res.writeHead(500);
      res.end('index.html missing — run npm run build first');
    }
  }
}).listen(port, () => {
  console.log(`SPA server listening on port ${port}`);
});
