/**
 * Client-side IndexedDB cache for video files.
 * Keeps uploaded video blobs persistent across page reloads on this device
 * so Reels can be played instantly even offline or before upload finishes.
 */

const DB_NAME = 'Tour2026MediaCache';
const STORE_NAME = 'videos';
const DB_VERSION = 2; // Synchronized with mediaUploadCheckpoint.js

const activeObjectUrls = new Map();

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('upload_checkpoints')) {
        db.createObjectStore('upload_checkpoints', { keyPath: 'uploadId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a video File/Blob in IndexedDB
 */
export async function saveLocalVideo(id, blob) {
  if (!id || !blob) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id: String(id), blob, updatedAt: Date.now() });

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save video to IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves a video Blob from IndexedDB
 */
export async function getLocalVideo(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(id));

      req.onsuccess = () => {
        const item = req.result;
        resolve(item?.blob || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get video from IndexedDB:', err);
    return null;
  }
}

/**
 * Creates or returns an active, playable object URL from cached video.
 * URLs are tracked in memory so they can be revoked cleanly without leaking RAM.
 */
export async function getLocalVideoUrl(id) {
  if (!id) return null;
  const key = String(id);
  if (activeObjectUrls.has(key)) {
    return activeObjectUrls.get(key);
  }
  const blob = await getLocalVideo(key);
  if (!blob) return null;
  try {
    const url = URL.createObjectURL(blob);
    activeObjectUrls.set(key, url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Revokes a previously created object URL to free native memory.
 */
export function revokeLocalVideoUrl(id) {
  if (!id) return;
  const key = String(id);
  if (activeObjectUrls.has(key)) {
    try {
      URL.revokeObjectURL(activeObjectUrls.get(key));
    } catch {}
    activeObjectUrls.delete(key);
  }
}

/**
 * Revokes all managed object URLs.
 */
export function clearAllLocalVideoUrls() {
  for (const [, url] of activeObjectUrls.entries()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  activeObjectUrls.clear();
}

/**
 * Removes cached video and revokes its object URL
 */
export async function deleteLocalVideo(id) {
  if (!id) return;
  revokeLocalVideoUrl(id);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(String(id));
  } catch (err) {
    console.warn('Failed to delete video from IndexedDB:', err);
  }
}

/**
 * Prunes video cache older than maxAgeDays to prevent uncontrolled disk usage.
 */
export async function pruneOldLocalVideos(maxAgeDays = 14) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      const cutoff = Date.now() - maxAgeDays * 86400000;
      for (const item of items) {
        if (item.updatedAt && item.updatedAt < cutoff) {
          store.delete(item.id);
          revokeLocalVideoUrl(item.id);
        }
      }
    };
  } catch {}
}
