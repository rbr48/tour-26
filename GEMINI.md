# Rangpur ➔ Cox's Bazar Tour 2026 — Agent Operational Memory & Guidelines

See [AGENTS.md](AGENTS.md) for the complete, definitive architecture, deployment workflow, tiered media storage, and operational memory. The essential summary:

- **Build & Tests**: `npm test` (all 30 test files / 227+ tests must pass), `npm run build`.
- **Mandatory Version Increment**: Every release MUST bump `versionCode` (+1) and `versionName` across `android/app/build.gradle`, `version.json`, `appUpdater.js`, `App.jsx`, and `server/app.js`.
- **Android Release Build**: `npx cap sync`, then `cmd /c "set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot&& cd /d d:\Software_and_Apps\Tour-2026\android && gradlew assembleRelease"`. Copy APK to `public/Tour2026.apk` and `public/Tour2026-v{code}.apk`.
- **VPS Deployment**: Upload `dist.tar` and `server.tar` via Python stdin pipe (`cat > /opt/tour2026/...`) to SSH alias `banglaqr-vps`, unpack, copy to container `tour2026-app`, restart container, and delete local archives.
- **Media & Reels Tiered Storage**: 8MB chunked uploads, IndexedDB resumable checkpoints, 2-worker concurrency queue, server-side `activeAssemblies` / `completedUploads` race lock, FFmpeg 720p `-preset veryfast -threads 0` compression, 7-day hot VPS retention with automatic Google Drive archival and HTTP 302 redirects.
- **Access & Permissions**: Any authenticated Google account can use public features (feed, posts, chats, profile, locations). Admin collections (`expenses`, `members`, `itinerary`, `checklist`, `notices`) strictly restricted to admin.
- **Privacy**: Never commit personal phone numbers, emails, or credentials.
