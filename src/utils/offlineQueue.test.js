import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getOfflineQueue,
  enqueueOfflinePost,
  removeOfflinePost,
  clearOfflineQueue,
  drainOfflineQueue,
} from './offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    clearOfflineQueue();
    vi.restoreAllMocks();
  });

  it('starts with an empty queue', () => {
    expect(getOfflineQueue()).toEqual([]);
  });

  it('enqueues a post with tempId and queuedAt', () => {
    const post = { caption: 'Highway tea stop', author: 'Shohag' };
    const queue = enqueueOfflinePost(post);
    expect(queue).toHaveLength(1);
    expect(queue[0].caption).toBe('Highway tea stop');
    expect(queue[0].tempId).toMatch(/^offline_/);
    expect(queue[0].offlineQueued).toBe(true);
  });

  it('removes a post by tempId', () => {
    const post1 = { caption: 'Stop 1' };
    const post2 = { caption: 'Stop 2' };
    enqueueOfflinePost(post1);
    const q2 = enqueueOfflinePost(post2);
    expect(q2).toHaveLength(2);

    const tempIdToRemove = q2[0].tempId;
    const remaining = removeOfflinePost(tempIdToRemove);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].caption).toBe('Stop 2');
  });

  it('clears the entire queue', () => {
    enqueueOfflinePost({ caption: 'Test 1' });
    enqueueOfflinePost({ caption: 'Test 2' });
    clearOfflineQueue();
    expect(getOfflineQueue()).toEqual([]);
  });

  it('drains the queue using uploadFn', async () => {
    enqueueOfflinePost({ caption: 'Post 1' });
    enqueueOfflinePost({ caption: 'Post 2' });

    const uploaded = [];
    const mockUpload = vi.fn().mockImplementation(async (item) => {
      uploaded.push(item);
      return { success: true };
    });

    const result = await drainOfflineQueue(mockUpload);
    expect(result.uploaded).toBe(2);
    expect(result.remaining).toBe(0);
    expect(uploaded).toHaveLength(2);
    expect(uploaded[0].caption).toBe('Post 1');
    expect(uploaded[1].caption).toBe('Post 2');
    expect(getOfflineQueue()).toEqual([]);
  });

  it('stops draining if an upload fails offline', async () => {
    enqueueOfflinePost({ caption: 'Post 1' });
    enqueueOfflinePost({ caption: 'Post 2' });

    vi.stubGlobal('navigator', { onLine: false });

    const mockUpload = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await drainOfflineQueue(mockUpload);
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(2);
  });
});
