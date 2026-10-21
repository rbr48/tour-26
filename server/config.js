import path from 'node:path';

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://tour2026.izhaanintellect.fun',
  'https://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'capacitor://localhost',
];

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const splitList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function loadConfig(env, rootDir) {
  return {
    port: Number(env.PORT) || 3000,
    host: env.HOST || '0.0.0.0',
    dataDir: env.DATA_DIR || path.join(rootDir, 'data'),
    distDir: path.join(rootDir, 'dist'),
    firebaseProjectId: env.FIREBASE_PROJECT_ID || 'tour-26',
    allowedEmails: splitList(env.ALLOWED_EMAILS).length > 0
      ? splitList(env.ALLOWED_EMAILS).map((email) => email.toLowerCase())
      : ['*'],
    allowedOrigins: splitList(env.ALLOWED_ORIGINS).length
      ? splitList(env.ALLOWED_ORIGINS)
      : DEFAULT_ALLOWED_ORIGINS,
    maxBackupBytes: MAX_BACKUP_BYTES,
  };
}
