import fs from 'node:fs';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

// Files that must always be revalidated so deploys reach users immediately.
const REVALIDATE_FILES = new Set(['index.html', 'sw.js', 'manifest.json']);

function cacheControlFor(relativePath) {
  if (REVALIDATE_FILES.has(relativePath)) return 'no-cache';
  if (relativePath.startsWith('assets/')) return 'public, max-age=31536000, immutable';
  return 'public, max-age=86400';
}

function sendNotFound(res, method) {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...SECURITY_HEADERS,
  });
  res.end(method === 'HEAD' ? undefined : 'Not Found');
}

/**
 * Serves the built web app. Real files are served directly. Unknown paths with a
 * file extension get a 404, so a missing download such as an APK can never come
 * back as index.html. Other unknown paths fall back to index.html for the SPA.
 */
export function createStaticHandler(distDir) {
  const root = path.resolve(distDir);
  const indexFile = path.join(root, 'index.html');

  function resolveRequestPath(pathname) {
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    if (decoded.includes('\0')) return null;
    const candidate = path.resolve(root, `.${path.posix.normalize(`/${decoded}`)}`);
    if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
    return candidate;
  }

  function isRegularFile(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  return function serveStatic(req, res, pathname) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY_HEADERS });
      res.end();
      return;
    }

    const candidate = resolveRequestPath(pathname);
    if (!candidate) {
      sendNotFound(res, req.method);
      return;
    }

    let filePath = candidate;
    if (!isRegularFile(filePath)) {
      if (path.extname(pathname)) {
        sendNotFound(res, req.method);
        return;
      }
      filePath = indexFile;
    }
    if (!isRegularFile(filePath)) {
      sendNotFound(res, req.method);
      return;
    }

    const relativePath = path.relative(root, filePath).split(path.sep).join('/');
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cacheControlFor(relativePath),
      ...SECURITY_HEADERS,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  };
}
