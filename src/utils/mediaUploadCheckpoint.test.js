import { describe, expect, it, beforeEach } from 'vitest';
import {
  saveCheckpoint,
  getCheckpoint,
  markChunkUploaded,
  removeCheckpoint,
} from './mediaUploadCheckpoint';

describe('mediaUploadCheckpoint', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('saves and retrieves an upload checkpoint', async () => {
    const uploadId = 'up_test_123';
    await saveCheckpoint({
      uploadId,
      postId: 'post_1',
      fileName: 'test.mp4',
      totalChunks: 5,
      uploadedChunks: [0, 1],
    });

    const retrieved = await getCheckpoint(uploadId);
    expect(retrieved).not.toBeNull();
    expect(retrieved.uploadId).toBe(uploadId);
    expect(retrieved.uploadedChunks).toEqual([0, 1]);
    expect(retrieved.totalChunks).toBe(5);
  });

  it('marks chunks as uploaded idempotently', async () => {
    const uploadId = 'up_chunks_test';
    await saveCheckpoint({
      uploadId,
      totalChunks: 4,
      uploadedChunks: [0],
    });

    await markChunkUploaded(uploadId, 1);
    await markChunkUploaded(uploadId, 1); // duplicate chunk index
    await markChunkUploaded(uploadId, 2);

    const updated = await getCheckpoint(uploadId);
    expect(updated.uploadedChunks).toEqual([0, 1, 2]);
  });

  it('removes checkpoint when completed', async () => {
    const uploadId = 'up_remove_test';
    await saveCheckpoint({
      uploadId,
      totalChunks: 3,
      uploadedChunks: [0, 1, 2],
    });

    await removeCheckpoint(uploadId);
    const result = await getCheckpoint(uploadId);
    expect(result).toBeNull();
  });
});
