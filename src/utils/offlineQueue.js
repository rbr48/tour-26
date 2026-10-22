import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Offline Post & Reel Queue Manager for Rangpur ➔ Cox's Bazar Tour 2026.
 *
 * Highway travel between Rangpur, Bogura, Sirajganj, Cumilla, and Chattogram
 * frequently suffers from network dead zones. This utility saves created posts
 * locally in localStorage (with memory and IndexedDB fallback) and automatically
 * retries/drains the queue as soon as internet connectivity is restored.
 */

const QUEUE_STORAGE_KEY = 'tour_offline_post_queue';
const memoryStore = new Map();

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memoryStore.get(key) || null;
  } catch {
    return memoryStore.get(key) || null;
  }
}

function setStorageItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    // QuotaExceeded or security error in private mode
    console.warn('LocalStorage write warning, falling back to memoryStore:', err);
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
  memoryStore.delete(key);
}

/**
 * Returns all currently queued pending posts.
 */
export function getOfflineQueue() {
  try {
    const raw = getStorageItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to parse offline post queue:', err);
    return [];
  }
}

/**
 * Enqueues a new post into the offline queue.
 * Returns the updated queue.
 */
export function enqueueOfflinePost(postData) {
  try {
    const queue = getOfflineQueue();
    const queuedItem = {
      ...postData,
      tempId: postData.tempId || `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      queuedAt: Date.now(),
      offlineQueued: true,
    };
    queue.push(queuedItem);
    setStorageItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange(queue.length);
    return queue;
  } catch (err) {
    console.error('Failed to enqueue offline post:', err);
    return getOfflineQueue();
  }
}

/**
 * Removes a post from the offline queue by tempId or id.
 */
export function removeOfflinePost(identifier) {
  try {
    const queue = getOfflineQueue().filter(
      (item) => item.tempId !== identifier && item.id !== identifier,
    );
    setStorageItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange(queue.length);
    return queue;
  } catch (err) {
    console.error('Failed to remove from offline queue:', err);
    return getOfflineQueue();
  }
}

/**
 * Clears the entire offline queue.
 */
export function clearOfflineQueue() {
  try {
    removeStorageItem(QUEUE_STORAGE_KEY);
    notifyQueueChange(0);
  } catch (err) {
    console.error('Failed to clear offline queue:', err);
  }
}

/**
 * Dispatches a custom window event when queue changes so UI components update reactively.
 */
function notifyQueueChange(count) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tour:offline-queue-changed', { detail: { count } }));
  }
}

/**
 * Attempts to process and upload all queued posts sequentially.
 * @param {Function} uploadFn Async function that takes a post and uploads it to Firestore / Drive.
 * @returns {Promise<{ uploaded: number, failed: number, remaining: number }>}
 */
export async function drainOfflineQueue(uploadFn) {
  const queue = getOfflineQueue();
  if (queue.length === 0 || typeof uploadFn !== 'function') {
    return { uploaded: 0, failed: 0, remaining: 0 };
  }

  let uploadedCount = 0;
  let failedCount = 0;

  for (const item of [...queue]) {
    try {
      // Remove offlineQueued marker before submitting to real backend
      const { tempId, queuedAt, offlineQueued, ...postToUpload } = item;
      await uploadFn(postToUpload);
      removeOfflinePost(tempId || item.id);
      uploadedCount++;
    } catch (err) {
      console.warn(`Failed to drain queued post ${item.tempId || item.id}:`, err);
      failedCount++;
      // Stop draining if we hit a hard network error to prevent flooding
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }
    }
  }

  const remaining = getOfflineQueue().length;

  if (uploadedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tour:offline-sync-complete', {
        detail: { count: uploadedCount },
      })
    );
  }

  return { uploaded: uploadedCount, failed: failedCount, remaining };
}

/**
 * Automatically sets up listeners for internet connectivity restoration
 * to drain the offline queue with smart debouncing.
 *
 * @param {Function} uploadFn Async function to upload queued post
 * @returns {Function} cleanup function to remove listeners
 */
export function registerAutoDrain(uploadFn) {
  if (typeof window === 'undefined') return () => {};

  let debounceTimer = null;
  let isDraining = false;

  const triggerDrain = () => {
    if (isDraining) return;
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return;

      isDraining = true;
      try {
        await drainOfflineQueue(uploadFn);
      } catch (err) {
        console.warn('Auto drain error:', err);
      } finally {
        isDraining = false;
      }
    }, 2500); // 2.5 second debounce for mobile network stabilization
  };

  window.addEventListener('online', triggerDrain);

  let networkListener = null;
  if (Capacitor.isNativePlatform()) {
    try {
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          triggerDrain();
        }
      }).then((handle) => {
        networkListener = handle;
      });
    } catch (e) {
      console.warn('Capacitor Network listener setup skipped:', e);
    }
  }

  return () => {
    window.removeEventListener('online', triggerDrain);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (networkListener && typeof networkListener.remove === 'function') {
      networkListener.remove();
    }
  };
}
