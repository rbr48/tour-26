import http from 'node:http';
import { createBackupStore } from './backup-store.js';
import { AuthError, createFirebaseTokenVerifier } from './firebase-auth.js';
import { HttpError, readJsonBody, sendJson } from './http.js';
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
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function bearerToken(headerValue) {
  const match = /^Bearer (\S+)$/.exec(headerValue || '');
  return match ? match[1] : undefined;
}

/**
 * Builds the HTTP server: an authenticated backup API under /api and the static
 * web app for everything else. Dependencies can be injected for tests.
 */
export function createApp({ config, verifyToken, store }) {
  const verify =
    verifyToken ||
    createFirebaseTokenVerifier({
      projectId: config.firebaseProjectId,
      allowedEmails: config.allowedEmails,
    });
  const backup = store || createBackupStore(config.dataDir);
  const serveStatic = createStaticHandler(config.distDir);
  const allowedOrigins = new Set(config.allowedOrigins);

  async function handleApi(req, res) {
    const headers = corsHeaders(req.headers.origin, allowedOrigins);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (config.allowedEmails.length === 0) {
      sendJson(res, 503, { error: 'backup is not configured' }, headers);
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

  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url || '/', 'http://localhost');

      if (pathname === '/api') {
        await handleApi(req, res);
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
