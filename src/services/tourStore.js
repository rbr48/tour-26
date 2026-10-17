import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { payerIdFor } from '../utils/ledger';
import { newRecordId, normalizeReactions, stripUndefined } from '../utils/records';
import { isDataImage, makeThumbnail, shrinkProfilePhoto } from './photos';

// Every family document lives under one trip document. Each list is its own
// subcollection, so two people editing different things never overwrite each
// other, and no single document can outgrow the 1 MiB Firestore limit.

export const TOUR_ID = 'coxsbazar2026';
export const SCHEMA_VERSION = 2;
export const CHANNEL_IDS = ['general', 'food', 'sightseeing', 'emergency'];

const ITEM_COLLECTIONS = ['itinerary', 'members', 'expenses', 'checklist', 'notices', 'posts', 'locations', 'profiles'];
const SEED_COLLECTIONS = ['itinerary', 'members', 'checklist', 'notices', 'expenses'];
const LEGACY_KEYS = ['itinerary', 'members', 'expenses', 'checklist', 'notices', 'posts', 'discussions', 'userProfiles', 'familyLocations'];
const MAX_LEGACY_IMAGE_CHARS = 600000;

const tourRef = () => doc(db, 'tours', TOUR_ID);
const collectionRef = (path) => collection(db, 'tours', TOUR_ID, ...path);
const itemRef = (path, id) => doc(db, 'tours', TOUR_ID, ...path, String(id));

/** Writes always record who made them: the rules check this against the signed-in user. */
export function currentActor() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('সাইন-ইন প্রয়োজন');
  }
  return {
    uid: user.uid,
    name: user.displayName || 'পরিবারের সদস্য',
    email: (user.email || '').toLowerCase(),
    photoURL: user.photoURL || null,
  };
}

export const newId = newRecordId;

const normalizeItem = (snapshot) => {
  const data = snapshot.data();
  return { ...data, id: data.id ?? snapshot.id };
};

const keyedBy = (field) => (snapshot) => ({ ...snapshot.data(), [field]: snapshot.id });

const NORMALIZERS = {
  itinerary: normalizeItem,
  members: normalizeItem,
  expenses: normalizeItem,
  checklist: normalizeItem,
  notices: normalizeItem,
  posts: normalizeItem,
  locations: keyedBy('email'),
  profiles: keyedBy('email'),
};

const byOrder = (direction) => (a, b) =>
  direction === 'desc' ? (b.seq ?? 0) - (a.seq ?? 0) : (a.seq ?? 0) - (b.seq ?? 0);

function createState() {
  return {
    tourExists: false,
    tour: null,
    maps: Object.fromEntries(ITEM_COLLECTIONS.map((name) => [name, new Map()])),
    channels: Object.fromEntries(CHANNEL_IDS.map((id) => [id, new Map()])),
    loaded: new Set(),
  };
}

function applyChanges(map, snapshot, normalize) {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'removed') {
      map.delete(change.doc.id);
    } else {
      map.set(change.doc.id, normalize(change.doc));
    }
  });
}

function describeChanges(snapshot, normalize) {
  return snapshot.docChanges().map((change) => ({
    type: change.type,
    id: change.doc.id,
    data: change.type === 'removed' ? null : normalize(change.doc),
    pending: change.doc.metadata.hasPendingWrites,
  }));
}

/** Builds the same `data` shape the screens already use, from the per-document maps. */
function assemble(state) {
  const list = (name, direction = 'asc') => [...state.maps[name].values()].sort(byOrder(direction));
  return {
    tourInfo: state.tour?.tourInfo ?? null,
    meetingPoint: state.tour?.meetingPoint ?? null,
    hotelRooms: state.tour?.hotelRooms ?? null,
    busSeats: state.tour?.busSeats ?? null,
    itinerary: list('itinerary'),
    members: list('members'),
    expenses: list('expenses', 'desc'),
    checklist: list('checklist'),
    notices: list('notices', 'desc'),
    posts: list('posts', 'desc'),
    discussions: Object.fromEntries(
      CHANNEL_IDS.map((id) => [id, [...state.channels[id].values()].sort(byOrder('asc'))]),
    ),
    familyLocations: Object.fromEntries(list('locations', 'desc').map((item) => [item.email, item])),
    userProfiles: Object.fromEntries(list('profiles').map((item) => [item.email, item])),
  };
}

