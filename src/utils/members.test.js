import { describe, expect, it } from 'vitest';
import { findLinkedMember, phoneForMember } from './members';

const members = [
  { id: 1, name: 'আলম', phone: '0100' },
  { id: 2, name: 'আলমগীর ভাই (ফটোগ্রাফার)', phone: '0200' },
  { id: 3, name: 'রাজু ভাই', phone: '0300' },
];

describe('findLinkedMember', () => {
  it('prefers the member chosen by ID', () => {
    expect(findLinkedMember(members, { memberId: 3 }, 'আলম')?.id).toBe(3);
  });

  it('matches an exact name, ignoring case and surrounding spaces', () => {
    expect(findLinkedMember(members, {}, '  রাজু ভাই ')?.id).toBe(3);
  });

  it('never matches a partial name', () => {
    expect(findLinkedMember(members, {}, 'আলমগীর')).toBeNull();
    expect(findLinkedMember([{ id: 2, name: 'আলমগীর ভাই' }], {}, 'আলম')).toBeNull();
  });

  it('returns null without a name or a usable ID', () => {
    expect(findLinkedMember(members, { memberId: 99 }, '')).toBeNull();
    expect(findLinkedMember(members, undefined, undefined)).toBeNull();
  });
});

describe('phoneForMember', () => {
  it('returns the phone for an exact name', () => {
    expect(phoneForMember(members, 'রাজু ভাই')).toBe('0300');
  });

  it('returns nothing for unknown or partial names', () => {
    expect(phoneForMember(members, 'রাজু')).toBe('');
    expect(phoneForMember(members, undefined)).toBe('');
  });
});
