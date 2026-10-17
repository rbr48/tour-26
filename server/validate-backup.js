const ARRAY_KEYS = ['itinerary', 'members', 'expenses', 'checklist', 'notices', 'posts'];
const OBJECT_KEYS = ['tourInfo', 'meetingPoint', 'discussions', 'familyLocations', 'userProfiles'];

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Returns a problem description, or null when the backup has the expected shape. */
export function validateBackup(document) {
  if (!isPlainObject(document)) {
    return 'backup must be a JSON object';
  }
  if (!isPlainObject(document.tourInfo)) {
    return 'tourInfo is required';
  }
  for (const key of ARRAY_KEYS) {
    if (key in document && !Array.isArray(document[key])) {
      return `${key} must be an array`;
    }
  }
  for (const key of OBJECT_KEYS) {
    if (key in document && document[key] !== null && !isPlainObject(document[key])) {
      return `${key} must be an object`;
    }
  }
  return null;
}
