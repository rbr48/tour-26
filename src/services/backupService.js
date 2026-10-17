import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';

// The web app talks to its own server. The Android app runs from a local origin and
// needs the absolute address of the server.
export const BACKUP_API_URL = Capacitor.isNativePlatform()
  ? 'https://tour2026.izhaanintellect.fun/api'
  : '/api';

/** Sends a copy of the trip to the family server. The server accepts only family accounts. */
export async function saveBackup(snapshot) {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, reason: 'signed-out' };
  }
  const token = await user.getIdToken();
  const response = await fetch(BACKUP_API_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  });
  if (response.ok) {
    return { ok: true };
  }
  return { ok: false, reason: response.status === 413 ? 'too-large' : 'failed', status: response.status };
}
