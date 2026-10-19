const normalizeName = (value) => String(value ?? '').trim().toLowerCase();

/**
 * The member record that belongs to a signed-in person. A profile is linked by member
 * ID when the person has chosen one. Otherwise an exact, case-insensitive name match is
 * used. Partial matches are not, because "আলম" must not pick "আলমগীর".
 */
export function findLinkedMember(members, profile, displayName) {
  if (profile && profile.memberId !== undefined && profile.memberId !== null) {
    const linked = members.find((member) => member.id === profile.memberId);
    if (linked) return linked;
  }
  const name = normalizeName(displayName);
  if (!name) return null;
  return members.find((member) => normalizeName(member.name) === name) ?? null;
}

/** Phone for a member, matched by exact name. Missing or ambiguous names give no number. */
export function phoneForMember(members, name) {
  if (!name) return '';
  const match = members.find((member) => String(member.name ?? '').trim() === String(name).trim());
  return match?.phone || '';
}

/**
 * Resolves a friendly display name for a commenter.
 * Prioritizes:
 * 1. Current user's profile/auth displayName if commenting or viewing own comment
 * 2. userProfiles document matching commenter's email
 * 3. Member matching commenter's email or linked memberId
 * 4. Existing non-generic comment.user / comment.author
 * 5. Readable name derived from authorEmail
 * 6. Fallback 'পরিবারের সদস্য'
 */
export function resolveCommenterName(
  comment,
  { userProfiles = {}, members = [], currentUser = null, currentProfile = null } = {},
) {
  if (!comment) return 'পরিবারের সদস্য';

  const authorEmail = typeof comment === 'object' ? String(comment.authorEmail || comment.email || '').toLowerCase().trim() : '';
  const myEmail = String(currentUser?.email || '').toLowerCase().trim();
  const rawUser = typeof comment === 'string' ? String(comment).trim() : String(comment.user || comment.author || '').trim();

  // 1. members list match by email or coordinator fallback (highest priority for family name consistency)
  if (authorEmail && Array.isArray(members)) {
    const matchedMember = members.find((m) => m?.email && m.email.toLowerCase().trim() === authorEmail);
    if (matchedMember?.name) return matchedMember.name.split('/')[0].split('(')[0].trim();
    if (authorEmail.includes('shohag') || authorEmail.includes('admin') || authorEmail.includes('izhaan')) {
      const coord = members.find((m) => m?.role === 'coordinator' || m?.name?.includes('কো-অর্ডিনেটর'));
      if (coord?.name) return coord.name.split('/')[0].split('(')[0].trim();
    }
  }

  // 2. userProfiles match by authorEmail
  if (authorEmail && userProfiles) {
    const profile =
      userProfiles[authorEmail] ||
      Object.values(userProfiles).find((p) => String(p?.email || p?.id || '').toLowerCase().trim() === authorEmail);
    if (profile?.displayName?.trim()) return profile.displayName.trim();
    if (profile?.nickname?.trim()) return profile.nickname.trim();
    if (profile?.memberId !== undefined && profile?.memberId !== null && Array.isArray(members)) {
      const m = members.find((mem) => String(mem.id) === String(profile.memberId));
      if (m?.name) return m.name.split('/')[0].split('(')[0].trim();
    }
  }

  // 3. Match rawUser against member names (e.g. "Shohag Rana" matches "মো: সোহাগ রানা / Shohag Rana")
  if (rawUser && rawUser !== 'পরিবারের সদস্য' && rawUser !== 'সদস্য' && Array.isArray(members)) {
    const matchedByName = members.find((m) => {
      if (!m?.name) return false;
      const mName = m.name.toLowerCase();
      const rName = rawUser.toLowerCase();
      return mName.includes(rName) || rName.includes(mName) || (rName.includes('shohag') && mName.includes('সোহাগ'));
    });
    if (matchedByName?.name) return matchedByName.name.split('/')[0].split('(')[0].trim();
  }

  // 4. Current user match
  if (myEmail && authorEmail && authorEmail === myEmail) {
    if (currentProfile?.displayName?.trim()) return currentProfile.displayName.trim();
    if (currentUser?.displayName?.trim()) return currentUser.displayName.trim();
  }

  // 5. Stored user name on comment object (if not the default fallback)
  if (rawUser && rawUser !== 'পরিবারের সদস্য' && rawUser !== 'সদস্য') {
    return rawUser;
  }

  // 6. If posted by current user with fallback user name
  if ((!authorEmail || (myEmail && authorEmail === myEmail)) && currentProfile?.displayName?.trim()) {
    return currentProfile.displayName.trim();
  }

  // 7. Readable name from authorEmail
  if (authorEmail && authorEmail !== 'member@tour.family') {
    const prefix = authorEmail.split('@')[0].replace(/[._-]/g, ' ');
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return rawUser || 'পরিবারের সদস্য';
}

/**
 * Resolves avatar photo URL for a commenter from profiles/user info.
 */
export function resolveCommenterAvatar(
  comment,
  { userProfiles = {}, currentUser = null, currentProfile = null } = {},
) {
  if (!comment) return null;
  const authorEmail = typeof comment === 'object' ? String(comment.authorEmail || comment.email || '').toLowerCase().trim() : '';
  const myEmail = String(currentUser?.email || '').toLowerCase().trim();

  if (myEmail && authorEmail && authorEmail === myEmail) {
    if (currentProfile?.customPhotoURL) return currentProfile.customPhotoURL;
    if (currentProfile?.photoURL) return currentProfile.photoURL;
    if (currentUser?.photoURL) return currentUser.photoURL;
  }

  if (authorEmail && userProfiles) {
    const profile =
      userProfiles[authorEmail] ||
      Object.values(userProfiles).find((p) => String(p?.email || p?.id || '').toLowerCase().trim() === authorEmail);
    if (profile?.customPhotoURL) return profile.customPhotoURL;
    if (profile?.photoURL) return profile.photoURL;
  }

  if (typeof comment === 'object' && comment.userPhoto && !comment.userPhoto.startsWith('data:')) {
    return comment.userPhoto;
  }
  return null;
}

