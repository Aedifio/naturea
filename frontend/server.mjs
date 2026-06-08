/**
 * Node web service for Render — static files + SPA fallback.
 * All client-side routes (e.g. /apps/chiffrage) fall back to index.html.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist/frontend/browser');
const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
const indexHtml = join(root, 'index.html');
const host = '0.0.0.0';
const port = Number(process.env.PORT) || 3000;

if (!existsSync(indexHtml)) {
  console.error(`server.mjs: build output not found at ${indexHtml}`);
  console.error('Run: npm run build');
  process.exit(1);
}

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
  if (!absolute.startsWith(rootPrefix)) return null;
  return absolute;
}

function isSpaRoute(filePath) {
  const ext = extname(filePath);
  return ext === '' || ext === '.html';
}

async function sendFile(res, filePath) {
  const data = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': filePath === indexHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(data);
}

function redirect(res, location, status = 303) {
  res.writeHead(status, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  res.end();
}

function drainRequestBody(req) {
  return new Promise((resolve) => {
    req.on('data', () => {});
    req.on('end', resolve);
    req.on('error', resolve);
  });
}

async function serveSpa(res, method) {
  if (method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end();
    return;
  }
  await sendFile(res, indexHtml);
}

createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const urlPath = (req.url ?? '/').split('?')[0];

  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  if (method === 'POST' && urlPath === '/login') {
    await drainRequestBody(req);
    redirect(res, '/home');
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
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

  if (isSpaRoute(filePath) && !existsSync(filePath)) {
    await serveSpa(res, method);
    return;
  }

  try {
    if (method === 'HEAD') {
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

    if (!isSpaRoute(filePath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    await serveSpa(res, method);
  }
}).listen(port, host, () => {
  console.log(`SPA server listening on http://${host}:${port}`);
  console.log(`Serving ${root}`);
});
