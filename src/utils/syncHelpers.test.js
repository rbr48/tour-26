import { describe, expect, it } from 'vitest';
import {
  bengaliToEnglishDigits,
  englishToBengaliDigits,
  extractRooms,
  extractSeats,
  FUND_LABEL,
  resolvePayerName,
  syncBusSeatsWithMembers,
  syncHotelRoomsWithMembers,
} from './syncHelpers';

describe('syncHelpers', () => {
  describe('digit conversions', () => {
    it('converts Bengali numerals to English numerals', () => {
      expect(bengaliToEnglishDigits('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
      expect(bengaliToEnglishDigits('রুম ৩০১ ও ৫০২')).toBe('রুম 301 ও 502');
      expect(bengaliToEnglishDigits('')).toBe('');
    });

    it('converts English numerals to Bengali numerals', () => {
      expect(englishToBengaliDigits('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
      expect(englishToBengaliDigits(15000)).toBe('১৫০০০');
    });
  });

  describe('extractSeats', () => {
    it('extracts seat IDs from Bengali description strings', () => {
      expect(extractSeats('স্লিপার S1, S2 (২ সিট)')).toEqual(['S1', 'S2']);
      expect(extractSeats('বিজনেস B1, B2, B3 (৩ সিট)')).toEqual(['B1', 'B2', 'B3']);
      expect(extractSeats('বিজনেস B12 (সিঙ্গেল)')).toEqual(['B12']);
    });

    it('handles various formatting, spaces, and hyphens', () => {
      expect(extractSeats('b-12, s-1, B 3')).toEqual(['B12', 'S1', 'B3']);
      expect(extractSeats('None')).toEqual([]);
      expect(extractSeats('')).toEqual([]);
    });
  });

  describe('extractRooms', () => {
    it('extracts 3-digit room numbers from Bengali room strings', () => {
      expect(extractRooms('রুম ৩০১ (সি-সাইড)')).toEqual(['301']);
      expect(extractRooms('রুম ৫০১ ও ৫০২')).toEqual(['501', '502']);
      expect(extractRooms('রুম ৭০২ (শেয়ার্ড)')).toEqual(['702']);
      expect(extractRooms('রুম 401')).toEqual(['401']);
      expect(extractRooms('')).toEqual([]);
    });
  });

  describe('resolvePayerName', () => {
    const members = [
      { id: 1, name: 'মো: রাজু আহমেদ' },
      { id: 2, name: 'মাসুদ রানা' },
    ];

    it('dynamically resolves live member name by paidById', () => {
      const expense = { id: 101, paidById: 1, paidBy: 'পুরনো নাম' };
      expect(resolvePayerName(expense, members)).toBe('মো: রাজু আহমেদ');
    });

    it('falls back to paidBy string if paidById is null or unlinked', () => {
      const expense = { id: 102, paidById: null, paidBy: 'ট্যুর ফান্ড' };
      expect(resolvePayerName(expense, members)).toBe('ট্যুর ফান্ড');
    });

    it('falls back to FUND_LABEL if neither is available', () => {
      expect(resolvePayerName({ id: 103 }, members)).toBe(FUND_LABEL);
    });
  });

  describe('syncBusSeatsWithMembers', () => {
    const members = [
      { id: 1, name: 'রাজু ভাই', seat: 'স্লিপার S1, S2 (২ সিট)', phone: '01711111111' },
      { id: 9, name: 'সোহাগ রানা', seat: 'বিজনেস B12 (সিঙ্গেল)', phone: '01722222222' },
    ];

    const seats = [
      { id: 'S1', member: 'পুরনো রাজু' },
      { id: 'S2', member: 'পুরনো রাজু' },
      { id: 'B12', member: 'পুরনো সোহাগ' },
      { id: 'B13', member: '' },
    ];

    it('synchronizes bus seats with latest member names, IDs and phone numbers', () => {
      const result = syncBusSeatsWithMembers(seats, members);
      const s1 = result.find((s) => s.id === 'S1');
      expect(s1.memberId).toBe(1);
      expect(s1.member).toBe('রাজু ভাই');
      expect(s1.memberPhone).toBe('01711111111');

      const b12 = result.find((s) => s.id === 'B12');
      expect(b12.memberId).toBe(9);
      expect(b12.member).toBe('সোহাগ রানা');
      expect(b12.memberPhone).toBe('01722222222');

      const b13 = result.find((s) => s.id === 'B13');
      expect(b13.member).toBe('');
    });

    it('vacates a seat when member seat attribute is reassigned', () => {
      const updatedMembers = [
        { id: 1, name: 'রাজু ভাই', seat: 'স্লিপার S1', phone: '01711111111' }, // S2 removed
      ];
      const previousSeats = [
        { id: 'S1', memberId: 1, member: 'রাজু ভাই' },
        { id: 'S2', memberId: 1, member: 'রাজু ভাই' },
      ];
      const result = syncBusSeatsWithMembers(previousSeats, updatedMembers);
      const s2 = result.find((s) => s.id === 'S2');
      expect(s2.memberId).toBeNull();
      expect(s2.member).toBe('');
    });
  });

  describe('syncHotelRoomsWithMembers', () => {
    const members = [
      { id: 1, name: 'রাজু ভাই', room: 'রুম ৩০১ (সি-সাইড)', familyCount: 2, phone: '01711111111' },
      { id: 9, name: 'সোহাগ রানা', room: 'রুম ৭০২ (শেয়ার্ড)', familyCount: 1, phone: '01722222222' },
      { id: 10, name: 'আলমগীর ভাই', room: 'রুম ৭০২ (শেয়ার্ড)', familyCount: 1, phone: '01733333333' },
    ];

    const rooms = [
      { roomNo: '301', occupants: 'পুরনো ডাটা', memberName: '' },
      { roomNo: '702', occupants: 'পুরনো ডাটা', memberName: '' },
      { roomNo: '401', occupants: 'খালি', memberName: '' },
    ];

    it('populates family room occupants dynamically', () => {
      const result = syncHotelRoomsWithMembers(rooms, members);
      const r301 = result.find((r) => r.roomNo === '301');
      expect(r301.occupants).toBe('রাজু ভাই ও পরিবার');
      expect(r301.memberName).toBe('রাজু ভাই');
      expect(r301.memberPhone).toBe('01711111111');
      expect(r301.memberIds).toEqual([1]);
    });

    it('populates shared room occupants for multiple members', () => {
      const result = syncHotelRoomsWithMembers(rooms, members);
      const r702 = result.find((r) => r.roomNo === '702');
      expect(r702.occupants).toBe('সোহাগ রানা ও আলমগীর ভাই (শেয়ার্ড)');
      expect(r702.memberName).toBe('সোহাগ রানা');
      expect(r702.memberIds).toEqual([9, 10]);
    });
  });
});
