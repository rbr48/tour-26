import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { createFirebaseTokenVerifier } from './firebase-auth.js';

const PROJECT_ID = 'tour-26';
const NOW_MS = 1_800_000_000_000;
const KID = 'app-test-key';
const ORIGIN = 'https://tour2026.izhaanintellect.fun';
const FAMILY_EMAIL = 'family@example.com';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function tokenFor(email, overrides = {}) {
  const nowSeconds = NOW_MS / 1000;
  const header = encode({ alg: 'RS256', kid: KID, typ: 'JWT' });
  const payload = encode({
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: `uid-${email}`,
    iat: nowSeconds - 5,
    exp: nowSeconds + 3000,
    email,
    email_verified: true,
    ...overrides,
  });
  const signature = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

let rootDir;
let distDir;
const servers = [];

beforeAll(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tour-app-'));
  distDir = path.join(rootDir, 'dist');
  fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>app</title>');
  fs.writeFileSync(path.join(distDir, 'sw.js'), 'self.CACHE = "build-1";');
  fs.writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log("app");');
});

afterAll(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
});

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(() => resolve()))),
  );
});

function startApp({ allowedEmails = [FAMILY_EMAIL], maxBackupBytes = 4096 } = {}) {
  const dataDir = fs.mkdtempSync(path.join(rootDir, 'data-'));
  const config = {
    port: 0,
    host: '127.0.0.1',
    dataDir,
    distDir,
    firebaseProjectId: PROJECT_ID,
    allowedEmails,
    allowedOrigins: [ORIGIN],
    maxBackupBytes,
  };
  const verifyToken = createFirebaseTokenVerifier({
    projectId: PROJECT_ID,
    allowedEmails,
    fetchJson: vi.fn(async () => ({ body: { [KID]: publicPem }, maxAgeSeconds: 3600 })),
    now: () => NOW_MS,
  });
  const server = createApp({ config, verifyToken });
  servers.push(server);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

const validBackup = {
  tourInfo: { title: 'ট্যুর' },
  members: [{ id: 1, name: 'সদস্য', deposit: 1000 }],
  expenses: [],
};

describe('backup API', () => {
  it('answers health checks without any data', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('rejects requests without a bearer token', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/api`);
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('accepts any valid Google account', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/api`, {
      headers: { Authorization: `Bearer ${tokenFor('stranger@example.com')}` },
    });
    expect(response.status).toBe(200);
  });

  it('returns an empty status before any backup exists', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/api`, {
      headers: { Authorization: `Bearer ${tokenFor(FAMILY_EMAIL)}` },
    });
    expect(await response.json()).toEqual({ status: 'empty' });
  });

  it('stores a backup for a family member and returns it on read', async () => {
    const base = await startApp();
    const auth = { Authorization: `Bearer ${tokenFor(FAMILY_EMAIL)}` };

    const saved = await fetch(`${base}/api`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(validBackup),
    });
    expect(saved.status).toBe(200);
    expect((await saved.json()).status).toBe('saved');

    const read = await fetch(`${base}/api`, { headers: auth });
    const stored = await read.json();
    expect(stored.tourInfo).toEqual(validBackup.tourInfo);
    expect(stored.backupMeta.updatedBy).toBe(FAMILY_EMAIL);
  });

  it('accepts POST as well as PUT', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/api`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFor(FAMILY_EMAIL)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(validBackup),
    });
    expect(response.status).toBe(200);
  });

  it('rejects bodies that are not JSON or lack tourInfo', async () => {
    const base = await startApp();
    const auth = { Authorization: `Bearer ${tokenFor(FAMILY_EMAIL)}`, 'Content-Type': 'application/json' };

    const notJson = await fetch(`${base}/api`, { method: 'PUT', headers: auth, body: 'not json' });
    expect(notJson.status).toBe(400);

    const missingInfo = await fetch(`${base}/api`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ members: [] }),
    });
    expect(missingInfo.status).toBe(400);
    expect((await missingInfo.json()).error).toMatch(/tourInfo/);

    const wrongShape = await fetch(`${base}/api`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ tourInfo: {}, expenses: {} }),
    });
    expect(wrongShape.status).toBe(400);
  });

  it('answers oversized backups with 413 instead of dropping the connection', async () => {
    const base = await startApp({ maxBackupBytes: 512 });
    const big = { tourInfo: { title: 'x'.repeat(2000) } };
    const response = await fetch(`${base}/api`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenFor(FAMILY_EMAIL)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(big),
    });
    expect(response.status).toBe(413);
  });

  it('answers CORS preflight only for allowlisted origins', async () => {
    const base = await startApp();
    const allowed = await fetch(`${base}/api`, {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'PUT' },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(allowed.headers.get('access-control-allow-headers')).toMatch(/Authorization/);

    const denied = await fetch(`${base}/api`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'PUT' },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });


  it('no longer serves the old unauthenticated endpoints', async () => {
    const base = await startApp();
    for (const route of ['/api.php', '/tour_data.json']) {
      const response = await fetch(`${base}${route}`);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('tourInfo');
    }
  });
});