/**
 * Subscribes to the whole trip. `onUpdate` receives the assembled data once every
 * listener has delivered its first snapshot. `onChange` receives per-document changes,
 * which the app uses to announce what other people added.
 */
export function subscribeToTour({ onUpdate, onError, onChange }) {
  const state = createState();
  const expectedSources = 1 + ITEM_COLLECTIONS.length + CHANNEL_IDS.length;
  const unsubscribers = [];

  const publish = () => {
    if (state.loaded.size < expectedSources) return;
    onUpdate({
      data: assemble(state),
      tourExists: state.tourExists,
      legacy: Boolean(state.tour && LEGACY_KEYS.some((key) => key in state.tour)),
      raw: state.tour,
    });
  };

  const handleListenerError = (sourceName, err) => {
    state.loaded.add(sourceName);
    publish();
    onError?.(err);
  };

  unsubscribers.push(
    onSnapshot(
      tourRef(),
      (snapshot) => {
        state.tourExists = snapshot.exists();
        state.tour = snapshot.exists() ? snapshot.data() : null;
        state.loaded.add('tour');
        publish();
      },
      (err) => handleListenerError('tour', err),
    ),
  );

  for (const name of ITEM_COLLECTIONS) {
    const normalize = NORMALIZERS[name];
    unsubscribers.push(
      onSnapshot(
        collectionRef([name]),
        (snapshot) => {
          const initial = !state.loaded.has(name);
          onChange?.({
            collection: name,
            initial,
            fromCache: snapshot.metadata.fromCache,
            changes: describeChanges(snapshot, normalize),
          });
          applyChanges(state.maps[name], snapshot, normalize);
          state.loaded.add(name);
          publish();
        },
        (err) => handleListenerError(name, err),
      ),
    );
  }

  for (const channel of CHANNEL_IDS) {
    const key = `channel:${channel}`;
    unsubscribers.push(
      onSnapshot(
        collectionRef(['channels', channel, 'messages']),
        (snapshot) => {
          const initial = !state.loaded.has(key);
          onChange?.({
            collection: 'messages',
            channel,
            initial,
            fromCache: snapshot.metadata.fromCache,
            changes: describeChanges(snapshot, normalizeItem),
          });
          applyChanges(state.channels[channel], snapshot, normalizeItem);
          state.loaded.add(key);
          publish();
        },
        (err) => handleListenerError(key, err),
      ),
    );
  }

  return () => unsubscribers.forEach((stop) => stop());
}


// ---- Writes -----------------------------------------------------------------

export async function addItem(path, item) {
  const id = item.id ?? newId();
  const record = stripUndefined({ ...item, id, seq: item.seq ?? id });
  await setDoc(itemRef(path, id), record);
  return record;
}

export function setItem(path, id, data) {
  return setDoc(itemRef(path, id), stripUndefined(data), { merge: true });
}

/** `remove` lists fields to delete outright (Firestore rules do not accept null for these). */
export function updateItem(path, id, patch, { remove = [] } = {}) {
  const removals = Object.fromEntries(remove.map((field) => [field, deleteField()]));
  return updateDoc(itemRef(path, id), { ...stripUndefined(patch), ...removals });
}

export function removeItem(path, id) {
  return deleteDoc(itemRef(path, id));
}

export function pushToArray(path, id, field, value) {
  return updateDoc(itemRef(path, id), { [field]: arrayUnion(stripUndefined(value)) });
}

export function pullFromArray(path, id, field, value) {
  return updateDoc(itemRef(path, id), { [field]: arrayRemove(stripUndefined(value)) });
}

