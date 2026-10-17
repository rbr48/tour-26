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
const FAMILY = 'family@example.com';
const ADMIN = 'admin@example.com';
const OTHER_FAMILY = 'cousin@example.com';
const STRANGER = 'stranger@example.com';

let testEnv;

const authed = (email, verified = true) =>
  testEnv.authenticatedContext(`uid-${email}`, { email, email_verified: verified });

const dbFor = (email, verified) => authed(email, verified).firestore();

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'config', 'access'), {
      emails: [FAMILY, ADMIN, OTHER_FAMILY],
      admins: [ADMIN],
    });
    await setDoc(doc(db, TOUR), {
      tourInfo: { title: 'ট্যুর' },
      schemaVersion: 2,
      updatedBy: { uid: 'seed' },
    });
    await setDoc(doc(db, TOUR, 'expenses', '1'), {
      id: 1,
      title: 'বাস',
      amount: 500,
      addedByEmail: FAMILY,
    });
    await setDoc(doc(db, TOUR, 'expenses', '2'), {
      id: 2,
      title: 'নাস্তা',
      amount: 200,
      addedByEmail: OTHER_FAMILY,
    });
    await setDoc(doc(db, TOUR, 'members', '1'), { id: 1, name: 'সদস্য', deposit: 1000 });
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

describe('reading the tour', () => {
  it('lets family members read the tour document', async () => {
    await assertSucceeds(getDoc(doc(dbFor(FAMILY), TOUR)));
  });

  it('blocks signed-in accounts that are not on the family list', async () => {
    await assertFails(getDoc(doc(dbFor(STRANGER), TOUR)));
    await assertFails(getDocs(collection(dbFor(STRANGER), TOUR, 'expenses')));
  });

  it('blocks family accounts whose email is not verified', async () => {
    await assertFails(getDoc(doc(dbFor(FAMILY, false), TOUR)));
  });

  it('blocks anonymous readers', async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymous, TOUR)));
  });

  it('lets family members read the family list but nobody change it', async () => {
    await assertSucceeds(getDoc(doc(dbFor(FAMILY), 'config/access')));
    await assertFails(getDoc(doc(dbFor(STRANGER), 'config/access')));
    await assertFails(setDoc(doc(dbFor(ADMIN), 'config/access'), { emails: [ADMIN], admins: [ADMIN] }));
  });

  it('denies every path that the app does not use', async () => {
    await assertFails(getDoc(doc(dbFor(ADMIN), 'secrets/anything')));
    await assertFails(setDoc(doc(dbFor(ADMIN), 'secrets/anything'), { ok: true }));
  });
});

describe('tour document', () => {
  it('requires the writer to be recorded as updatedBy', async () => {
    const db = dbFor(FAMILY);
    await assertSucceeds(
      setDoc(doc(db, TOUR), { meetingPoint: { name: 'কামারপাড়া' }, updatedBy: { uid: `uid-${FAMILY}` } }, { merge: true }),
    );
    await assertFails(
      setDoc(doc(db, TOUR), { meetingPoint: { name: 'x' }, updatedBy: { uid: 'someone-else' } }, { merge: true }),
    );
  });

  it('never allows deleting the tour document', async () => {
    await assertFails(deleteDoc(doc(dbFor(ADMIN), TOUR)));
  });
});

describe('expenses', () => {
  it('records the author on new expenses and rejects spoofed authors', async () => {
    const db = dbFor(FAMILY);
    await assertSucceeds(
      setDoc(doc(db, TOUR, 'expenses', '3'), { id: 3, title: 'খাবার', amount: 300, addedByEmail: FAMILY }),
    );
    await assertFails(
      setDoc(doc(db, TOUR, 'expenses', '4'), { id: 4, title: 'খাবার', amount: 300, addedByEmail: ADMIN }),
    );
  });

  it('lets family members correct amounts but not change who added them', async () => {
    const db = dbFor(OTHER_FAMILY);
    await assertSucceeds(updateDoc(doc(db, TOUR, 'expenses', '1'), { amount: 550 }));
    await assertFails(updateDoc(doc(db, TOUR, 'expenses', '1'), { addedByEmail: OTHER_FAMILY }));
  });

  it('lets only the author or an admin delete an expense', async () => {
    await assertFails(deleteDoc(doc(dbFor(OTHER_FAMILY), TOUR, 'expenses', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(FAMILY), TOUR, 'expenses', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '2')));
  });
});

