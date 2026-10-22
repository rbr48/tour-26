/**
 * Resumable Media Upload Checkpoint Storage for Tour 2026.
 *
 * Persists chunked upload progress in IndexedDB (with localStorage & memory fallback)
 * so that long video reels and high-resolution photo uploads can survive
 * mobile network dropouts, tunnel disconnects, and app restarts.
 */

const DB_NAME = 'Tour2026MediaCache';
const STORE_NAME = 'upload_checkpoints';
const DB_VERSION = 2; // Incremented to add checkpoints store alongside videos

const LS_PREFIX = 'tour_upload_ckpt_';
const memoryStore = new Map();

function openCheckpointDB() {
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'uploadId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveToLocalStorage(checkpoint) {
  const key = `${LS_PREFIX}${checkpoint.uploadId}`;
  memoryStore.set(key, JSON.stringify(checkpoint));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(checkpoint));
    }
  } catch (e) {
    // Memory fallback preserved
  }
}

function getFromLocalStorage(uploadId) {
  const key = `${LS_PREFIX}${uploadId}`;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  const mem = memoryStore.get(key);
  return mem ? JSON.parse(mem) : null;
}

function removeFromLocalStorage(uploadId) {
  const key = `${LS_PREFIX}${uploadId}`;
  memoryStore.delete(key);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
}

/**
 * Saves or updates an upload checkpoint.
 *
 * @param {Object} checkpoint
 * @param {string} checkpoint.uploadId - Unique upload session ID
 * @param {string} [checkpoint.postId] - Associated post ID
 * @param {string} checkpoint.fileName - Name of media file
 * @param {number} checkpoint.totalChunks - Total chunks
 * @param {number[]} [checkpoint.uploadedChunks] - Indices of already-uploaded chunks
 * @param {number} [checkpoint.fileSize] - Original size in bytes
 * @param {number} [checkpoint.chunkSize] - Chunk size in bytes
 */
export async function saveCheckpoint(checkpoint) {
  if (!checkpoint?.uploadId) return;

  const record = {
    ...checkpoint,
    uploadedChunks: Array.from(new Set(checkpoint.uploadedChunks || [])).sort((a, b) => a - b),
    updatedAt: Date.now(),
    createdAt: checkpoint.createdAt || Date.now(),
  };

  // Always mirror in localStorage / memoryStore for immediate sync access
  saveToLocalStorage(record);

  try {
    const db = await openCheckpointDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // LocalStorage / memoryStore fallback already set
  }
}

/**
 * Retrieves a checkpoint by uploadId.
 */
export async function getCheckpoint(uploadId) {
  if (!uploadId) return null;

  try {
    const db = await openCheckpointDB();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(uploadId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch {}

  return getFromLocalStorage(uploadId);
}

/**
 * Marks a chunk as uploaded in the checkpoint.
 */
export async function markChunkUploaded(uploadId, chunkIndex) {
  const existing = (await getCheckpoint(uploadId)) || { uploadId, uploadedChunks: [] };
  const set = new Set(existing.uploadedChunks || []);
  set.add(chunkIndex);
  existing.uploadedChunks = Array.from(set).sort((a, b) => a - b);
  await saveCheckpoint(existing);
  return existing;
}

/**
 * Deletes a checkpoint when upload finishes or is cancelled.
 */
export async function removeCheckpoint(uploadId) {
  if (!uploadId) return;
  removeFromLocalStorage(uploadId);

  try {
    const db = await openCheckpointDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(uploadId);
  } catch {}
}

/**
 * Lists all active upload checkpoints.
 */
export async function listPendingCheckpoints() {
  const list = [];

  try {
    const db = await openCheckpointDB();
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (Array.isArray(all) && all.length > 0) return all;
  } catch {}

  // Fallback to reading localStorage / memoryStore
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LS_PREFIX)) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              list.push(JSON.parse(val));
            } catch {}
          }
        }
      }
    }
  } catch {}

  if (list.length === 0) {
    for (const [key, val] of memoryStore.entries()) {
      if (key.startsWith(LS_PREFIX)) {
        try {
          list.push(JSON.parse(val));
        } catch {}
      }
    }
  }

  return list;
}
