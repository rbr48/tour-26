import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tour_data.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// MIME types map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // Common CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // API endpoints: /api, /api.php, /tour_data.json
  if (pathname === '/api' || pathname === '/api.php' || pathname === '/tour_data.json') {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (fs.existsSync(DATA_FILE)) {
        try {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          res.writeHead(200);
          return res.end(raw);
        } catch (err) {
          res.writeHead(500);
          return res.end(JSON.stringify({ error: 'Failed to read data file' }));
        }
      } else {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'empty' }));
      }
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) {
          req.destroy(); // 5MB limit
        }
      });

      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.tourInfo) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            return res.end(JSON.stringify({ status: 'saved', updated_at: new Date().toISOString() }));
          } else {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Invalid JSON payload. Missing tourInfo.' }));
          }
        } catch (err) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        }
      });
      return;
    }
  }

  // Health check
  if (pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
  }

  // Static File Serving
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, safePath);

  // If path doesn't exist or is directory, check if index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Cache static assets, but don't cache index.html
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    const stream = fs.createReadStream(filePath);
    res.writeHead(200);
    return stream.pipe(res);
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tour 2026 App running on http://0.0.0.0:${PORT}`);
  console.log(`Data stored at ${DATA_FILE}`);
});
