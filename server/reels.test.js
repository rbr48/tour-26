import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReelsRegistry } from './reels-registry.js';
import { createReelsArchiver } from './reels-archiver.js';
import { createStaticHandler } from './static-files.js';

describe('Reels Tiered Storage System', () => {
  let tmpDir;
  let uploadsDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-test-'));
    uploadsDir = path.join(tmpDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('reelsRegistry', () => {
    it('initializes and saves new reel entries', () => {
      const registry = createReelsRegistry(tmpDir);
      expect(registry.getAll()).toHaveLength(0);

      const entry = registry.addReel({
        fileName: 'reel_123.mp4',
        postId: 'post_1',
        originalSize: 1000,
        compressedSize: 500,
      });

      expect(entry.fileName).toBe('reel_123.mp4');
      expect(entry.status).toBe('vps_hot');
      expect(registry.getAll()).toHaveLength(1);
    });

    it('identifies expired reels older than 7 days', () => {
      const registry = createReelsRegistry(tmpDir);
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000;

      registry.addReel({
        fileName: 'old_reel.mp4',
        postId: 'old_1',
        uploadedAt: eightDaysAgo,
      });

      registry.addReel({
        fileName: 'new_reel.mp4',
        postId: 'new_1',
        uploadedAt: oneDayAgo,
      });

      const expired = registry.getExpiredReels();
      expect(expired).toHaveLength(1);
      expect(expired[0].fileName).toBe('old_reel.mp4');
    });

    it('updates reel metadata with Google Drive archive info', () => {
      const registry = createReelsRegistry(tmpDir);
      registry.addReel({ fileName: 'reel_abc.mp4', postId: 'p_abc' });

      registry.updateReel('reel_abc.mp4', {
        status: 'gdrive_archived',
        driveFileId: 'drive_123',
        driveStreamUrl: 'https://drive.google.com/uc?export=download&id=drive_123',
      });

      const archivedUrl = registry.getArchivedDriveUrl('reel_abc.mp4');
      expect(archivedUrl).toBe('https://drive.google.com/uc?export=download&id=drive_123');
    });
  });

  describe('reelsArchiver', () => {
    it('uploads expired reel, updates registry, and deletes local file', async () => {
      const registry = createReelsRegistry(tmpDir);
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;

      const dummyFile = path.join(uploadsDir, 'reel_expired.mp4');
      fs.writeFileSync(dummyFile, 'dummy-video-data');

      registry.addReel({
        fileName: 'reel_expired.mp4',
        postId: 'exp_1',
        uploadedAt: eightDaysAgo,
      });

      // Mock fetch for Google Apps Script Webhook
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          fileId: 'mock_drive_file_id_999',
          webViewLink: 'https://drive.google.com/file/d/mock_drive_file_id_999/view',
        }),
      });

      const archiver = createReelsArchiver({
        dataDir: tmpDir,
        registry,
        webhookUrl: 'https://mock.script.google.com/exec',
      });

      const result = await archiver.archiveExpiredReels();
      expect(result.archived).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Local file should now be deleted to save space
      expect(fs.existsSync(dummyFile)).toBe(false);

      // Registry should reflect archived status
      const updated = registry.getById('reel_expired.mp4');
      expect(updated.status).toBe('gdrive_archived');
      expect(updated.driveFileId).toBe('mock_drive_file_id_999');
      expect(updated.driveStreamUrl).toBe('https://drive.google.com/uc?export=download&id=mock_drive_file_id_999');
    });
  });

  describe('staticFiles Redirection', () => {
    it('sends 302 redirect to Google Drive when file is archived', () => {
      const registry = createReelsRegistry(tmpDir);
      registry.addReel({
        fileName: 'archived_reel.mp4',
        postId: 'archived_1',
      });
      registry.updateReel('archived_reel.mp4', {
        status: 'gdrive_archived',
        driveStreamUrl: 'https://drive.google.com/uc?export=download&id=drive_xyz',
      });

      const handler = createStaticHandler(tmpDir, uploadsDir, registry);

      let statusCode = 0;
      const headers = {};
      const res = {
        writeHead: (status, h) => {
          statusCode = status;
          Object.assign(headers, h);
        },
        end: () => {},
      };

      handler({ method: 'GET' }, res, '/uploads/archived_reel.mp4');

      expect(statusCode).toBe(302);
      expect(headers.Location).toBe('https://drive.google.com/uc?export=download&id=drive_xyz');
    });
  });
});
