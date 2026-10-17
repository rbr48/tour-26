// Pure helpers for the records written to Firestore. Kept free of Firebase imports so
// they can be tested on their own.

/** Firestore rejects `undefined` anywhere in a document, so drop it before writing. */
export function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const cleaned = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) cleaned[key] = stripUndefined(item);
    }
    return cleaned;
  }
  return value;
}

/** Reactions used to be counts. Counts cannot say who reacted, so they restart as empty votes. */
export function normalizeReactions(reactions) {
  if (!reactions || typeof reactions !== 'object') return {};
  return Object.fromEntries(Object.keys(reactions).map((emoji) => [emoji, []]));
}

/** Creation-order number used for IDs and sorting. Fits safely in a JavaScript number. */
export const newRecordId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
