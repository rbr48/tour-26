import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  toBnNum,
  clampSegmentBounds,
  MAX_REEL_DURATION,
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
});
