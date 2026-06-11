/**
 * Node web service for Render — static files + SPA fallback.
 * All client-side routes (e.g. /apps/chiffrage) fall back to index.html.
 * Renders app bootstrap on refresh, guards restore session, router navigates to original route.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('.', import.meta.url));
const root = join(cwd, 'dist/frontend/browser');
const indexHtml = join(root, 'index.html');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT) || 3000;

// Validate build output
if (!existsSync(indexHtml)) {
  console.error(`❌ Build output missing: ${indexHtml}`);
  console.error('Run: npm run build');
  process.exit(1);
}

console.log(`✓ Build found at ${root}`);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
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

/**
 * Resolve a URL path to a file path, with basic security checks.
 * Returns null if the path escapes the root directory.
 */
function resolvePath(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;

  // Remove query string
  const path = urlPath.split('?')[0];

  // Decode and normalize
  let decoded;
  try {
    decoded = decodeURIComponent(path || '/');
  } catch {
    return null;
  }

  // Path normalization
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const absolute = normalize(join(root, relative));

  // Security: ensure the file is within root
  const normalized = absolute.endsWith(sep) ? absolute.slice(0, -1) : absolute;
  const rootNorm = root.endsWith(sep) ? root.slice(0, -1) : root;
  if (!normalized.startsWith(rootNorm + sep) && normalized !== rootNorm) {
    return null;
  }

  return absolute;
}

function isAsset(filePath) {
  return extname(filePath) !== '';
}

async function sendFile(res, filePath, contentType = null) {
  try {
    const data = await readFile(filePath);
    const type = contentType || mimeTypes[extname(filePath)] || 'application/octet-stream';
    const isIndex = filePath === indexHtml;

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': data.length,
      'Cache-Control': isIndex ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(data);
  } catch (err) {
    console.error(`sendFile error for ${filePath}:`, err.message);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

async function sendIndex(res) {
  await sendFile(res, indexHtml, 'text/html; charset=utf-8');
}

function sendError(res, code, message) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}


const server = createServer(async (req, res) => {
  try {
    const method = req.method || 'GET';
    const fullUrl = req.url || '/';
    const urlPath = fullUrl.split('?')[0];

    // Health check for Render
    if (urlPath === '/health' || urlPath === '/health.html') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }


    // Only GET and HEAD allowed for file serving
    if (method !== 'GET' && method !== 'HEAD') {
      sendError(res, 405, 'Method Not Allowed');
      return;
    }

    const filePath = resolvePath(fullUrl);
    if (!filePath) {
      sendError(res, 400, 'Bad Request');
      return;
    }

    // File exists → serve it
    if (existsSync(filePath)) {
      if (method === 'HEAD') {
        res.writeHead(200);
        res.end();
        return;
      }
      await sendFile(res, filePath);
      return;
    }

    // File doesn't exist
    if (isAsset(filePath)) {
      // Asset (js, css, png, etc.) → 404
      sendError(res, 404, 'Not Found');
      return;
    }

    // SPA route (no extension) → serve index.html
    if (method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end();
      return;
    }
    await sendIndex(res);
  } catch (err) {
    console.error(`Request error [${req.method} ${req.url}]:`, err.message);
    if (!res.headersSent) {
      sendError(res, 500, 'Internal Server Error');
    }
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`\n  🚀 SPA server listening on http://${host}:${port}`);
  console.log(`     Serving: ${root}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
