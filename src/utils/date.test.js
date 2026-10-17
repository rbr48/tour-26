import { describe, expect, it } from 'vitest';
import { localISODate, localTimeHHMM } from './date';

// Bangladesh is UTC+6. 19:30 UTC on 18 October is 01:30 on 19 October there.
process.env.TZ = 'Asia/Dhaka';

describe('local calendar dates', () => {
  it('uses the device date, not the UTC date, just after midnight', () => {
    const justAfterMidnight = new Date('2026-10-18T19:30:00Z');
    expect(localISODate(justAfterMidnight)).toBe('2026-10-19');
    expect(localTimeHHMM(justAfterMidnight)).toBe('01:30');
  });

  it('pads single-digit months and days', () => {
    expect(localISODate(new Date('2026-03-05T12:00:00Z'))).toBe('2026-03-05');
  });
});
