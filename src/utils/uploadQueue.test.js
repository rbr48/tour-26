import { describe, expect, it, vi, beforeEach } from 'vitest';
import { uploadQueue, uploadWithQueue } from './uploadQueue';
import * as reelUploader from './reelUploader';

describe('uploadQueue', () => {
  beforeEach(() => {
    uploadQueue.clear();
    uploadQueue.setConcurrency(2);
    vi.restoreAllMocks();
  });

  it('initializes with default concurrency of 2', () => {
    const snapshot = uploadQueue.getSnapshot();
    expect(snapshot.pending).toBe(0);
    expect(snapshot.active).toBe(0);
  });

  it('processes uploads respecting concurrency limits', async () => {
    let activeRunning = 0;
    let maxSeenActive = 0;

    vi.spyOn(reelUploader, 'uploadMedia').mockImplementation(async () => {
      activeRunning++;
      maxSeenActive = Math.max(maxSeenActive, activeRunning);
      await new Promise((r) => setTimeout(r, 20));
      activeRunning--;
      return { url: '/uploads/test.jpg' };
    });

    const tasks = [
      uploadWithQueue('data:image/jpeg;base64,1'),
      uploadWithQueue('data:image/jpeg;base64,2'),
      uploadWithQueue('data:image/jpeg;base64,3'),
      uploadWithQueue('data:image/jpeg;base64,4'),
    ];

    const results = await Promise.all(tasks);
    expect(results).toHaveLength(4);
    expect(maxSeenActive).toBeLessThanOrEqual(2);
  });

  it('notifies subscribers of queue changes', async () => {
    vi.spyOn(reelUploader, 'uploadMedia').mockResolvedValue({ url: '/uploads/ok.jpg' });

    const events = [];
    const unsubscribe = uploadQueue.subscribe((status) => {
      events.push(status);
    });

    await uploadWithQueue('data:image/jpeg;base64,test');
    expect(events.length).toBeGreaterThan(0);
    unsubscribe();
  });
});
