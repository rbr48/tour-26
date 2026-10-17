/**
 * Client-side IndexedDB cache for video files.
 * Keeps uploaded video blobs persistent across page reloads on this device
 * so Reels can be played instantly even offline or before upload finishes.
 */

const DB_NAME = 'Tour2026MediaCache';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
 * Creates an active, playable object URL from cached video if available.
 */
export async function getLocalVideoUrl(id) {
  const blob = await getLocalVideo(id);
  if (!blob) return null;
  try {
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Removes cached video
 */
export async function deleteLocalVideo(id) {
  if (!id) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(String(id));
  } catch (err) {
    console.warn('Failed to delete video from IndexedDB:', err);
  }
}
