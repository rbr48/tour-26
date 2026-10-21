import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const here = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(here, '..', '..', 'firestore.rules'), 'utf8');

const TOUR = 'tours/coxsbazar2026';
const ADMIN = 'admin@example.com';
const FAMILY = 'family@example.com';
const OTHER = 'cousin@example.com';
const STRANGER = 'stranger@example.com';

let testEnv;

const authed = (email, verified = true) =>
  testEnv.authenticatedContext(`uid-${email}`, { email, email_verified: verified });

const dbFor = (email, verified) => authed(email, verified).firestore();

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'config', 'access'), { admins: [ADMIN] });
    await setDoc(doc(db, TOUR), {
      tourInfo: { title: 'ট্যুর' },
      schemaVersion: 2,
      updatedBy: { uid: 'seed' },
    });
    await setDoc(doc(db, TOUR, 'expenses', '1'), { id: 1, title: 'বাস', amount: 500, addedByEmail: FAMILY });
    await setDoc(doc(db, TOUR, 'expenses', '2'), { id: 2, title: 'নাস্তা', amount: 200, addedByEmail: OTHER });
    await setDoc(doc(db, TOUR, 'members', '1'), { id: 1, name: 'সদস্য', deposit: 1000 });
    await setDoc(doc(db, TOUR, 'itinerary', '1'), { id: 1, title: 'দিন ১', done: false, notes: '' });
    await setDoc(doc(db, TOUR, 'notices', '1'), { id: 1, title: 'নোটিশ', content: 'সতর্কতা' });
    await setDoc(doc(db, TOUR, 'posts', '1'), {
      id: 1,
      authorEmail: FAMILY,
      caption: 'ছবি',
      thumb: 'data:image/jpeg;base64,AAAA',
      likes: [],
      comments: [],
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'tour-26',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

describe('access', () => {
  it('lets any verified Google account read the trip', async () => {
    await assertSucceeds(getDoc(doc(dbFor(STRANGER), TOUR)));
    await assertSucceeds(getDocs(collection(dbFor(STRANGER), TOUR, 'expenses')));
  });

  it('blocks accounts whose email is not verified', async () => {
    await assertFails(getDoc(doc(dbFor(STRANGER, false), TOUR)));
  });

  it('blocks anonymous readers and writers', async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymous, TOUR)));
    await assertFails(setDoc(doc(anonymous, TOUR, 'checklist', 'x'), { id: 'x', title: 'টর্চ' }));
  });

  it('lets signed-in accounts read the admin list but nobody change it', async () => {
    await assertSucceeds(getDoc(doc(dbFor(STRANGER), 'config/access')));
    await assertFails(setDoc(doc(dbFor(ADMIN), 'config/access'), { admins: [STRANGER] }));
  });

  it('denies every path that the app does not use', async () => {
    await assertFails(getDoc(doc(dbFor(ADMIN), 'secrets/anything')));
    await assertFails(setDoc(doc(dbFor(ADMIN), 'secrets/anything'), { ok: true }));
  });
});

describe('tour document', () => {
  it('lets only admins change the trip details, recorded as updatedBy', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR), { meetingPoint: { name: 'কামারপাড়া' }, updatedBy: { uid: `uid-${ADMIN}` } }, { merge: true }),
    );
    await assertFails(
      setDoc(doc(dbFor(FAMILY), TOUR), { meetingPoint: { name: 'x' }, updatedBy: { uid: `uid-${FAMILY}` } }, { merge: true }),
    );
  });

  it('rejects an admin write that names someone else as updatedBy', async () => {
    await assertFails(
      setDoc(doc(dbFor(ADMIN), TOUR), { meetingPoint: { name: 'x' }, updatedBy: { uid: 'someone-else' } }, { merge: true }),
    );
  });

  it('never allows deleting the tour document', async () => {
    await assertFails(deleteDoc(doc(dbFor(ADMIN), TOUR)));
  });
});