describe('members', () => {
  it('lets only admins delete members', async () => {
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'members', '1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'members', '1')));
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
    await assertFails(
      setDoc(doc(db, TOUR, 'posts', '4'), { id: 4, authorEmail: FAMILY, thumb: 'x'.repeat(150001) }),
    );
    await assertFails(
      setDoc(doc(db, TOUR, 'posts', '5'), { id: 5, authorEmail: FAMILY, image: 'x'.repeat(600001) }),
    );
  });

  it('lets other family members like and comment but not rewrite the post', async () => {
    const db = dbFor(OTHER_FAMILY);
    await assertSucceeds(updateDoc(doc(db, TOUR, 'posts', '1'), { likes: ['কাজিন'] }));
    await assertSucceeds(updateDoc(doc(db, TOUR, 'posts', '1'), { comments: [{ id: 1, text: 'সুন্দর' }] }));
    await assertFails(updateDoc(doc(db, TOUR, 'posts', '1'), { caption: 'বদলে গেছে' }));
  });

  it('lets only the author or an admin delete a post', async () => {
    await assertFails(deleteDoc(doc(dbFor(OTHER_FAMILY), TOUR, 'posts', '1')));
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
    const other = dbFor(OTHER_FAMILY);
    await assertSucceeds(updateDoc(doc(other, ...messagePath('food', 'm4')), { reactions: { '👍': [OTHER_FAMILY] } }));
    await assertFails(updateDoc(doc(other, ...messagePath('food', 'm4')), { text: 'বদলে গেছে' }));
  });

  it('lets only the sender or an admin delete a message', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(FAMILY), ...messagePath('general', 'm5')), { id: 'm5', senderEmail: FAMILY, text: 'x', reactions: {} }),
    );
    await assertFails(deleteDoc(doc(dbFor(OTHER_FAMILY), ...messagePath('general', 'm5'))));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), ...messagePath('general', 'm5'))));
  });
});

describe('upgrade import and migration status', () => {
  it('lets admins import migrated expenses with their original author', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR, 'expenses', '50'), {
        id: 50, title: 'পুরনো খরচ', amount: 100, addedByEmail: OTHER_FAMILY, migrated: true,
      }),
    );
  });

  it('does not let ordinary family members import records under someone else\'s name', async () => {
    await assertFails(
      setDoc(doc(dbFor(FAMILY), TOUR, 'expenses', '51'), {
        id: 51, title: 'ভুয়া', amount: 100, addedByEmail: OTHER_FAMILY, migrated: true,
      }),
    );
    await assertFails(
      setDoc(doc(dbFor(FAMILY), TOUR, 'posts', '52'), {
        id: 52, authorEmail: OTHER_FAMILY, thumb: 'x', migrated: true,
      }),
    );
  });

  it('lets admins import migrated posts and chat messages', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN), TOUR, 'posts', '53'), { id: 53, authorEmail: OTHER_FAMILY, thumb: 'x', migrated: true, likes: [], comments: [] }),
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
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'locations', OTHER_FAMILY), { lat: 0, lng: 0 }));
    await assertSucceeds(setDoc(doc(dbFor(FAMILY), TOUR, 'profiles', FAMILY), { displayName: 'ফ্যামিলি' }));
    await assertFails(setDoc(doc(dbFor(FAMILY), TOUR, 'profiles', OTHER_FAMILY), { displayName: 'ভুয়া' }));
  });

  it('lets admins fix other profiles (used by the one-time upgrade)', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ADMIN), TOUR, 'profiles', OTHER_FAMILY), { displayName: 'কাজিন' }));
  });

  it('lets people delete only their own location, while admins can clear any', async () => {
    await setDoc(doc(dbFor(OTHER_FAMILY), TOUR, 'locations', OTHER_FAMILY), { lat: 1, lng: 1 });
    await assertFails(deleteDoc(doc(dbFor(FAMILY), TOUR, 'locations', OTHER_FAMILY)));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN), TOUR, 'locations', OTHER_FAMILY)));
  });
});
