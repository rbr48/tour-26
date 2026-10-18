import fs from 'node:fs';
import path from 'node:path';

const REGISTRY_FILE = 'reels-registry.json';
export const DEFAULT_ARCHIVE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createReelsRegistry(dataDir) {
  const filePath = path.join(dataDir, REGISTRY_FILE);

  function readRegistry() {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Failed to read reels-registry.json, using empty list:', err?.message);
      return [];
    }
  }

  function writeRegistry(reels) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(reels, null, 2), 'utf8');
      fs.renameSync(tmp, filePath);
    } catch (err) {
      console.error('Failed to write reels-registry.json:', err?.message);
    }
  }

  return {
    filePath,

    getAll() {
      return readRegistry();
    },

    getById(id) {
      const list = readRegistry();
      return list.find((item) => item.id === id || item.fileName === id) || null;
    },

    addReel({ id, fileName, postId, originalSize = 0, compressedSize = 0, uploadedAt = Date.now() }) {
      const list = readRegistry();
      const existingIdx = list.findIndex((item) => item.fileName === fileName || (postId && item.postId === postId));
      
      const newEntry = {
        id: id || fileName,
        fileName,
        postId: postId || null,
        originalSize,
        compressedSize: compressedSize || originalSize,
        uploadedAt,
        status: 'vps_hot', // 'vps_hot' | 'gdrive_archived' | 'failed'
        driveFileId: null,
        driveViewUrl: null,
        driveStreamUrl: null,
        archivedAt: null,
      };

      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...newEntry };
      } else {
        list.push(newEntry);
      }

      writeRegistry(list);
      return newEntry;
    },

    updateReel(id, updates) {
      const list = readRegistry();
      const idx = list.findIndex((item) => item.id === id || item.fileName === id);
      if (idx === -1) return null;

      list[idx] = { ...list[idx], ...updates };
      writeRegistry(list);
      return list[idx];
    },

    getArchivedDriveUrl(fileName) {
      const list = readRegistry();
      const item = list.find((r) => r.fileName === fileName);
      if (item && item.status === 'gdrive_archived' && item.driveStreamUrl) {
        return item.driveStreamUrl;
      }
      return null;
    },

    getExpiredReels(maxAgeMs = DEFAULT_ARCHIVE_AGE_MS) {
      const now = Date.now();
      const list = readRegistry();
      return list.filter((r) => {
        if (r.status !== 'vps_hot') return false;
        const age = now - (r.uploadedAt || 0);
        return age >= maxAgeMs;
      });
    },
  };
}