describe('itinerary', () => {
  it('lets only admins tick an item off', async () => {
    await assertFails(updateDoc(doc(dbFor(STRANGER), TOUR, 'itinerary', '1'), { done: true }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'itinerary', '1'), { done: true }));
  });

  it('lets only admins change the text of an item', async () => {
    await assertFails(updateDoc(doc(dbFor(FAMILY), TOUR, 'itinerary', '1'), { title: 'বদলে গেছে' }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'itinerary', '1'), { title: 'নতুন দিন' }));
  });

  it('lets only admins add or remove items', async () => {
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'itinerary', '2'), { id: 2, title: 'নতুন', done: false }));
    await assertSucceeds(setDoc(doc(dbFor(ADMIN), TOUR, 'itinerary', '2'), { id: 2, title: 'নতুন', done: false }));
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'itinerary', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'itinerary', '1')));
  });
});

describe('members', () => {
  it('lets only admins add, change or remove members', async () => {
    await assertFails(updateDoc(doc(dbFor(FAMILY), TOUR, 'members', '1'), { deposit: 5000 }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'members', '1'), { deposit: 5000 }));
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'members', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'members', '1')));
  });
});

describe('expenses', () => {
  it('lets only admins add expenses, recorded under their own name', async () => {
    await assertFails(
      setDoc(doc(dbFor(FAMILY), TOUR, 'expenses', '3'), { id: 3, title: 'খাবার', amount: 300, addedByEmail: FAMILY }),
    );
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '3'), { id: 3, title: 'খাবার', amount: 300, addedByEmail: ADMIN }),
    );
  });

  it('lets only admins correct an amount', async () => {
    await assertFails(updateDoc(doc(dbFor(FAMILY), TOUR, 'expenses', '1'), { amount: 550 }));
    await assertFails(updateDoc(doc(dbFor(OTHER), TOUR, 'expenses', '1'), { amount: 550 }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '2'), { amount: 250 }));
  });

  it('does not let anyone change who added an expense', async () => {
    await assertFails(updateDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '1'), { addedByEmail: OTHER }));
  });

  it('lets only admins delete an expense', async () => {
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'expenses', '1')));
    await assertFails(deleteDoc(doc(dbFor(OTHER), TOUR, 'expenses', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '2')));
  });
});

describe('notices', () => {
  it('lets only admins post, edit or remove notices', async () => {
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'notices', '2'), { id: 2, title: 'ভুয়া', content: 'x' }));
    await assertFails(updateDoc(doc(dbFor(STRANGER), TOUR, 'notices', '1'), { content: 'বদলে গেছে' }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'notices', '1'), { content: 'আপডেট' }));
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'notices', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'notices', '1')));
  });
});

describe('checklist', () => {
  it('lets only admins add, tick or remove checklist items', async () => {
    await assertFails(setDoc(doc(dbFor(STRANGER), TOUR, 'checklist', 'c1'), { id: 'c1', item: 'টর্চ', checked: false }));
    await assertSucceeds(setDoc(doc(dbFor(ADMIN), TOUR, 'checklist', 'c1'), { id: 'c1', item: 'টর্চ', checked: false }));
    await assertFails(updateDoc(doc(dbFor(FAMILY), TOUR, 'checklist', 'c1'), { checked: true }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'checklist', 'c1'), { checked: true }));
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'checklist', 'c1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'checklist', 'c1')));
  });
});

describe('photo posts', () => {
  it('records the author on new posts and keeps images out of large base64 fields', async () => {
    const db = dbFor(FAMILY);
    await assertSucceeds(
      setDoc(doc(db, TOUR, 'posts', '2'), { id: 2, authorEmail: FAMILY, thumb: 'x'.repeat(1000), likes: [] }),
    );
    await assertFails(
      setDoc(doc(db, TOUR, 'posts', '3'), { id: 3, authorEmail: ADMIN, thumb: 'x', likes: [] }),
    );
    await assertSucceeds(
      setDoc(doc(db, TOUR, 'posts', '6'), { id: 6, authorEmail: FAMILY, thumb: 'x'.repeat(320000), likes: [] }),
    );
    await assertFails(
      setDoc(doc(db, TOUR, 'posts', '4'), { id: 4, authorEmail: FAMILY, thumb: 'x'.repeat(350001) }),
    );
    await assertFails(
      setDoc(doc(db, TOUR, 'posts', '5'), { id: 5, authorEmail: FAMILY, image: 'x'.repeat(600001) }),
    );
  });

  it('lets other accounts like and comment but not rewrite the post', async () => {
    const db = dbFor(OTHER);
    await assertSucceeds(updateDoc(doc(db, TOUR, 'posts', '1'), { likes: ['কাজিন'] }));
    await assertSucceeds(updateDoc(doc(db, TOUR, 'posts', '1'), { comments: [{ id: 1, text: 'সুন্দর' }] }));
    await assertFails(updateDoc(doc(db, TOUR, 'posts', '1'), { caption: 'বদলে গেছে' }));
  });

  it('lets other accounts count a view, but not change anything else in the same write', async () => {
    const db = dbFor(OTHER);
    await assertSucceeds(updateDoc(doc(db, TOUR, 'posts', '1'), { views: 1 }));
    await assertFails(updateDoc(doc(db, TOUR, 'posts', '1'), { views: 2, caption: 'বদলে গেছে' }));
  });

  it('does not let anyone move a post to another author', async () => {
    await assertFails(updateDoc(doc(dbFor(FAMILY), TOUR, 'posts', '1'), { authorEmail: OTHER }));
    await assertFails(updateDoc(doc(dbFor(OTHER), TOUR, 'posts', '1'), { authorEmail: OTHER }));
  });

  it('lets only the author or an admin delete a post', async () => {
    await assertFails(deleteDoc(doc(dbFor(OTHER), TOUR, 'posts', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(FAMILY), TOUR, 'posts', '1')));
  });
});

