# রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬

A private app for one family's trip: itinerary, shared photos, family chat, the expense fund with settlements, seat and room plans, notices, packing checklist, and beach safety tools. It works as a web app and as an Android app (Capacitor).

## Quick start

```bash
npm ci            # install exactly what package-lock.json specifies
npm run dev       # local development (the backup API is proxied to localhost:3000)
npm test          # unit and server tests
npm run test:rules   # Firestore rules against the emulator (needs Java)
npm run build     # production build into dist/
npm run lint      # oxlint
```

Run the server locally with `ALLOWED_EMAILS=you@example.com node server.js` after `npm run build`.

## Security model

- Only Google accounts on the family list can read or change trip data. The list lives in Firestore (`config/access`) and in the server's `ALLOWED_EMAILS` variable.
- Firestore rules enforce ownership: people can edit only their own profile and location, and only the author can delete their photo, message, or expense.
- The backup API accepts only verified Firebase ID tokens for listed accounts.
- Personal phone numbers are stored only in Firestore. Nothing personal is in the source or the web bundle.

## Deployment

See [AGENTS.md](AGENTS.md) for the deployment procedure, the first-time upgrade from the single-document data layout, and the rules for changes.
