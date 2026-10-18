import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbzdoJLe5hD8Gmx3Q-vISeFAy5GDXs0thbt2DO-3aotJ2gWZlqxEB1fE3FJ2kq2tjdgWlA/exec';
export const GOOGLE_DRIVE_FOLDER_ID = '1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM';

/**
 * Creates the Reels Archiver worker that handles 7-day retention and Drive migration.
 */
export function createReelsArchiver({ dataDir, registry, webhookUrl = DEFAULT_WEBHOOK_URL }) {
  const uploadsDir = path.join(dataDir, 'uploads');
  let isRunning = false;

  async function uploadToDrive(filePath, fileName) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = `data:video/mp4;base64,${fileBuffer.toString('base64')}`;

    const payload = {
      image: base64Data,
      name: fileName,
      caption: 'Tour 2026 Reel Archive (Auto-Archived from VPS)',
      author: 'Tour Server Archiver',
      folderId: GOOGLE_DRIVE_FOLDER_ID,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Apps Script webhook responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const fileId = data.fileId || data.id;
    if (!fileId) {
      throw new Error('Apps Script webhook did not return a fileId');
    }

    return {
      fileId,
      webViewLink: data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      driveStreamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  async function archiveExpiredReels(maxAgeMs) {
    if (isRunning) {
      return { status: 'already_running', processed: 0, archived: 0 };
    }
    isRunning = true;

    const expired = registry.getExpiredReels(maxAgeMs);
    const results = [];
    let archivedCount = 0;
    let failedCount = 0;

    console.log(`[ReelsArchiver] Found ${expired.length} reel(s) older than 7 days for archiving.`);

    for (const reel of expired) {
      const localPath = path.join(uploadsDir, reel.fileName);

      if (!fs.existsSync(localPath)) {
        // File is already missing locally, check if it had drive info
        if (reel.driveStreamUrl) {
          registry.updateReel(reel.id, { status: 'gdrive_archived' });
        }
        results.push({ id: reel.id, fileName: reel.fileName, status: 'missing_local_file' });
        continue;
      }

      try {
        console.log(`[ReelsArchiver] Uploading ${reel.fileName} to Google Drive...`);
        const driveResult = await uploadToDrive(localPath, reel.fileName);

        // Update registry with Google Drive URLs
        registry.updateReel(reel.id, {
          status: 'gdrive_archived',
          driveFileId: driveResult.fileId,
          driveViewUrl: driveResult.webViewLink,
          driveStreamUrl: driveResult.driveStreamUrl,
          archivedAt: Date.now(),
        });

        // Delete the local file from VPS to free disk space
        try {
          fs.unlinkSync(localPath);
          console.log(`[ReelsArchiver] Safely deleted local file ${reel.fileName} to free VPS space.`);
        } catch (unlinkErr) {
          console.warn(`[ReelsArchiver] Could not delete ${reel.fileName}:`, unlinkErr?.message);
        }

        archivedCount++;
        results.push({
          id: reel.id,
          fileName: reel.fileName,
          status: 'archived',
          driveFileId: driveResult.fileId,
        });
      } catch (err) {
        failedCount++;
        console.error(`[ReelsArchiver] Failed to archive ${reel.fileName}:`, err?.message);
        results.push({
          id: reel.id,
          fileName: reel.fileName,
          status: 'failed',
          error: err?.message,
        });
      }
    }

    isRunning = false;
    return {
      status: 'completed',
      processed: expired.length,
      archived: archivedCount,
      failed: failedCount,
      results,
    };
  }

  function startSchedule(intervalMs = 6 * 60 * 60 * 1000) {
    // Initial check after 30 seconds of server startup
    const initialTimer = setTimeout(() => {
      archiveExpiredReels().catch((err) =>
        console.warn('[ReelsArchiver] Initial schedule check error:', err?.message)
      );
    }, 30000);
    initialTimer.unref?.();

    // Recurring interval (default every 6 hours)
    const intervalTimer = setInterval(() => {
      archiveExpiredReels().catch((err) =>
        console.warn('[ReelsArchiver] Scheduled check error:', err?.message)
      );
    }, intervalMs);
    intervalTimer.unref?.();

    return { initialTimer, intervalTimer };
  }

  return {
    archiveExpiredReels,
    startSchedule,
  };
}
