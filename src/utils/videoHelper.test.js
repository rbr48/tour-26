import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  toBnNum,
  clampSegmentBounds,
  MAX_REEL_DURATION,
  resolveMediaUrl,
  getDriveEmbedUrl,
  PRODUCTION_ORIGIN,
  getPublicAppOrigin,
  getShareableUrl,
} from './videoHelper';

describe('videoHelper', () => {
  describe('toBnNum', () => {
    it('converts western digits to Bengali digits', () => {
      expect(toBnNum(0)).toBe('০');
      expect(toBnNum(180)).toBe('১৮০');
      expect(toBnNum('02:15')).toBe('০২:১৫');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds into MM:SS correctly', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(180)).toBe('03:00');
      expect(formatDuration(3665)).toBe('01:01:05');
    });

    it('formats into Bengali when option is set', () => {
      expect(formatDuration(90, { bengali: true })).toBe('০১:৩০');
      expect(formatDuration(180, { bengali: true })).toBe('০৩:০০');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatDuration(-5)).toBe('00:00');
      expect(formatDuration(NaN)).toBe('00:00');
      expect(formatDuration(NaN, { bengali: true })).toBe('০০:০০');
    });
  });

  describe('clampSegmentBounds', () => {
    it('defaults to full duration if within MAX_REEL_DURATION', () => {
      const result = clampSegmentBounds(0, 120, 120);
      expect(result.startTime).toBe(0);
      expect(result.endTime).toBe(120);
      expect(result.duration).toBe(120);
    });

    it('caps segment at MAX_REEL_DURATION (180s) when video is longer', () => {
      // 10-minute video (600s), user starts at 0
      const result = clampSegmentBounds(0, 400, 600);
      expect(result.startTime).toBe(0);
      expect(result.endTime).toBe(180);
      expect(result.duration).toBe(180);
    });

    it('allows picking any 3-minute segment from middle of video', () => {
      // User picks starting at 200s, wants to end at 500s -> capped at 200 + 180 = 380s
      const result = clampSegmentBounds(200, 500, 600);
      expect(result.startTime).toBe(200);
      expect(result.endTime).toBe(380);
      expect(result.duration).toBe(180);
    });

    it('handles segment picking near end of video', () => {
      // Video is 500s, user starts at 450s, end at 600s -> end clamped to 500s, duration 50s
      const result = clampSegmentBounds(450, 600, 500);
      expect(result.startTime).toBe(450);
      expect(result.endTime).toBe(500);
      expect(result.duration).toBe(50);
    });

    it('handles invalid or backwards times', () => {
      const result = clampSegmentBounds(100, 50, 500);
      expect(result.startTime).toBe(100);
      expect(result.endTime).toBe(280);
      expect(result.duration).toBe(180);
    });
  });

  describe('resolveMediaUrl', () => {
    it('returns null for empty or falsy url when no driveId is provided', () => {
      expect(resolveMediaUrl(null)).toBeNull();
      expect(resolveMediaUrl('')).toBeNull();
    });

    it('returns direct stream url if url is missing but driveFileId is provided', () => {
      expect(resolveMediaUrl(null, 'file123')).toBe('https://drive.google.com/uc?export=download&id=file123');
    });

    it('preserves blob and data URLs', () => {
      expect(resolveMediaUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
      expect(resolveMediaUrl('data:image/jpeg;base64,...')).toBe('data:image/jpeg;base64,...');
    });

    it('converts google drive /view urls to direct stream download urls', () => {
      expect(resolveMediaUrl('https://drive.google.com/file/d/test123abc/view')).toBe('https://drive.google.com/uc?export=download&id=test123abc');
    });

    it('preserves absolute external URLs', () => {
      expect(resolveMediaUrl('https://example.com/video.mp4')).toBe('https://example.com/video.mp4');
    });
  });

  describe('getDriveEmbedUrl', () => {
    it('generates preview embed url from driveFileId', () => {
      expect(getDriveEmbedUrl(null, 'file999')).toBe('https://drive.google.com/file/d/file999/preview');
    });

    it('extracts drive file id from URL string and returns preview url', () => {
      expect(getDriveEmbedUrl('https://drive.google.com/file/d/abcXYZ-123/view')).toBe('https://drive.google.com/file/d/abcXYZ-123/preview');
    });

    it('returns null if not a drive url and no driveFileId provided', () => {
      expect(getDriveEmbedUrl('/uploads/reel.mp4')).toBeNull();
      expect(getDriveEmbedUrl(null)).toBeNull();
    });
  });

  describe('getPublicAppOrigin', () => {
    it('returns the production origin if on localhost or Android native', () => {
      const origin = getPublicAppOrigin();
      expect(origin).toBe('https://tour2026.izhaanintellect.fun');
    });
  });

  describe('getShareableUrl', () => {
    it('creates standard feed tab url when no ids given', () => {
      expect(getShareableUrl()).toBe('https://tour2026.izhaanintellect.fun/#feed');
    });

    it('creates deep link url for posts with ?post= query', () => {
      expect(getShareableUrl({ tab: 'feed', postId: 'post_123' })).toBe(
        'https://tour2026.izhaanintellect.fun/#feed?post=post_123'
      );
    });

    it('creates deep link url for reels with ?reel= query', () => {
      expect(getShareableUrl({ tab: 'feed', reelId: 'reel_456' })).toBe(
        'https://tour2026.izhaanintellect.fun/#feed?reel=reel_456'
      );
    });

    it('properly encodes special characters in IDs', () => {
      expect(getShareableUrl({ tab: 'feed', postId: 'item 123&foo=bar' })).toBe(
        'https://tour2026.izhaanintellect.fun/#feed?post=item%20123%26foo%3Dbar'
      );
    });
  });
});
