import { describe, expect, it } from 'vitest';
import {
  TOUR_DAYS,
  getCurrentTourDay,
  getTourDayById,
  getPostTourDay,
  getSuggestedTourLocation,
  getDhakaDateString,
} from './tourSchedule';

describe('tourSchedule', () => {
  it('has 5 configured tour days', () => {
    expect(TOUR_DAYS).toHaveLength(5);
    expect(TOUR_DAYS[0].id).toBe('day1');
    expect(TOUR_DAYS[4].id).toBe('day5');
  });

  it('retrieves tour day by id', () => {
    expect(getTourDayById('day2').name).toBe('২য় দিন');
    expect(getTourDayById('day4').badge).toBe('মহেশখালী সফর');
    expect(getTourDayById('invalid_id').id).toBe('day1');
  });

  it('determines Day 1 for Oct 19, 2026', () => {
    const oct19 = new Date('2026-10-19T10:00:00+06:00');
    expect(getCurrentTourDay(oct19).id).toBe('day1');
  });

  it('determines Day 3 for Oct 21, 2026', () => {
    const oct21 = new Date('2026-10-21T14:00:00+06:00');
    expect(getCurrentTourDay(oct21).id).toBe('day3');
  });

  it('determines post tour day by post.tourDay or date', () => {
    expect(getPostTourDay({ tourDay: 'day2' })).toBe('day2');
    expect(getPostTourDay({ date: '2026-10-21' })).toBe('day3');
    expect(getPostTourDay({ caption: 'ইনানী বিচে দারুণ সময় কাটালাম' })).toBe('day1');
  });

  it('suggests location spot based on day and time', () => {
    const oct19Evening = new Date('2026-10-19T18:30:00+06:00');
    const suggestion = getSuggestedTourLocation(oct19Evening);
    expect(suggestion.spot).toBe('কামারপাড়া বাস স্ট্যান্ড, রংপুর');
    expect(suggestion.day.id).toBe('day1');
  });
});
