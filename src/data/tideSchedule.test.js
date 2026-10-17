import { describe, expect, it } from 'vitest';
import { TIDE_SCHEDULE, TIDE_SCHEDULE_SOURCE, tidesForDate } from './tideSchedule';

describe('tide schedule', () => {
  it('returns the windows for an entered date', () => {
    const phases = tidesForDate('2026-10-19');
    expect(phases).toHaveLength(3);
    expect(phases.map((phase) => phase.type)).toEqual(['low', 'high', 'low']);
  });

  it('returns nothing for a date without entries instead of borrowing another day', () => {
    expect(tidesForDate('2026-11-01')).toBeNull();
    expect(tidesForDate('constructor')).toBeNull();
  });

  it('keeps every window inside one day and in order', () => {
    for (const phases of Object.values(TIDE_SCHEDULE)) {
      for (const phase of phases) {
        expect(phase.startM).toBeGreaterThanOrEqual(0);
        expect(phase.endM).toBeGreaterThan(phase.startM);
        expect(phase.endM).toBeLessThanOrEqual(1440);
      }
    }
  });

  it('states that the times are hand-entered', () => {
    expect(TIDE_SCHEDULE_SOURCE).toMatch(/not verified/i);
  });
});
