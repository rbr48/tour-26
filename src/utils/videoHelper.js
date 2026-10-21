/**
 * Video helper utilities for Instagram Reels in Tour 2026.
 * Supports metadata extraction, frame capture for instant thumbnails,
 * formatting, and trimming segment calculations (up to 3 minutes / 180s).
 */

import { Capacitor } from '@capacitor/core';

export const MAX_REEL_DURATION = 180; // 3 minutes in seconds
export const PRODUCTION_ORIGIN = 'https://tour2026.izhaanintellect.fun';

/**
 * Resolves a video or media URL for both Web and native Capacitor Android.
 * In native Capacitor, relative URLs like '/uploads/xyz.mp4' must be resolved
 * against the production host, otherwise the WebView attempts to look up 'https://localhost/uploads/xyz.mp4'
 * which does not exist in bundled assets.
 */
export function resolveMediaUrl(url, driveFileId = null) {
  if (!url) {
    if (driveFileId) {
      return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    }
    return null;
  }
  if (typeof url !== 'string') return url;

  // Blob and Data URLs are ready for instant local playback
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Google Drive link with /view -> convert to direct stream or fallback
  if (url.includes('drive.google.com/file/d/') && !url.includes('preview')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  // Already an absolute HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative path (e.g. /uploads/reel_123.mp4 or /uploads/photo_123.jpg)
  if (url.startsWith('/')) {
    if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '3000')) {
      return `${PRODUCTION_ORIGIN}${url}`;
    }
    return url;
  }

  return url;
}

/**
 * Returns a Google Drive preview/embed URL if available
 */
export function getDriveEmbedUrl(url, driveFileId = null) {
  if (driveFileId) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }
  if (typeof url === 'string') {
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
  }
  return null;
}

/**
 * Format seconds into Bengali numerals MM:SS (e.g. 02:15 -> ০২:১৫)
 */
export const toBnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/**
 * Formats duration in seconds to "MM:SS" or "HH:MM:SS"
 */
export function formatDuration(seconds, { bengali = false } = {}) {
  if (isNaN(seconds) || seconds < 0) return bengali ? '০০:০০' : '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (num) => String(num).padStart(2, '0');
  let result = '';
  if (hrs > 0) {
    result = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  } else {
    result = `${pad(mins)}:${pad(secs)}`;
  }

  return bengali ? toBnNum(result) : result;
}

/**
 * Clamps start and end times to adhere to max 3 minutes (180s) trimming limit.
 *
 * @param {number} start - Requested start time in seconds
 * @param {number} end - Requested end time in seconds
 * @param {number} totalDuration - Full duration of original video
 * @returns {{ startTime: number, endTime: number, duration: number }}
 */
export function clampSegmentBounds(start, end, totalDuration) {
  const maxDur = MAX_REEL_DURATION;
  const safeTotal = Math.max(0, totalDuration || 0);

  let s = Math.max(0, Math.min(start || 0, safeTotal));
  let e = Math.max(s, Math.min(end || s + maxDur, safeTotal));

  if (e - s > maxDur) {
    e = Math.min(safeTotal, s + maxDur);
  }

  if (e <= s) {
    e = Math.min(safeTotal, s + Math.min(maxDur, safeTotal));
  }

  const duration = Math.max(0, e - s);
  return {
    startTime: Math.round(s * 10) / 10,
    endTime: Math.round(e * 10) / 10,
    duration: Math.round(duration * 10) / 10,
  };
}

/**
 * Extracts metadata (duration, width, height) from a video file or blob.
 *
 * @param {File|Blob|string} fileOrBlobOrUrl
 * @returns {Promise<{ duration: number, width: number, height: number, isPortrait: boolean }>}
 */
export function getVideoMetadata(fileOrBlobOrUrl) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';

    const objectUrl = typeof fileOrBlobOrUrl === 'string'
      ? fileOrBlobOrUrl
      : URL.createObjectURL(fileOrBlobOrUrl);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      video.removeAttribute('src');
      video.load();
      if (typeof fileOrBlobOrUrl !== 'string') {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const isPortrait = height > width;

      cleanup();
      resolve({
        duration: Math.round(duration * 10) / 10,
        width,
        height,
        isPortrait,
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('ভিডিও মেটাডাটা রিড করা সম্ভব হয়নি। ফাইলটি ক্ষতিগ্রস্ত অথবা ফরম্যাট সমর্থিত নয়।'));
    };

    // Timeout fallback after 10s
    setTimeout(() => {
      if (!cleanedUp) {
        cleanup();
        reject(new Error('ভিডিও লোড হতে অতিরিক্ত সময় লাগছে।'));
      }
    }, 10000);

    video.src = objectUrl;
  });
}

/**
 * Captures a video frame at a given time and outputs a compact, compressed JPEG DataURL.
 * Suitable for instant cover thumbnail display in Firestore without exceeding limits.
 */
export function captureVideoFrame(fileOrBlobOrUrl, seekTime = 0.5, { maxWidth = 480, maxHeight = 854, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;

    const objectUrl = typeof fileOrBlobOrUrl === 'string'
      ? fileOrBlobOrUrl
      : URL.createObjectURL(fileOrBlobOrUrl);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      video.removeAttribute('src');
      video.load();
      if (typeof fileOrBlobOrUrl !== 'string') {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onloadedmetadata = () => {
      const targetTime = Math.min(Math.max(0, seekTime), Math.max(0, video.duration - 0.1));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const vw = video.videoWidth || 480;
        const vh = video.videoHeight || 854;

        // Calculate aspect-ratio preserved dimensions
        let width = vw;
        let height = vh;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context unavailable');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Keep thumbnail string strictly bounded (< 75,000 chars) for Firestore safety
        if (dataUrl.length > 75000) {
          try {
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = Math.max(1, Math.round(canvas.width * 0.75));
            smallCanvas.height = Math.max(1, Math.round(canvas.height * 0.75));
            const sCtx = smallCanvas.getContext('2d');
            if (sCtx) {
              sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
              dataUrl = smallCanvas.toDataURL('image/jpeg', 0.65);
            }
          } catch {}
        }

        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('ভিডিও ফ্রেম ক্যাপচার করা সম্ভব হয়নি।'));
    };

    setTimeout(() => {
      if (!cleanedUp) {
        cleanup();
        reject(new Error('ফ্রেম ক্যাপচার টাইমআউট হয়েছে।'));
      }
    }, 8000);

    video.src = objectUrl;
  });
}