/** One reaction per person per message. If already on `emoji`, toggles off. If switching from other emojis, removes them and activates `emoji`. */
export function setReaction(channel, messageId, emoji, email, active, removeEmojis = []) {
  const updates = {};
  if (Array.isArray(removeEmojis)) {
    for (const prev of removeEmojis) {
      if (prev && prev !== emoji) {
        updates[`reactions.${prev}`] = arrayRemove(email);
      }
    }
  }
  updates[`reactions.${emoji}`] = active ? arrayUnion(email) : arrayRemove(email);
  return updateDoc(itemRef(['channels', channel, 'messages'], messageId), updates);
}

export function saveProfile(profile) {
  const actor = currentActor();
  return setDoc(
    doc(db, 'tours', TOUR_ID, 'profiles', actor.email),
    stripUndefined({ ...profile, email: actor.email, uid: actor.uid }),
    { merge: true },
  );
}

export function saveLocation(location) {
  const actor = currentActor();
  return setDoc(
    doc(db, 'tours', TOUR_ID, 'locations', actor.email),
    stripUndefined({ ...location, email: actor.email, uid: actor.uid }),
    { merge: true },
  );
}

export function clearMyLocation() {
  return deleteDoc(doc(db, 'tours', TOUR_ID, 'locations', currentActor().email));
}

export function updateTourDetails(patch) {
  return setDoc(
    tourRef(),
    stripUndefined({ ...patch, updatedAt: new Date().toISOString(), updatedBy: currentActor() }),
    { merge: true },
  );
}

// ---- First-time setup and upgrade ---------------------------------------------

/** Writes starter data for a brand-new trip. Safe to repeat: the document IDs are fixed. */
export async function seedTour(seed) {
  const actor = currentActor();
  const batch = writeBatch(db);
  batch.set(
    tourRef(),
    stripUndefined({
      tourInfo: seed.tourInfo,
      meetingPoint: seed.meetingPoint,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    }),
    { merge: true },
  );
  for (const name of SEED_COLLECTIONS) {
    for (const item of seed[name] ?? []) {
      const extra = name === 'expenses' ? { addedByEmail: actor.email } : {};
      batch.set(itemRef([name], item.id), stripUndefined({ ...item, ...extra, seq: item.id }));
    }
  }
  await batch.commit();
}

async function legacyPostRecord(post, id) {
  const { image, thumb, ...rest } = post;
  const record = {
    ...rest,
    id,
    seq: id,
    migrated: true,
    authorEmail: post.authorEmail ?? null,
    likes: Array.isArray(post.likes) ? post.likes : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    driveBackedUp: Boolean(post.driveBackedUp),
    driveFileId: post.driveFileId ?? null,
    driveViewUrl: post.driveViewUrl ?? null,
  };
  if (isDataImage(image)) {
    record.thumb = await makeThumbnail(image);
    // Photos that never reached Drive keep their full copy until someone syncs them.
    if (!record.driveBackedUp && image.length <= MAX_LEGACY_IMAGE_CHARS) {
      record.image = image;
    }
  } else {
    // A pasted link is kept as it is; the preview falls back to the link itself.
    const link = typeof image === 'string' ? image : thumb;
    if (typeof link === 'string') {
      record.image = link;
      record.thumb = link;
    }
  }
  return stripUndefined(record);
}

