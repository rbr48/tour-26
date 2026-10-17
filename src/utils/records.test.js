import { describe, expect, it } from 'vitest';
import { newRecordId, normalizeReactions, stripUndefined } from './records';

describe('stripUndefined', () => {
  it('removes undefined fields at every level and keeps null', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: null }, f: [1, undefined, { g: undefined }] }))
      .toEqual({ a: 1, c: { e: null }, f: [1, {}] });
  });

  it('leaves dates and other class instances untouched', () => {
    const when = new Date(0);
    expect(stripUndefined({ when }).when).toBe(when);
  });
});

describe('normalizeReactions', () => {
  it('turns old counts into empty votes', () => {
    expect(normalizeReactions({ '👍': 3, '❤️': 1 })).toEqual({ '👍': [], '❤️': [] });
  });

  it('returns an empty map for missing reactions', () => {
    expect(normalizeReactions(undefined)).toEqual({});
    expect(normalizeReactions('x')).toEqual({});
  });
});

describe('newRecordId', () => {
  it('is a safe integer and grows with time', () => {
    const first = newRecordId();
    const second = newRecordId();
    expect(Number.isSafeInteger(first)).toBe(true);
    expect(second).toBeGreaterThan(0);
  });
});
