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
