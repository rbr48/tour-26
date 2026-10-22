import { uploadMedia } from './reelUploader';

/**
 * Controlled Concurrency Upload Queue for Tour 2026.
 *
 * Prevents mobile network socket exhaustion and Cloudflare rate limiting
 * by processing image/reel uploads with a strict concurrency limit (default: 2).
 */

class UploadQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.queue = [];
    this.activeWorkers = 0;
    this.listeners = new Set();
    this.completedCount = 0;
    this.failedCount = 0;
  }

  /**
   * Sets the concurrency limit.
   */
  setConcurrency(limit) {
    if (typeof limit === 'number' && limit >= 1) {
      this.concurrency = limit;
      this.processNext();
    }
  }

  /**
   * Subscribes to queue status events.
   * Listener receives: ({ pending, active, completed, failed, total })
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const status = {
      pending: this.queue.length,
      active: this.activeWorkers,
      completed: this.completedCount,
      failed: this.failedCount,
      total: this.queue.length + this.activeWorkers + this.completedCount,
    };
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (e) {
        console.warn('Queue listener error:', e);
      }
    }
  }

  /**
   * Enqueues an upload task.
   *
   * @param {Blob|File|string} fileOrDataUrl
   * @param {Object} options - Options passed to uploadMedia
   * @returns {Promise<any>}
   */
  enqueue(fileOrDataUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const task = {
        id: options.taskId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fileOrDataUrl,
        options,
        resolve,
        reject,
        status: 'pending',
        progress: 0,
      };

      this.queue.push(task);
      this.notify();
      this.processNext();
    });
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers++;
    task.status = 'active';
    this.notify();

    try {
      const originalOnProgress = task.options?.onProgress;
      const wrappedProgress = (progressData) => {
        task.progress = progressData.percent;
        originalOnProgress?.(progressData);
      };

      const result = await uploadMedia(task.fileOrDataUrl, {
        ...task.options,
        onProgress: wrappedProgress,
      });

      this.completedCount++;
      task.status = 'completed';
      task.resolve(result);
    } catch (err) {
      this.failedCount++;
      task.status = 'failed';
      task.reject(err);
    } finally {
      this.activeWorkers--;
      this.notify();
      // Continue draining queue
      this.processNext();
    }
  }

  /**
   * Clears all pending (not active) jobs from the queue.
   */
  clear() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      task.reject(new Error('Upload cancelled'));
    }
    this.notify();
  }

  /**
   * Returns current queue snapshot.
   */
  getSnapshot() {
    return {
      pending: this.queue.length,
      active: this.activeWorkers,
      completed: this.completedCount,
      failed: this.failedCount,
    };
  }
}

// Global singleton instance
export const uploadQueue = new UploadQueue(2);

/**
 * Helper to upload through the concurrency queue.
 */
export function uploadWithQueue(fileOrDataUrl, options = {}) {
  return uploadQueue.enqueue(fileOrDataUrl, options);
}
