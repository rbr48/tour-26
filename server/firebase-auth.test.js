import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { AuthError, createFirebaseTokenVerifier } from './firebase-auth.js';

const PROJECT_ID = 'tour-26';
const NOW_MS = 1_800_000_000_000;
const KID = 'test-key-1';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

const encodeSegment = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function signToken(key, claims, { header = {}, kid = KID } = {}) {
  const encodedHeader = encodeSegment({ alg: 'RS256', kid, typ: 'JWT', ...header });
  const encodedPayload = encodeSegment(claims);
  const signature = crypto
    .sign('sha256', Buffer.from(`${encodedHeader}.${encodedPayload}`), key)
    .toString('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function claimsWith(overrides = {}) {
  const nowSeconds = NOW_MS / 1000;
  return {
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: 'firebase-uid-123',
    iat: nowSeconds - 10,
    exp: nowSeconds + 3000,
    auth_time: nowSeconds - 20,
    email: 'family@example.com',
    email_verified: true,
    ...overrides,
  };
}

function makeVerifier({ certificates = { [KID]: publicPem }, allowedEmails = ['family@example.com'] } = {}) {
  const fetchJson = vi.fn(async () => ({ body: certificates, maxAgeSeconds: 3600 }));
  const verify = createFirebaseTokenVerifier({
    projectId: PROJECT_ID,
    allowedEmails,
    fetchJson,
    now: () => NOW_MS,
  });
  return { verify, fetchJson };
}

async function expectAuthError(promise, status, pattern) {
  const error = await promise.then(
    () => {
      throw new Error('expected verification to fail');
    },
    (err) => err,
  );
  expect(error).toBeInstanceOf(AuthError);
  expect(error.status).toBe(status);
  if (pattern) expect(error.message).toMatch(pattern);
}

describe('createFirebaseTokenVerifier', () => {
  it('accepts a correctly signed token and returns the uid and lowercased email', async () => {
    const { verify } = makeVerifier();
    const user = await verify(signToken(privateKey, claimsWith({ email: 'Family@Example.com' })));
    expect(user).toEqual({ uid: 'firebase-uid-123', email: 'family@example.com' });
  });

  it('rejects a token signed with a different key', async () => {
    const { verify } = makeVerifier();
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    await expectAuthError(verify(signToken(other, claimsWith())), 401, /signature/);
  });

  it('rejects tokens that do not use RS256', async () => {
    const { verify } = makeVerifier();
    const token = signToken(privateKey, claimsWith(), { header: { alg: 'HS256' } });
    await expectAuthError(verify(token), 401, /header/);
  });

  it('rejects a token with the alg=none trick', async () => {
    const { verify } = makeVerifier();
    const header = encodeSegment({ alg: 'none', kid: KID });
    const payload = encodeSegment(claimsWith());
    await expectAuthError(verify(`${header}.${payload}.`), 401);
  });

  it('rejects expired tokens', async () => {
    const { verify } = makeVerifier();
    const token = signToken(privateKey, claimsWith({ exp: NOW_MS / 1000 - 1 }));
    await expectAuthError(verify(token), 401, /expired/);
  });

  it('rejects tokens issued in the future beyond the clock skew', async () => {
    const { verify } = makeVerifier();
    const token = signToken(privateKey, claimsWith({ iat: NOW_MS / 1000 + 3600 }));
    await expectAuthError(verify(token), 401, /future/);
  });

  it('rejects tokens for another Firebase project', async () => {
    const { verify } = makeVerifier();
    await expectAuthError(verify(signToken(privateKey, claimsWith({ aud: 'other-project' }))), 401, /audience/);
    await expectAuthError(
      verify(signToken(privateKey, claimsWith({ iss: 'https://securetoken.google.com/other-project' }))),
      401,
      /issuer/,
    );
  });

  it('accepts any valid Google account when allowedEmails is [*]', async () => {
    const { verify } = makeVerifier({ allowedEmails: ['*'] });
    const result = await verify(signToken(privateKey, claimsWith({ email: 'any-user@example.com' })));
    expect(result.email).toBe('any-user@example.com');
  });

  it('rejects accounts not in allowedEmails when allowlist is configured', async () => {
    const { verify } = makeVerifier({ allowedEmails: ['family@example.com'] });
    await expectAuthError(verify(signToken(privateKey, claimsWith({ email: 'stranger@example.com' }))), 403, /allowlist/);
  });

  it('accepts accounts regardless of email_verified flag when signed by Google', async () => {
    const { verify } = makeVerifier();
    const user = await verify(signToken(privateKey, claimsWith({ email_verified: false })));
    expect(user.email).toBe('family@example.com');
  });

  it('rejects missing or malformed tokens', async () => {
    const { verify } = makeVerifier();
    await expectAuthError(verify(undefined), 401, /missing/);
    await expectAuthError(verify('not-a-jwt'), 401, /malformed/);
    await expectAuthError(verify('a.b.c'), 401, /malformed/);
  });

  it('rejects tokens whose key id is unknown even after refreshing the certificates', async () => {
    const { verify, fetchJson } = makeVerifier();
    await expectAuthError(verify(signToken(privateKey, claimsWith(), { kid: 'unknown-key' })), 401, /signing key/);
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('caches certificates between verifications', async () => {
    const { verify, fetchJson } = makeVerifier();
    await verify(signToken(privateKey, claimsWith()));
    await verify(signToken(privateKey, claimsWith({ sub: 'another-uid' })));
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it('refreshes certificates once when Google rotates its keys', async () => {
    const rotatedKid = 'rotated-key';
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ body: { [KID]: publicPem }, maxAgeSeconds: 3600 })
      .mockResolvedValueOnce({ body: { [rotatedKid]: publicPem }, maxAgeSeconds: 3600 });
    const verify = createFirebaseTokenVerifier({
      projectId: PROJECT_ID,
      allowedEmails: ['family@example.com'],
      fetchJson,
      now: () => NOW_MS,
    });
    const user = await verify(signToken(privateKey, claimsWith(), { kid: rotatedKid }));
    expect(user.email).toBe('family@example.com');
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  const hasOpenssl = spawnSync('openssl', ['version']).status === 0;
  it.skipIf(!hasOpenssl)('verifies tokens against a real X.509 certificate', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tour-cert-'));
    try {
      const keyPath = path.join(dir, 'key.pem');
      const certPath = path.join(dir, 'cert.pem');
      const result = spawnSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', keyPath, '-out', certPath, '-subj', '/CN=securetoken-test', '-days', '1',
      ]);
      expect(result.status).toBe(0);
      const certPem = fs.readFileSync(certPath, 'utf8');
      const certKey = fs.readFileSync(keyPath, 'utf8');
      const { verify } = makeVerifier({ certificates: { [KID]: certPem } });
      const user = await verify(signToken(crypto.createPrivateKey(certKey), claimsWith()));
      expect(user.uid).toBe('firebase-uid-123');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