describe('static web app', () => {
  it('serves the app shell without caching it', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/html/);
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('revalidates the service worker so deploys reach users', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/sw.js`);
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });

  it('caches hashed assets for a long time', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/assets/app-abc123.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toMatch(/immutable/);
  });

  it('falls back to index.html for client-side routes', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/some/route`);
    expect(await response.text()).toContain('<title>app</title>');
  });

  it('never returns index.html in place of a missing file with an extension', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/Tour2026-v2.apk`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('<title>app</title>');
  });

  it('does not expose files outside the dist directory', async () => {
    const base = await startApp();
    for (const route of ['/..%2F..%2Fpackage.json', '/%2e%2e/%2e%2e/server.js', '/..%00/etc/passwd']) {
      const response = await fetch(`${base}${route}`);
      const body = await response.text();
      expect(body).not.toContain('"name"');
      expect(body).not.toContain('createApp');
    }
  });

  it('answers HEAD requests without a body', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/`, { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});

describe('push API', () => {
  it('serves the VAPID public key publicly', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/api/push/vapid-public-key`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(typeof body.publicKey).toBe('string');
    expect(body.publicKey.length).toBeGreaterThan(30);
  });

  it('requires authentication to subscribe and send notifications', async () => {
    const base = await startApp();
    const unauthSub = await fetch(`${base}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: { endpoint: 'https://foo' } }),
    });
    expect(unauthSub.status).toBe(401);

    const unauthSend = await fetch(`${base}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', body: 'Test' }),
    });
    expect(unauthSend.status).toBe(401);
  });

  it('subscribes and dispatches push notifications', async () => {
    const base = await startApp();
    const token = tokenFor(FAMILY_EMAIL);

    const subRes = await fetch(`${base}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test_client',
          keys: { p256dh: 'p256', auth: 'auth' },
        },
        deviceName: 'Chrome on Android',
      }),
    });
    expect(subRes.status).toBe(200);
    expect((await subRes.json()).status).toBe('subscribed');

    // Send push broadcast
    const sendRes = await fetch(`${base}/api/push/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '📢 নতুন নোটিশ',
        body: 'জরুরি বার্তা',
        excludeSender: false,
      }),
    });
    expect(sendRes.status).toBe(200);
    const sendData = await sendRes.json();
    expect(sendData.status).toBe('sent');
  });
});

describe('upload and reels endpoints security', () => {
  it('rejects unauthenticated requests to /api/upload', async () => {
    const base = await startApp();
    const res = await fetch(`${base}/api/upload`, {
      method: 'POST',
      body: 'fake video content',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated requests to /api/reels/registry', async () => {
    const base = await startApp();
    const res = await fetch(`${base}/api/reels/registry`);
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated requests to /api/reels/archive-check', async () => {
    const base = await startApp();
    const res = await fetch(`${base}/api/reels/archive-check`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('serves version 5 metadata at /api/app-version', async () => {
    const base = await startApp();
    const res = await fetch(`${base}/api/app-version`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.versionCode).toBe(5);
    expect(data.versionName).toBe('2.3');
  });
});

