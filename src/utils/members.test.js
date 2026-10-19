import { describe, expect, it } from 'vitest';
import { findLinkedMember, phoneForMember, resolveCommenterName, resolveCommenterAvatar } from './members';

const members = [
  { id: 1, name: 'আলম', phone: '0100' },
  { id: 2, name: 'আলমগীর ভাই (ফটোগ্রাফার)', phone: '0200' },
  { id: 3, name: 'রাজু ভাই', phone: '0300' },
  { id: 9, name: 'মো: সোহাগ রানা / এম এস রানা (ট্যুর কো-অর্ডিনেটর)', role: 'coordinator', email: 'shohagrana@example.com' },
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

describe('resolveCommenterName', () => {
  it('resolves current user profile display name if user is commentator', () => {
    const comment = { authorEmail: 'shohagrana@example.com', text: 'দারুণ!' };
    const currentProfile = { displayName: 'মো: সোহাগ রানা' };
    const currentUser = { email: 'shohagrana@example.com' };
    expect(resolveCommenterName(comment, { currentProfile, currentUser })).toBe('মো: সোহাগ রানা');
  });

  it('resolves name from userProfiles by email', () => {
    const comment = { authorEmail: 'raju@example.com', user: 'পরিবারের সদস্য', text: 'সুন্দর!' };
    const userProfiles = {
      'raju@example.com': { displayName: 'রাজু আহমেদ' }
    };
    expect(resolveCommenterName(comment, { userProfiles })).toBe('রাজু আহমেদ');
  });

  it('resolves coordinator from members if email matches coordinator', () => {
    const comment = { authorEmail: 'shohagrana@example.com', user: 'পরিবারের সদস্য', text: 'সুন্দর ছবি!' };
    expect(resolveCommenterName(comment, { members })).toBe('মো: সোহাগ রানা');
  });

  it('preserves valid custom author name when not the fallback', () => {
    const comment = { user: 'মাসুদ ভাই', text: 'খুব ভালো' };
    expect(resolveCommenterName(comment)).toBe('মাসুদ ভাই');
  });

  it('falls back to পরিবারের সদস্য when no information is available', () => {
    expect(resolveCommenterName(null)).toBe('পরিবারের সদস্য');
    expect(resolveCommenterName({ user: 'পরিবারের সদস্য' })).toBe('পরিবারের সদস্য');
  });
});

describe('resolveCommenterAvatar', () => {
  it('returns profile customPhotoURL for matched user', () => {
    const comment = { authorEmail: 'user@example.com' };
    const userProfiles = {
      'user@example.com': { customPhotoURL: 'https://example.com/photo.jpg' }
    };
    expect(resolveCommenterAvatar(comment, { userProfiles })).toBe('https://example.com/photo.jpg');
  });
});

