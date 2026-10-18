import { describe, it, expect } from 'vitest';
import { toBnNum, isSafeMediaUrl, getPostImages } from './InstagramFeed';

describe('InstagramFeed utilities & helpers', () => {
  it('converts western numerals to Bengali numerals accurately', () => {
    expect(toBnNum(0)).toBe('০');
    expect(toBnNum(15)).toBe('১৫');
    expect(toBnNum(2026)).toBe('২০২৬');
    expect(toBnNum('1234567890')).toBe('১২৩৪৫৬৭৮৯০');
  });

  it('validates safe media URLs', () => {
    expect(isSafeMediaUrl('https://example.com/photo.jpg')).toBe(true);
    expect(isSafeMediaUrl('/plans/day1.jpeg')).toBe(true);
    expect(isSafeMediaUrl('data:image/jpeg;base64,12345')).toBe(true);
    expect(isSafeMediaUrl('blob:http://localhost/12345')).toBe(true);
    expect(isSafeMediaUrl('')).toBe(false);
    expect(isSafeMediaUrl(null)).toBe(false);
    expect(isSafeMediaUrl(undefined)).toBe(false);
  });

  it('extracts images from post correctly', () => {
    const multiPost = {
      id: 1,
      images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    };
    expect(getPostImages(multiPost)).toEqual([
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
    ]);

    const singlePost = {
      id: 2,
      image: 'https://example.com/single.jpg',
    };
    expect(getPostImages(singlePost)).toEqual(['https://example.com/single.jpg']);

    const emptyPost = { id: 3 };
    expect(getPostImages(emptyPost)).toEqual([]);
  });
});
