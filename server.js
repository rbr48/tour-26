import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './server/app.js';
import { loadConfig } from './server/config.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig(process.env, rootDir);
const server = createApp({ config });

server.listen(config.port, config.host, () => {
  console.log(`Tour 2026 server listening on ${config.host}:${config.port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
