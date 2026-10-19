import { describe, it, expect } from 'vitest';
import {
  VERIFIED_RESTAURANTS,
  SIGHTSEEING_SPOTS,
  getSwimSafetyStatus,
  getSunsetCountdown,
} from './coxGuide';

describe('coxGuide', () => {
  it('contains 10 verified family restaurants with price ranges and map links', () => {
    expect(VERIFIED_RESTAURANTS).toHaveLength(10);
    VERIFIED_RESTAURANTS.forEach((r) => {
      expect(r.id).toBeDefined();
      expect(r.name).toBeDefined();
      expect(r.priceRange).toBeDefined();
      expect(r.mapsUrl).toMatch(/^https:\/\/maps\.google\.com/);
      expect(r.specialties.length).toBeGreaterThan(0);
    });
  });

  it('contains 8 top sightseeing spots with distance and best times', () => {
    expect(SIGHTSEEING_SPOTS).toHaveLength(8);
    SIGHTSEEING_SPOTS.forEach((s) => {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.distanceFromHotel).toBeDefined();
      expect(s.mapsUrl).toBeDefined();
    });
  });

  it('evaluates swim safety based on high tide vs low tide vs night', () => {
    // 2026-10-18 at 14:00 (840 minutes) is in High Tide 2 (765 to 975 mins)
    const highTideDate = new Date('2026-10-18T14:00:00');
    const safeStatus = getSwimSafetyStatus(highTideDate);
    expect(safeStatus.code).toBe('safe');
    expect(safeStatus.flag).toBe('green');

    // 2026-10-18 at 09:00 (540 minutes) is in Low Tide 1 (450 to 660 mins)
    const lowTideDate = new Date('2026-10-18T09:00:00');
    const dangerStatus = getSwimSafetyStatus(lowTideDate);
    expect(dangerStatus.code).toBe('danger');
    expect(dangerStatus.flag).toBe('red');

    // Nighttime at 22:00
    const nightDate = new Date('2026-10-18T22:00:00');
    const nightStatus = getSwimSafetyStatus(nightDate);
    expect(nightStatus.code).toBe('night');
    expect(nightStatus.flag).toBe('red');
  });

  it('detects golden hour window right before sunset', () => {
    // 17:20 is 22 minutes before 17:42 sunset -> golden hour!
    const goldenHourDate = new Date();
    goldenHourDate.setHours(17, 20, 0, 0);
    const goldenRes = getSunsetCountdown(goldenHourDate);
    expect(goldenRes.isGoldenHour).toBe(true);
    expect(goldenRes.state).toBe('golden_hour');

    // 12:00 is midday
    const noonDate = new Date();
    noonDate.setHours(12, 0, 0, 0);
    const noonRes = getSunsetCountdown(noonDate);
    expect(noonRes.isGoldenHour).toBe(false);
    expect(noonRes.state).toBe('day');
  });
});
