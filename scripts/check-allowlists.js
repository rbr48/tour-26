#!/usr/bin/env node
/**
 * Verifies that the family allowlist in Firestore (config/access)
 * matches the server's ALLOWED_EMAILS environment variable.
 */

import fs from 'node:fs';
import path from 'node:path';

function loadAllowedEmails() {
  if (process.env.ALLOWED_EMAILS) {
    return process.env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  }

  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = /^ALLOWED_EMAILS=(.*)$/.exec(line.trim());
      if (match) {
        return match[1].split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      }
    }
  }

  return [];
}

async function fetchFirestoreAccessEmails() {
  // Read public document config/access via Firebase REST API
  const projectId = 'tour-26';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/access`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        console.log('[check-allowlists] config/access is secured by rules (requires auth token to read directly).');
        return null;
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    const emailsField = data?.fields?.emails?.arrayValue?.values || [];
    return emailsField.map((v) => (v.stringValue || '').toLowerCase()).filter(Boolean);
  } catch (err) {
    console.warn(`[check-allowlists] Could not fetch remote config/access: ${err.message}`);
    return null;
  }
}

async function main() {
  const serverEmails = loadAllowedEmails();
  console.log(`[check-allowlists] Server ALLOWED_EMAILS contains ${serverEmails.length} addresses.`);

  if (serverEmails.length === 0) {
    console.warn('[check-allowlists] WARNING: No ALLOWED_EMAILS found in environment or .env file.');
  }

  const firestoreEmails = await fetchFirestoreAccessEmails();
  if (!firestoreEmails) {
    console.log('[check-allowlists] Tip: To keep both in sync, ensure every email in Firestore config/access is included in the VPS /opt/tour2026/.env ALLOWED_EMAILS=');
    return;
  }

  const serverSet = new Set(serverEmails);
  const firestoreSet = new Set(firestoreEmails);

  const missingOnServer = firestoreEmails.filter((e) => !serverSet.has(e));
  const missingInFirestore = serverEmails.filter((e) => !firestoreSet.has(e));

  if (missingOnServer.length === 0 && missingInFirestore.length === 0) {
    console.log('[check-allowlists] SUCCESS: Firestore config/access and server ALLOWED_EMAILS are perfectly in sync!');
  } else {
    if (missingOnServer.length > 0) {
      console.error(`[check-allowlists] DISCREPANCY: The following emails are in Firestore but missing from server ALLOWED_EMAILS:\n  ${missingOnServer.join(', ')}`);
    }
    if (missingInFirestore.length > 0) {
      console.error(`[check-allowlists] DISCREPANCY: The following emails are on the server but missing from Firestore config/access:\n  ${missingInFirestore.join(', ')}`);
    }
    process.exit(1);
  }
}

main();
