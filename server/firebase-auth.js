import crypto from 'node:crypto';

// Public X.509 certificates that Google uses to sign Firebase Auth ID tokens.
export const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const CLOCK_SKEW_SECONDS = 300;
const DEFAULT_CERT_TTL_SECONDS = 3600;

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

async function defaultFetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`certificate request failed with status ${response.status}`);
  }
  const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') || '');
  return {
    body: await response.json(),
    maxAgeSeconds: maxAge ? Number(maxAge[1]) : DEFAULT_CERT_TTL_SECONDS,
  };
}

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

/**
 * Verifies a Firebase Auth ID token without any SDK: checks the RS256 signature
 * against Google's certificates, validates the standard claims for this project,
 * and requires a verified email that is on the family allowlist.
 */
export function createFirebaseTokenVerifier({
  projectId,
  allowedEmails,
  fetchJson = defaultFetchJson,
  now = Date.now,
}) {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  let cache = null;

  async function loadCertificates(force = false) {
    if (!force && cache && now() < cache.expiresAt) {
      return cache.certificates;
    }
    const { body, maxAgeSeconds } = await fetchJson(FIREBASE_CERTS_URL);
    cache = {
      certificates: body,
      expiresAt: now() + (maxAgeSeconds || DEFAULT_CERT_TTL_SECONDS) * 1000,
    };
    return body;
  }

  async function certificateFor(kid) {
    let certificates = await loadCertificates();
    if (!certificates[kid]) {
      // Keys rotate; refresh once before rejecting an unknown key id.
      certificates = await loadCertificates(true);
    }
    return certificates[kid];
  }

  return async function verifyIdToken(token) {
    if (typeof token !== 'string' || token.length === 0) {
      throw new AuthError('missing bearer token');
    }
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new AuthError('malformed token');
    }
    const [encodedHeader, encodedPayload, encodedSignature] = segments;

    let header;
    let payload;
    try {
      header = decodeSegment(encodedHeader);
      payload = decodeSegment(encodedPayload);
    } catch {
      throw new AuthError('malformed token');
    }
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
      throw new AuthError('unsupported token header');
    }

    const certificate = await certificateFor(header.kid);
    if (!certificate) {
      throw new AuthError('unknown signing key');
    }

    let publicKey;
    try {
      publicKey = crypto.createPublicKey(certificate);
    } catch {
      throw new AuthError('invalid signing key');
    }
    const signedContent = Buffer.from(`${encodedHeader}.${encodedPayload}`);
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (!crypto.verify('sha256', signedContent, publicKey, signature)) {
      throw new AuthError('invalid token signature');
    }

    const nowSeconds = Math.floor(now() / 1000);
    if (payload.aud !== projectId) {
      throw new AuthError('wrong token audience');
    }
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      throw new AuthError('wrong token issuer');
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
      throw new AuthError('invalid token subject');
    }
    if (!(Number(payload.exp) > nowSeconds)) {
      throw new AuthError('token expired');
    }
    if (!(Number(payload.iat) <= nowSeconds + CLOCK_SKEW_SECONDS)) {
      throw new AuthError('token issued in the future');
    }
    if (payload.auth_time !== undefined && !(Number(payload.auth_time) <= nowSeconds + CLOCK_SKEW_SECONDS)) {
      throw new AuthError('invalid auth_time');
    }
    if (payload.email_verified !== true) {
      throw new AuthError('email is not verified', 403);
    }

    const email = String(payload.email || '').toLowerCase();
    if (!email || !allowedEmails.includes(email)) {
      throw new AuthError('account is not on the family list', 403);
    }

    return { uid: payload.sub, email };
  };
}
