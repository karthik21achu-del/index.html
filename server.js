import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, 'dist/client');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

let worker;
try {
  worker = (await import('./dist/server/index.js')).default;
} catch {
  worker = (await import('./worker/index.js')).default;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url || '/', origin);

    // 1. Health check endpoint for container orchestrators (AWS ECS, GCP Cloud Run, K8s, Render)
    if (url.pathname === '/healthz' || url.pathname === '/livez') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('OK');
      return;
    }

    // 2. API routing to EcoShield environmental Worker
    if (url.pathname.startsWith('/api/')) {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v);
          } else {
            headers.set(key, value);
          }
        }
      }

      let body = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }

      const response = await worker.fetch(
        new Request(url.toString(), {
          method: req.method,
          headers,
          body,
        }),
        process.env,
        {}
      );

      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      const responseBuffer = Buffer.from(await response.arrayBuffer());
      res.end(responseBuffer);
      return;
    }

    // 3. Static asset resolution
    let pathname = decodeURIComponent(url.pathname);
    let filePath = path.resolve(CLIENT_DIR, '.' + pathname);

    // Security: prevent directory traversal
    if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    let stat;
    try {
      stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stat = await fs.stat(filePath);
      }
    } catch {
      // SPA Fallback: serve index.html for client-side routing
      filePath = path.join(CLIENT_DIR, 'index.html');
      try {
        stat = await fs.stat(filePath);
      } catch {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('EcoShield application build missing. Please run: npm run build');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Caching headers: hashed assets in /assets/ can be cached permanently
    const cacheControl = url.pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';

    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🛡️  EcoShield production server running on http://${HOST}:${PORT}`);
  console.log(`📡 Ready to serve environmental intelligence feeds and static UI`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
