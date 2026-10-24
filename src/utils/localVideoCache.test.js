import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLocalVideoUrl,
  revokeLocalVideoUrl,
  clearAllLocalVideoUrls,
  saveLocalVideo,
} from './localVideoCache';

describe('localVideoCache object URL lifecycle', () => {
  const fakeStore = new Map();

  beforeEach(() => {
    clearAllLocalVideoUrls();
    fakeStore.clear();
    vi.restoreAllMocks();

    global.window = global.window || {};
    global.window.indexedDB = {
      open: () => {
        const req = {
          result: {
            transaction: () => ({
              objectStore: () => ({
                get: (id) => {
                  const r = { result: fakeStore.get(String(id)), onsuccess: null, onerror: null };
                  setTimeout(() => r.onsuccess && r.onsuccess({ target: r }), 0);
                  return r;
                },
                put: (item) => {
                  fakeStore.set(String(item.id), item);
                  const r = { onsuccess: null, onerror: null };
                  setTimeout(() => r.onsuccess && r.onsuccess({ target: r }), 0);
                  return r;
                },
              }),
            }),
          },
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
    };
  });

  it('revokes local video url cleanly and removes from cache map', async () => {
    const mockBlob = new Blob(['video-bytes'], { type: 'video/mp4' });
    let createdCount = 0;
    const revokedUrls = [];

    global.URL.createObjectURL = vi.fn(() => {
      createdCount++;
      return `blob:http://localhost/test-${createdCount}`;
    });
    global.URL.revokeObjectURL = vi.fn((url) => {
      revokedUrls.push(url);
    });

    await saveLocalVideo('reel_test_1', mockBlob);

    // 1. First fetch creates a new blob URL
    const url1 = await getLocalVideoUrl('reel_test_1');
    expect(url1).toBe('blob:http://localhost/test-1');

    // 2. Fetching again returns cached URL without re-creating
    const url1Cached = await getLocalVideoUrl('reel_test_1');
    expect(url1Cached).toBe('blob:http://localhost/test-1');
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);

    // 3. Explicitly revoke with revokeLocalVideoUrl
    revokeLocalVideoUrl('reel_test_1');
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-1');

    // 4. Next fetch should recreate fresh URL instead of returning dead pointer
    const url2 = await getLocalVideoUrl('reel_test_1');
    expect(url2).toBe('blob:http://localhost/test-2');
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('clearAllLocalVideoUrls clears all registered URLs', async () => {
    const mockBlob = new Blob(['dummy'], { type: 'video/mp4' });
    global.URL.createObjectURL = vi.fn((b) => `blob:http://localhost/${Math.random()}`);
    global.URL.revokeObjectURL = vi.fn();

    await saveLocalVideo('reel_a', mockBlob);
    await saveLocalVideo('reel_b', mockBlob);

    const urlA = await getLocalVideoUrl('reel_a');
    const urlB = await getLocalVideoUrl('reel_b');

    expect(urlA).toBeTruthy();
    expect(urlB).toBeTruthy();

    clearAllLocalVideoUrls();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
