# Rangpur ➔ Cox's Bazar Tour 2026 — Agent Operational Memory & Guidelines

See [AGENTS.md](AGENTS.md) for the full architecture, deployment steps, the first-time upgrade, and the rules for changes. The short version:

- Build, test: `npm test`, `npm run build`, `npm run test:rules` (rules need Java).
- Version increment: MANDATORY to bump `versionCode` (+1) and `versionName` in `android/app/build.gradle`, `version.json`, `appUpdater.js`, and `App.jsx` on every build/release.
- Deploy: follow section 2 of AGENTS.md. The server needs `ALLOWED_EMAILS` in `/opt/tour2026/.env`.
- Firestore: project `tour-26` (`asia-south1`); trip document `tours/coxsbazar2026`; allowlist `config/access`.
- Never put personal phone numbers or emails in code. Never store full-size photos in Firestore.
