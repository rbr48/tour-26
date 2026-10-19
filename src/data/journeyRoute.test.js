import { describe, it, expect } from 'vitest';
import {
  TOTAL_DISTANCE_KM,
  HIGHWAY_MILESTONES,
  formatKm,
  calculateProgress,
  calculateDistanceKm,
  findNearestMilestone,
} from './journeyRoute';

describe('journeyRoute', () => {
  it('defines 13 official milestones starting in Rangpur and ending in Cox\'s Bazar', () => {
    expect(HIGHWAY_MILESTONES).toHaveLength(13);
    expect(HIGHWAY_MILESTONES[0].id).toBe('RANGPUR_START');
    expect(HIGHWAY_MILESTONES[0].kmFromStart).toBe(0);
    expect(HIGHWAY_MILESTONES[12].id).toBe('COXS_BAZAR_HOTEL');
    expect(HIGHWAY_MILESTONES[12].kmFromStart).toBe(TOTAL_DISTANCE_KM);
  });

  it('maintains strictly increasing distance from start', () => {
    for (let i = 1; i < HIGHWAY_MILESTONES.length; i++) {
      expect(HIGHWAY_MILESTONES[i].kmFromStart).toBeGreaterThan(
        HIGHWAY_MILESTONES[i - 1].kmFromStart
      );
    }
  });

  it('correctly calculates progress percentages', () => {
    const startProgress = calculateProgress(0);
    expect(startProgress.percentage).toBe(0);
    expect(startProgress.completedKm).toBe(0);
    expect(startProgress.remainingKm).toBe(820);
    expect(startProgress.isComplete).toBe(false);

    // Halfway checkpoint (Cumilla Paduar Bazar at 430 km)
    const midProgress = calculateProgress(7);
    expect(midProgress.completedKm).toBe(430);
    expect(midProgress.remainingKm).toBe(390);
    expect(midProgress.percentage).toBe(52);

    // Final arrival at Hotel Sea Moon
    const endProgress = calculateProgress(12);
    expect(endProgress.percentage).toBe(100);
    expect(endProgress.completedKm).toBe(820);
    expect(endProgress.remainingKm).toBe(0);
    expect(endProgress.isComplete).toBe(true);
  });

  it('formats km with Bengali numerals and unit', () => {
    expect(formatKm(0)).toBe('০ কিমি');
    expect(formatKm(820)).toBe('৮২০ কিমি');
    expect(formatKm(110.4)).toBe('১১০ কিমি');
  });

  it('calculates Haversine distance correctly', () => {
    // Rangpur (25.7439, 89.2752) to Bogra Sherpur (24.6738, 89.4187) ~119 km straight line
    const dist = calculateDistanceKm(25.7439, 89.2752, 24.6738, 89.4187);
    expect(dist).toBeGreaterThan(115);
    expect(dist).toBeLessThan(125);
  });

  it('finds the nearest milestone for a given GPS coordinate', () => {
    // Near Jamuna Bridge
    const nearest = findNearestMilestone(24.40, 89.78);
    expect(nearest.milestone.id).toBe('JAMUNA_BRIDGE');
    expect(nearest.distanceKm).toBeLessThan(5);
  });
});
