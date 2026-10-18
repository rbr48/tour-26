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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Accept-Encoding, X-File-Name',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

// Files that must always be revalidated so deploys reach users immediately.
const REVALIDATE_FILES = new Set(['index.html', 'sw.js', 'manifest.json']);

function cacheControlFor(relativePath) {
  if (relativePath.endsWith('.apk') || relativePath.endsWith('version.json')) return 'no-cache, no-store, must-revalidate';
  if (REVALIDATE_FILES.has(relativePath)) return 'no-cache';
  if (relativePath.startsWith('assets/')) return 'public, max-age=31536000, immutable';
  return 'public, max-age=86400';
}

function sendNotFound(res, method) {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...CORS_HEADERS,
    ...SECURITY_HEADERS,
  });
  res.end(method === 'HEAD' ? undefined : 'Not Found');
}

/**
 * Serves the built web app. Real files are served directly. Unknown paths with a
 * file extension get a 404, so a missing download such as an APK can never come
 * back as index.html. Other unknown paths fall back to index.html for the SPA.
 */
export function createStaticHandler(distDir, uploadsDir, reelsRegistry) {
  const root = path.resolve(distDir);
  const uploadsRoot = uploadsDir ? path.resolve(uploadsDir) : null;
  const indexFile = path.join(root, 'index.html');

  function resolveRequestPath(pathname) {
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    if (decoded.includes('\0')) return null;

    // First check persistent uploads directory if requested
    if (uploadsRoot && (decoded.startsWith('/uploads/') || decoded.startsWith('uploads/'))) {
      const relName = decoded.replace(/^\/?uploads\//, '');
      const candidateUpload = path.resolve(uploadsRoot, relName);
      if (candidateUpload.startsWith(uploadsRoot + path.sep) && isRegularFile(candidateUpload)) {
        return candidateUpload;
      }
      return null;
    }

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
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...CORS_HEADERS, ...SECURITY_HEADERS });
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD, OPTIONS', ...CORS_HEADERS, ...SECURITY_HEADERS });
      res.end();
      return;
    }

    const candidate = resolveRequestPath(pathname);
    if (!candidate) {
      if (reelsRegistry && (pathname.startsWith('/uploads/') || pathname.startsWith('uploads/'))) {
        const relName = pathname.replace(/^\/?uploads\//, '').split('?')[0];
        const driveUrl = reelsRegistry.getArchivedDriveUrl(relName);
        if (driveUrl) {
          res.writeHead(302, {
            Location: driveUrl,
            'Cache-Control': 'public, max-age=86400',
            ...CORS_HEADERS,
            ...SECURITY_HEADERS,
          });
          res.end();
          return;
        }
      }
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
    const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    // Support HTTP Range Requests (essential for HTML5 video playback and seeking)
    const rangeHeader = req.headers.range;
    if (rangeHeader && req.method === 'GET') {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (!isNaN(start) && start <= stat.size - 1) {
        const actualEnd = Math.min(end, stat.size - 1);
        const chunkSize = (actualEnd - start) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${actualEnd}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          ...CORS_HEADERS,
          ...SECURITY_HEADERS,
        });

        const stream = fs.createReadStream(filePath, { start, end: actualEnd });
        stream.on('error', () => res.destroy());
        stream.pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControlFor(relativePath),
      ...CORS_HEADERS,
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
