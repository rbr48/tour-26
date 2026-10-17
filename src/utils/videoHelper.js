/**
 * Video helper utilities for Instagram Reels in Tour 2026.
 * Supports metadata extraction, frame capture for instant thumbnails,
 * formatting, and trimming segment calculations (up to 3 minutes / 180s).
 */

export const MAX_REEL_DURATION = 180; // 3 minutes in seconds

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
 * Ensures startTime and endTime stay within [0, totalDuration]
 * and that (endTime - startTime) <= maxDuration (default 180s).
 */
export function clampSegmentBounds(startTime, endTime, totalDuration = Infinity, maxDuration = MAX_REEL_DURATION) {
  let s = Math.max(0, Number(startTime) || 0);
  let e = Number(endTime);

  if (isNaN(e) || e <= s) {
    e = s + Math.min(maxDuration, totalDuration - s);
  }

  // Cap e by total duration if available
  if (totalDuration > 0 && e > totalDuration) {
    e = totalDuration;
  }

  // Cap length by maxDuration
  if (e - s > maxDuration) {
    e = s + maxDuration;
  }

  // If s became greater than totalDuration - 1
  if (totalDuration > 0 && s >= totalDuration) {
    s = Math.max(0, totalDuration - 1);
    e = totalDuration;
  }

  const duration = Math.max(0, e - s);
  return {
    startTime: Number(s.toFixed(2)),
    endTime: Number(e.toFixed(2)),
    duration: Number(duration.toFixed(2)),
  };
}

/**
 * Read duration, dimensions, and aspect ratio from a video File or Blob.
 */
export function getVideoMetadata(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      return reject(new Error('No video file provided'));
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    const objectUrl = typeof fileOrBlob === 'string'
      ? fileOrBlob
      : URL.createObjectURL(fileOrBlob);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      video.removeAttribute('src');
      video.load();
      if (typeof fileOrBlob !== 'string') {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onloadedmetadata = () => {
      const duration = Number(video.duration) || 0;
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;
      const isVertical = height >= width;
      const aspectRatio = width / (height || 1);

      cleanup();
      resolve({
        duration,
        width,
        height,
        isVertical,
        aspectRatio,
        formattedDuration: formatDuration(duration, { bengali: true }),
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
 * Captures a video frame at a given time and outputs a compressed JPEG DataURL.
 * Suitable for instant cover thumbnail display in Firestore.
 */
export function captureVideoFrame(fileOrBlobOrUrl, seekTime = 0.5, { maxWidth = 640, maxHeight = 640, quality = 0.72 } = {}) {
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
        const vw = video.videoWidth || 720;
        const vh = video.videoHeight || 1280;

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

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

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
