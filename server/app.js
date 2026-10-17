import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import http from 'node:http';
import { createBackupStore } from './backup-store.js';
import { AuthError, createFirebaseTokenVerifier } from './firebase-auth.js';
import { HttpError, readJsonBody, sendJson } from './http.js';
import { createPushService } from './push-service.js';
import { createStaticHandler } from './static-files.js';
import { validateBackup } from './validate-backup.js';

const API_METHODS = 'GET, PUT, POST, OPTIONS';

function corsHeaders(origin, allowedOrigins) {
  if (!origin || !allowedOrigins.has(origin)) {
    return { Vary: 'Origin' };
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': API_METHODS,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function bearerToken(headerValue) {
  const match = /^Bearer (\S+)$/.exec(headerValue || '');
  return match ? match[1] : undefined;
}

/**
 * Builds the HTTP server: an authenticated backup API under /api, a real Web Push
 * notification API under /api/push, and the static web app for everything else.
 * Dependencies can be injected for tests.
 */
export function createApp({ config, verifyToken, store, pushService }) {
  const verify =
    verifyToken ||
    createFirebaseTokenVerifier({
      projectId: config.firebaseProjectId,
      allowedEmails: config.allowedEmails,
    });
  const backup = store || createBackupStore(config.dataDir);
  const push = pushService || createPushService({ dataDir: config.dataDir });
  const serveStatic = createStaticHandler(config.distDir, path.join(config.dataDir, 'uploads'));
  const allowedOrigins = new Set(config.allowedOrigins);

  async function handleApi(req, res) {
    const headers = corsHeaders(req.headers.origin, allowedOrigins);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }


    let user;
    try {
      user = await verify(bearerToken(req.headers.authorization));
    } catch (err) {
      if (err instanceof AuthError) {
        sendJson(res, err.status, { error: err.message }, headers);
        return;
      }
      console.error('token verification failed unexpectedly:', err);
      sendJson(res, 503, { error: 'authentication is unavailable' }, headers);
      return;
    }

    if (req.method === 'GET') {
      const stored = await backup.read();
      sendJson(res, 200, stored ?? { status: 'empty' }, headers);
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      let document;
      try {
        document = await readJsonBody(req, config.maxBackupBytes);
      } catch (err) {
        if (err instanceof HttpError) {
          sendJson(res, err.status, { error: err.message }, headers);
          return;
        }
        throw err;
      }

      const problem = validateBackup(document);
      if (problem) {
        sendJson(res, 400, { error: problem }, headers);
        return;
      }

      const updatedAt = new Date().toISOString();
      await backup.write({ ...document, backupMeta: { updatedAt, updatedBy: user.email } });
      sendJson(res, 200, { status: 'saved', updated_at: updatedAt }, headers);
      return;
    }

    sendJson(res, 405, { error: 'method not allowed' }, { ...headers, Allow: API_METHODS });
  }

  async function handlePushApi(req, res, pathname) {
    const headers = corsHeaders(req.headers.origin, allowedOrigins);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (pathname === '/api/push/vapid-public-key' && req.method === 'GET') {
      sendJson(res, 200, { publicKey: push.getPublicKey() }, headers);
      return;
    }

    let user;
    try {
      user = await verify(bearerToken(req.headers.authorization));
    } catch (err) {
      if (err instanceof AuthError) {
        sendJson(res, err.status, { error: err.message }, headers);
        return;
      }
      console.error('token verification failed unexpectedly:', err);
      sendJson(res, 503, { error: 'authentication is unavailable' }, headers);
      return;
    }

    if (pathname === '/api/push/subscribe' && req.method === 'POST') {
      let body;
      try {
        body = await readJsonBody(req, 65536);
      } catch (err) {
        if (err instanceof HttpError) {
          sendJson(res, err.status, { error: err.message }, headers);
          return;
        }
        throw err;
      }
      try {
        const result = push.subscribe({
          subscription: body.subscription,
          userEmail: user.email,
          deviceName: body.deviceName || 'Web Device',
        });
        sendJson(res, 200, { status: 'subscribed', ...result }, headers);
      } catch (err) {
        sendJson(res, 400, { error: err.message }, headers);
      }
      return;
    }

    if (pathname === '/api/push/unsubscribe' && req.method === 'POST') {
      let body;
      try {
        body = await readJsonBody(req, 65536);
      } catch (err) {
        if (err instanceof HttpError) {
          sendJson(res, err.status, { error: err.message }, headers);
          return;
        }
        throw err;
      }
      const result = push.unsubscribe({ endpoint: body.endpoint });
      sendJson(res, 200, { status: 'unsubscribed', ...result }, headers);
      return;
    }

    if (pathname === '/api/push/send' && req.method === 'POST') {
      let body;
      try {
        body = await readJsonBody(req, 65536);
      } catch (err) {
        if (err instanceof HttpError) {
          sendJson(res, err.status, { error: err.message }, headers);
          return;
        }
        throw err;
      }
      if (!body.title || !body.body) {
        sendJson(res, 400, { error: 'title and body are required' }, headers);
        return;
      }
      const result = await push.sendPush({
        title: String(body.title).slice(0, 200),
        body: String(body.body).slice(0, 1000),
        icon: body.icon || '/icon-192.png',
        badge: body.badge || '/icon-192.png',
        url: body.url || '/',
        tag: body.tag || 'tour_update',
        excludeEmail: body.excludeSender === false ? undefined : (body.excludeEmail || user.email),
      });
      sendJson(res, 200, { status: 'sent', ...result }, headers);
      return;
    }

    if (pathname === '/api/push/test' && req.method === 'POST') {
      const result = await push.sendTest({ userEmail: user.email });
      sendJson(res, 200, { status: 'tested', ...result }, headers);
      return;
    }

    sendJson(res, 404, { error: 'push endpoint not found' }, headers);
  }

  async function handleUploadApi(req, res) {
    const headers = corsHeaders(req.headers.origin, allowedOrigins);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'method not allowed' }, { ...headers, Allow: 'POST, OPTIONS' });
      return;
    }

    try {
      const uploadsDir = path.join(config.dataDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const clientName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'video.mp4';
      const ext = path.extname(clientName) || '.mp4';
      const safeName = `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const targetPath = path.join(uploadsDir, safeName);

      await pipeline(req, fs.createWriteStream(targetPath));

      sendJson(res, 200, { success: true, url: `/uploads/${safeName}`, fileName: safeName }, headers);
    } catch (err) {
      console.error('Upload failed:', err);
      sendJson(res, 500, { error: 'Upload failed: ' + (err.message || String(err)) }, headers);
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url || '/', 'http://localhost');

      if (pathname === '/api') {
        await handleApi(req, res);
        return;
      }
      if (pathname === '/api/upload') {
        await handleUploadApi(req, res);
        return;
      }
      if (pathname.startsWith('/api/push/')) {
        await handlePushApi(req, res, pathname);
        return;
      }
      if (pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }
      serveStatic(req, res, pathname);
    } catch (err) {
      console.error('request failed:', err);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'internal error' });
      } else {
        res.end();
      }
    }
  });

  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  return server;
}