describe('chat messages', () => {
  const messagePath = (channel, id) => [TOUR, 'channels', channel, 'messages', id];

  it('accepts messages from the sender in known channels only', async () => {
    const db = dbFor(FAMILY);
    await assertSucceeds(
      setDoc(doc(db, ...messagePath('general', 'm1')), { id: 'm1', senderEmail: FAMILY, text: 'হ্যালো', reactions: {} }),
    );
    await assertFails(
      setDoc(doc(db, ...messagePath('general', 'm2')), { id: 'm2', senderEmail: ADMIN, text: 'ভুয়া', reactions: {} }),
    );
    await assertFails(
      setDoc(doc(db, ...messagePath('secret-room', 'm3')), { id: 'm3', senderEmail: FAMILY, text: 'x', reactions: {} }),
    );
  });

  it('lets anyone react but not edit someone else\'s text', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(FAMILY), ...messagePath('food', 'm4')), { id: 'm4', senderEmail: FAMILY, text: 'খাবার', reactions: {} }),
    );
    const other = dbFor(OTHER);
    await assertSucceeds(updateDoc(doc(other, ...messagePath('food', 'm4')), { reactions: { '👍': [OTHER] } }));
    await assertFails(updateDoc(doc(other, ...messagePath('food', 'm4')), { text: 'বদলে গেছে' }));
  });

  it('lets only the sender or an admin delete a message', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(FAMILY), ...messagePath('general', 'm5')), { id: 'm5', senderEmail: FAMILY, text: 'x', reactions: {} }),
    );
    await assertFails(deleteDoc(doc(dbFor(OTHER), ...messagePath('general', 'm5'))));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), ...messagePath('general', 'm5'))));
  });
});

describe('upgrade import and migration status', () => {
  it('lets admins import migrated expenses with their original author', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '50'), {
        id: 50, title: 'পুরনো খরচ', amount: 100, addedByEmail: OTHER, migrated: true,
      }),
    );
  });

  it('does not let ordinary accounts import records under someone else\'s name', async () => {
    await assertFails(
      setDoc(doc(dbFor(FAMILY), TOUR, 'expenses', '51'), {
        id: 51, title: 'ভুয়া', amount: 100, addedByEmail: OTHER, migrated: true,
      }),
    );
    await assertFails(
      setDoc(doc(dbFor(FAMILY), TOUR, 'posts', '52'), {
        id: 52, authorEmail: OTHER, thumb: 'x', migrated: true,
      }),
    );
  });

  it('lets admins import migrated posts and chat messages', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR, 'posts', '53'), { id: 53, authorEmail: OTHER, thumb: 'x', migrated: true, likes: [], comments: [] }),
    );
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR, 'channels', 'general', 'messages', 'old1'), {
        id: 'old1', senderEmail: null, text: 'পুরনো বার্তা', reactions: {}, migrated: true,
      }),
    );
  });

  it('keeps the upgrade status writable only by admins', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ADMIN), TOUR, 'meta', 'migration'), { by: ADMIN, startedAt: 'now' }));
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'meta', 'migration'), { by: FAMILY }));
    await assertSucceeds(getDoc(doc(dbFor(FAMILY), TOUR, 'meta', 'migration')));
  });
});

