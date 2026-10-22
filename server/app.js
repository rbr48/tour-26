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
import { createReelsRegistry } from './reels-registry.js';
import { compressVideo } from './video-compressor.js';
import { createReelsArchiver } from './reels-archiver.js';

const API_METHODS = 'GET, PUT, POST, OPTIONS';

function corsHeaders(origin, allowedOrigins) {
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': API_METHODS,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name, X-Post-Id, X-Upload-Id, X-Chunk-Index, X-Total-Chunks',
      'Access-Control-Max-Age': '600',
    };
  }
  if (!allowedOrigins.has(origin)) {
    return { Vary: 'Origin' };
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': API_METHODS,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name, X-Post-Id, X-Upload-Id, X-Chunk-Index, X-Total-Chunks',
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
export function createApp({ config, verifyToken, store, pushService, reelsRegistry, reelsArchiver }) {
  const verify =
    verifyToken ||
    createFirebaseTokenVerifier({
      projectId: config.firebaseProjectId,
      allowedEmails: config.allowedEmails,
    });
  const backup = store || createBackupStore(config.dataDir);
  const push = pushService || createPushService({ dataDir: config.dataDir });
  const registry = reelsRegistry || createReelsRegistry(config.dataDir);
  const archiver = reelsArchiver || createReelsArchiver({ dataDir: config.dataDir, registry });
  const serveStatic = createStaticHandler(config.distDir, path.join(config.dataDir, 'uploads'), registry);
  const allowedOrigins = new Set(config.allowedOrigins);

  // Start background cron check for 7-day retention
  archiver.startSchedule();

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
          fcmToken: body.fcmToken,
          userEmail: user.email,
          deviceName: body.deviceName || (body.fcmToken ? 'Android Phone' : 'Web Device'),
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
      const result = push.unsubscribe({ endpoint: body.endpoint, fcmToken: body.fcmToken });
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
        icon: body.icon || '/icons/icon-192.png?v=20261019',
        badge: body.badge || '/icons/icon-192.png?v=20261019',
        url: body.url || '/',
        tag: body.tag || 'tour_update',
        tab: body.tab,
        excludeEmail: body.excludeSender === false ? undefined : (body.excludeEmail || user.email),
      });
      sendJson(res, 200, { status: 'sent', ...result }, headers);
      return;
    }

    if (pathname === '/api/push/test' && req.method === 'POST') {
      let body = {};
      try {
        body = await readJsonBody(req, 4096);
      } catch {}
      const result = await push.sendTest({
        userEmail: user.email,
        fcmToken: body?.fcmToken,
        endpoint: body?.endpoint,
      });
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

    if (req.method !== 'POST' && req.method !== 'GET') {
      sendJson(res, 405, { error: 'method not allowed' }, { ...headers, Allow: 'GET, POST, OPTIONS' });
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

    try {
      const uploadsDir = path.join(config.dataDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      if (req.method === 'GET') {
        const { searchParams } = new URL(req.url || '/', 'http://localhost');
        const uploadId = (searchParams.get('uploadId') || req.headers['x-upload-id'] || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!uploadId) {
          sendJson(res, 400, { error: 'uploadId parameter required' }, headers);
          return;
        }
        const chunkDir = path.join(uploadsDir, 'chunks_' + uploadId);
        if (!fs.existsSync(chunkDir)) {
          sendJson(res, 200, { success: true, uploadId, chunks: [], exists: false }, headers);
          return;
        }
        try {
          const files = await fs.promises.readdir(chunkDir);
          const chunks = files
            .map((f) => {
              const m = f.match(/^part_(\d+)$/);
              return m ? parseInt(m[1], 10) : null;
            })
            .filter((n) => n !== null)
            .sort((a, b) => a - b);
          sendJson(res, 200, { success: true, uploadId, chunks, exists: true }, headers);
          return;
        } catch (err) {
          sendJson(res, 500, { error: 'Failed to inspect chunks' }, headers);
          return;
        }
      }

      const clientName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'video.mp4';
      const postId = req.headers['x-post-id'] ? decodeURIComponent(req.headers['x-post-id']) : null;
      const uploadId = req.headers['x-upload-id']
        ? decodeURIComponent(req.headers['x-upload-id']).replace(/[^a-zA-Z0-9_-]/g, '')
        : null;
      const chunkIndexHeader = req.headers['x-chunk-index'];
      const totalChunksHeader = req.headers['x-total-chunks'];

      // Chunked upload handling (bypasses Cloudflare 100MB body limit & supports resume/progress)
      if (uploadId && chunkIndexHeader !== undefined && totalChunksHeader !== undefined) {
        const chunkIndex = parseInt(chunkIndexHeader, 10);
        const totalChunks = parseInt(totalChunksHeader, 10);

        if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || totalChunks <= 0 || chunkIndex >= totalChunks) {
          sendJson(res, 400, { error: 'Invalid chunk parameters' }, headers);
          return;
        }

        const chunkDir = path.join(uploadsDir, `chunks_${uploadId}`);
        if (!fs.existsSync(chunkDir)) {
          fs.mkdirSync(chunkDir, { recursive: true });
        }

        const chunkPath = path.join(chunkDir, `part_${String(chunkIndex).padStart(5, '0')}`);
        await pipeline(req, fs.createWriteStream(chunkPath));

        // Intermediate chunk: return 200 OK
        if (chunkIndex < totalChunks - 1) {
          sendJson(res, 200, {
            success: true,
            chunkReceived: chunkIndex,
            totalChunks,
            uploadId,
          }, headers);
          return;
        }

        // Final chunk: assemble all parts in numerical order
        const chunkFiles = [];
        for (let i = 0; i < totalChunks; i++) {
          const expected = path.join(chunkDir, `part_${String(i).padStart(5, '0')}`);
          if (!fs.existsSync(expected)) {
            sendJson(res, 400, { error: `Missing chunk ${i}` }, headers);
            return;
          }
          chunkFiles.push(expected);
        }

        const isImage = /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(clientName);
        const prefix = isImage ? 'photo_' : 'reel_';
        const ext = path.extname(clientName) || (isImage ? '.jpg' : '.mp4');
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const safeName = `${prefix}${Date.now()}_${randomSuffix}${ext}`;
        const rawName = `raw_${Date.now()}_${randomSuffix}${ext}`;
        const rawPath = path.join(uploadsDir, rawName);
        const targetPath = path.join(uploadsDir, safeName);

        const destStream = fs.createWriteStream(isImage ? targetPath : rawPath);
        for (const cf of chunkFiles) {
          const chunkData = await fs.promises.readFile(cf);
          destStream.write(chunkData);
        }
        await new Promise((resolve, reject) => {
          destStream.end((err) => (err ? reject(err) : resolve()));
        });

        // Clean up temporary chunks
        for (const cf of chunkFiles) {
          await fs.promises.unlink(cf).catch(() => {});
        }
        await fs.promises.rmdir(chunkDir).catch(() => {});

        if (isImage) {
          const imgSize = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
          sendJson(res, 200, {
            success: true,
            url: `/uploads/${safeName}`,
            fileName: safeName,
            type: 'image',
            size: imgSize,
          }, headers);
          return;
        }

        // Compress video to 720p H.264
        const compResult = await compressVideo(rawPath, targetPath);

        // Register in retention tracker
        registry.addReel({
          id: safeName,
          fileName: safeName,
          postId,
          originalSize: compResult.originalSize,
          compressedSize: compResult.compressedSize,
          uploadedAt: Date.now(),
        });

        sendJson(res, 200, {
          success: true,
          url: `/uploads/${safeName}`,
          fileName: safeName,
          type: 'video',
          compressed: compResult.compressed,
          originalSize: compResult.originalSize,
          compressedSize: compResult.compressedSize,
        }, headers);
        return;
      }

      // Single non-chunked stream fallback
      const isImage = /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(clientName);
      const prefix = isImage ? 'photo_' : 'reel_';
      const ext = path.extname(clientName) || (isImage ? '.jpg' : '.mp4');
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const safeName = `${prefix}${Date.now()}_${randomSuffix}${ext}`;
      const rawName = `raw_${Date.now()}_${randomSuffix}${ext}`;
      const rawPath = path.join(uploadsDir, rawName);
      const targetPath = path.join(uploadsDir, safeName);

      if (isImage) {
        await pipeline(req, fs.createWriteStream(targetPath));
        const imgSize = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
        sendJson(res, 200, {
          success: true,
          url: `/uploads/${safeName}`,
          fileName: safeName,
          type: 'image',
          size: imgSize,
        }, headers);
        return;
      }

      // 1. Stream incoming video to temporary raw file
      await pipeline(req, fs.createWriteStream(rawPath));

      // 2. Compress video asynchronously using 720p H.264 optimization
      const compResult = await compressVideo(rawPath, targetPath);

      // 3. Register in reels registry for 7-day retention tracking
      registry.addReel({
        id: safeName,
        fileName: safeName,
        postId,
        originalSize: compResult.originalSize,
        compressedSize: compResult.compressedSize,
        uploadedAt: Date.now(),
      });

      sendJson(res, 200, {
        success: true,
        url: `/uploads/${safeName}`,
        fileName: safeName,
        type: 'video',
        compressed: compResult.compressed,
        originalSize: compResult.originalSize,
        compressedSize: compResult.compressedSize,
      }, headers);
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
      if (pathname === '/api/reels/registry' && (req.method === 'GET' || req.method === 'OPTIONS')) {
        const headers = corsHeaders(req.headers.origin, allowedOrigins);
        if (req.method === 'OPTIONS') {
          res.writeHead(204, headers);
          res.end();
          return;
        }
        try {
          await verify(bearerToken(req.headers.authorization));
        } catch (err) {
          if (err instanceof AuthError) {
            sendJson(res, err.status, { error: err.message }, headers);
            return;
          }
          sendJson(res, 503, { error: 'authentication is unavailable' }, headers);
          return;
        }
        sendJson(res, 200, registry.getAll(), headers);
        return;
      }
      if (pathname === '/api/reels/archive-check' && (req.method === 'POST' || req.method === 'OPTIONS')) {
        const headers = corsHeaders(req.headers.origin, allowedOrigins);
        if (req.method === 'OPTIONS') {
          res.writeHead(204, headers);
          res.end();
          return;
        }
        try {
          await verify(bearerToken(req.headers.authorization));
        } catch (err) {
          if (err instanceof AuthError) {
            sendJson(res, err.status, { error: err.message }, headers);
            return;
          }
          sendJson(res, 503, { error: 'authentication is unavailable' }, headers);
          return;
        }
        const result = await archiver.archiveExpiredReels();
        sendJson(res, 200, result, headers);
        return;
      }
      if (pathname.startsWith('/api/push/')) {
        await handlePushApi(req, res, pathname);
        return;
      }
      if (pathname === '/api/app-version' && (req.method === 'GET' || req.method === 'OPTIONS')) {
        const headers = corsHeaders(req.headers.origin, allowedOrigins);
        if (req.method === 'OPTIONS') {
          res.writeHead(204, headers);
          res.end();
          return;
        }
        let versionData = {
          versionCode: 18,
          versionName: '2.18',
          minVersionCode: 1,
          apkUrl: 'https://tour2026.izhaanintellect.fun/Tour2026-v18.apk',
          apkSize: '8.2 MB',
          releaseNotes: 'নতুন আপডেট v2.9: PWA আইকন ও হোমস্ক্রিন মাস্কিং আপডেট, গেমিং জোনে লাইভ রিঅ্যাকশন মেনু এবং ফ্লোটিং ডায়ালগ বাবল ফিক্স।',
          releasedAt: '2026-10-19T01:45:00Z',
          forceUpdate: false,
        };
        const versionFilePath = path.join(config.distDir, 'version.json');
        if (fs.existsSync(versionFilePath)) {
          try {
            versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
          } catch {}
        }
        sendJson(res, 200, versionData, headers);
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
