import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, normalize } from 'node:path';
import { URL } from 'node:url';

import { createRouter } from './router.js';
import { ApiError, notFound, internalError } from './errors.js';
import { listUsers, getUserDetail } from './users/controller.js';
import { predictForUser, predictFromQuestionnaire } from './prediction/controller.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(HERE, 'static');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const router = createRouter();

router.add('GET', '/api/v1/users', ({ query }) => listUsers({ query }));
router.add('GET', '/api/v1/users/:userId', (ctx) => {
  const { rawProfile, ...rest } = getUserDetail(ctx);
  return rest;
});
router.add('POST', '/api/v1/users/:userId/prediction', (ctx) => predictForUser(ctx));
router.add('POST', '/api/v1/predictions', (ctx) => predictFromQuestionnaire(ctx));

function sendJson(res, status, body) {
  const data = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
  });
  res.end(data);
}

function sendError(res, err) {
  const e = err instanceof ApiError ? err : internalError(err?.message ?? 'unknown error');
  sendJson(res, e.status, e.toResponse());
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new ApiError('PAYLOAD_TOO_LARGE', 413, 'request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = normalize(resolve(STATIC_DIR, '.' + rel));
  if (!filePath.startsWith(STATIC_DIR)) {
    sendError(res, notFound());
    return true;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;
  const ext = extname(filePath).toLowerCase();
  const data = readFileSync(filePath);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'content-length': data.length,
  });
  res.end(data);
  return true;
}

export async function handle(req, res) {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = parsed.pathname;
    const query = Object.fromEntries(parsed.searchParams);

    if (pathname.startsWith('/api/')) {
      const matched = router.match(req.method, pathname);
      if (!matched) throw notFound(`Route ${req.method} ${pathname} not found`);
      let body;
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const raw = await readBody(req);
        if (raw.trim() === '') {
          body = null;
        } else {
          try {
            body = JSON.parse(raw);
          } catch {
            throw new ApiError('INVALID_INPUT', 400, 'body is not valid JSON');
          }
        }
      }
      const result = await matched.handler({ params: matched.params, query, body });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (serveStatic(req, res, pathname)) return;
    }
    throw notFound(`Route ${req.method} ${pathname} not found`);
  } catch (err) {
    sendError(res, err);
  }
}

export function createServer() {
  return http.createServer(handle);
}

const invokedDirectly = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '');
if (invokedDirectly) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => {
    console.log(`risk-ident-demo listening on http://localhost:${port}`);
  });
}