describe('live location and profiles', () => {
  it('lets each person write only their own location and profile', async () => {
    await assertSucceeds(setDoc(doc(dbFor(FAMILY), TOUR, 'locations', FAMILY), { lat: 21.4, lng: 91.9 }));
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'locations', OTHER), { lat: 0, lng: 0 }));
    await assertSucceeds(setDoc(doc(dbFor(FAMILY), TOUR, 'profiles', FAMILY), { displayName: 'ফ্যামিলি' }));
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'profiles', OTHER), { displayName: 'ভুয়া' }));
  });

  it('lets any verified account read every location and profile (the app listens to whole collections)', async () => {
    await assertSucceeds(getDocs(collection(dbFor(STRANGER), TOUR, 'locations')));
    await assertSucceeds(getDocs(collection(dbFor(STRANGER), TOUR, 'profiles')));
  });

  it('lets admins fix other profiles (used by the one-time upgrade)', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ADMIN), TOUR, 'profiles', OTHER), { displayName: 'কাজিন' }));
  });

  it('lets people delete only their own location, while admins can clear any', async () => {
    await setDoc(doc(dbFor(OTHER), TOUR, 'locations', OTHER), { lat: 1, lng: 1 });
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'locations', OTHER)));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'locations', OTHER)));
  });
});

describe('game zone and typing status (stored under meta)', () => {
  it('lets any verified account create and update game rooms and the room index', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(STRANGER), TOUR, 'meta', 'gameroom_TP-1234'), { id: 'TP-1234', players: [], status: 'waiting' }),
    );
    await assertSucceeds(
      setDoc(doc(dbFor(FAMILY), TOUR, 'meta', 'gamerooms_list'), { 'TP-1234': { id: 'TP-1234' } }, { merge: true }),
    );
    await assertSucceeds(updateDoc(doc(dbFor(OTHER), TOUR, 'meta', 'gameroom_TP-1234'), { status: 'playing' }));
  });

  it('lets any verified account post typing status', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(STRANGER), TOUR, 'meta', 'typing_general'), { stranger_example_com: { name: 'সদস্য', timestamp: 1 } }, { merge: true }),
    );
  });

  it('keeps every other meta document admin-only', async () => {
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'meta', 'something_else'), { ok: true }));
  });
});

describe('field bounds', () => {
  it('rejects negative, oversized and non-numeric expense amounts', async () => {
    const db = dbFor(ADMIN);
    await assertFails(setDoc(doc(db, TOUR, 'expenses', '60'), { id: 60, title: 'ভুল', amount: -5, addedByEmail: FAMILY }));
    await assertFails(setDoc(doc(db, TOUR, 'expenses', '61'), { id: 61, title: 'ভুল', amount: 10000001, addedByEmail: FAMILY }));
    await assertFails(setDoc(doc(db, TOUR, 'expenses', '62'), { id: 62, title: 'ভুল', amount: 'বেশি', addedByEmail: FAMILY }));
    await assertSucceeds(setDoc(doc(db, TOUR, 'expenses', '63'), { id: 63, title: 'ঠিক', amount: 10000000, addedByEmail: FAMILY }));
  });

  it('rejects out-of-range deposits', async () => {
    await assertFails(updateDoc(doc(dbFor(ADMIN), TOUR, 'members', '1'), { deposit: -1 }));
    await assertFails(updateDoc(doc(dbFor(ADMIN), TOUR, 'members', '1'), { deposit: 10000001 }));
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN), TOUR, 'members', '1'), { deposit: 2000 }));
  });

  it('caps checklist item text and post captions', async () => {
    await assertFails(setDoc(doc(dbFor(ADMIN), TOUR, 'checklist', 'long'), { id: 'long', item: 'x'.repeat(501), checked: false }));
    await assertSucceeds(setDoc(doc(dbFor(ADMIN), TOUR, 'checklist', 'ok'), { id: 'ok', item: 'x'.repeat(500), checked: false }));
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'posts', '70'), { id: 70, authorEmail: FAMILY, thumb: 'x', caption: 'x'.repeat(1001), likes: [] }));
  });

  it('accepts chat in the plans channel', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(FAMILY), TOUR, 'channels', 'plans', 'messages', 'p1'), { id: 'p1', senderEmail: FAMILY, text: 'পরিকল্পনা', reactions: {} }),
    );
  });
});