async function runWithLimit(tasks, limit, onProgress) {
  let next = 0;
  let failure = null;
  const worker = async () => {
    while (!failure && next < tasks.length) {
      const task = tasks[next];
      next += 1;
      try {
        await task();
      } catch (err) {
        failure = failure ?? err;
        return;
      }
      onProgress?.(next, tasks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  if (failure) throw failure;
}

/** Only one device upgrades at a time; a stale lock (older than ten minutes) is taken over. */
async function claimMigration(actor) {
  const ref = doc(db, 'tours', TOUR_ID, 'meta', 'migration');
  const current = (await getDoc(ref)).data();
  const lockedElsewhere =
    current &&
    !current.completedAt &&
    current.by !== actor.email &&
    Date.now() - Date.parse(current.startedAt ?? 0) < 10 * 60 * 1000;
  if (lockedElsewhere) {
    const error = new Error('আপগ্রেড অন্য একটি ডিভাইসে চলছে');
    error.code = 'MIGRATION_IN_PROGRESS';
    throw error;
  }
  try {
    await setDoc(ref, { by: actor.email, startedAt: new Date().toISOString(), completedAt: null });
  } catch (err) {
    if (err?.code === 'permission-denied') {
      const error = new Error('শুধু অ্যাডমিন তথ্য আপগ্রেড করতে পারবেন');
      error.code = 'NOT_ADMIN';
      throw error;
    }
    throw err;
  }
}

/**
 * Moves the trip from the old whole-document layout (arrays inside one document) into
 * subcollections. Only admins can run it, because the imported records keep their
 * original authors. It is safe to repeat and to interrupt: nothing is removed from the
 * trip document until every write has succeeded. Profiles of other people are kept
 * in place when this admin cannot write them, so they can be upgraded later.
 */
export async function migrateLegacyTour(raw, { onProgress } = {}) {
  const actor = currentActor();
  await claimMigration(actor);
  const members = Array.isArray(raw.members) ? raw.members : [];
  const tasks = [];

  for (const name of ['itinerary', 'members', 'checklist', 'notices']) {
    (raw[name] ?? []).forEach((item, index) => {
      const id = item.id ?? index + 1;
      tasks.push(() => setItem([name], id, { ...item, id, seq: id, migrated: true }));
    });
  }

  (raw.expenses ?? []).forEach((expense, index) => {
    const id = expense.id ?? index + 1;
    tasks.push(() =>
      setItem(['expenses'], id, {
        ...expense,
        id,
        seq: id,
        paidById: payerIdFor(expense, members),
        addedByEmail: expense.addedByEmail ?? null,
        migrated: true,
      }),
    );
  });

  for (const post of raw.posts ?? []) {
    const id = post.id ?? newId();
    tasks.push(async () => {
      const existing = await getDoc(itemRef(['posts'], id));
      if (existing.exists()) return;
      await setDoc(itemRef(['posts'], id), await legacyPostRecord(post, id));
    });
  }

  for (const channel of CHANNEL_IDS) {
    for (const message of raw.discussions?.[channel] ?? []) {
      const id = message.id ?? newId();
      tasks.push(() =>
        setItem(['channels', channel, 'messages'], id, {
          ...message,
          id,
          seq: id,
          senderEmail: message.senderEmail ?? null,
          reactions: normalizeReactions(message.reactions),
          migrated: true,
        }),
      );
    }
  }

  const failedProfiles = [];
  for (const [key, profile] of Object.entries(raw.userProfiles ?? {})) {
    const email = key.toLowerCase();
    tasks.push(async () => {
      try {
        const customPhotoURL = await shrinkProfilePhoto(profile.customPhotoURL);
        await setDoc(
          doc(db, 'tours', TOUR_ID, 'profiles', email),
          stripUndefined({ ...profile, email, customPhotoURL }),
          { merge: true },
        );
      } catch (err) {
        if (email === actor.email) throw err;
        failedProfiles.push(email);
      }
    });
  }

  await runWithLimit(tasks, 6, onProgress);

  const keep = failedProfiles.length > 0 ? ['userProfiles'] : [];
  const update = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  for (const key of LEGACY_KEYS) {
    if (key in raw && !keep.includes(key)) {
      update[key] = deleteField();
    }
  }
  await updateDoc(tourRef(), update);
  await setDoc(doc(db, 'tours', TOUR_ID, 'meta', 'migration'), {
    by: actor.email,
    completedAt: new Date().toISOString(),
    failedProfiles,
  }, { merge: true });
  return { failedProfiles };
}
