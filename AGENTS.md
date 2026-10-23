# Rangpur ➔ Cox's Bazar Tour 2026 — Agent Operational Memory & Guidelines

## 1. Architecture & Tech Stack

- **Web app**: Vite 8 + React 19 + Tailwind 4 (`src/`). Production output is `dist/`.
- **Server**: Node.js HTTP server in `server.js` with modules in `server/`. It serves `dist/` and the authenticated API under `/api`. Runs in Docker container `tour2026-app` on VPS (`Dockerfile`, `docker-compose.yml`, internal port 3000 mapped to host 127.0.0.1:8190 behind Nginx/Cloudflare).
- **Data (Firestore Asia-South1, project `tour-26`)**:
  - The trip root document is `tours/coxsbazar2026`.
  - Subcollections: `itinerary`, `members`, `expenses`, `checklist`, `notices`, `posts`, `channels/{general|food|sightseeing|emergency|plans}/messages`, `locations/{email}`, `profiles/{email}`.
  - Schema marker: `schemaVersion: 2`.
- **Access & Authentication**:
  - Google sign-in only. Per project requirements, **any valid Google account can sign in and enjoy the app** (reading tour data, posting media, joining chats, recording locations, updating their profile).
  - Administrative collections (`expenses`, `members`, `itinerary`, `checklist`, `notices`) are strictly restricted to admin (`rajbrur@gmail.com` and `config/access.admins`).
  - **CRITICAL**: Never require `email_verified == true` or restrict `posts` by strict email allowlists in `firestore.rules` or `server/firebase-auth.js`. Mobile Android Google Sign-In tokens frequently omit or lag `email_verified`, which previously broke post creation (`সংরক্ষণ হয়নি: আপনার এই কাজটি করার অনুমতি নেই।`).
- **Money**: `src/utils/ledger.js` is the single source of truth (integer paisa; the fund is a party in settlement). Unit tested in `src/utils/ledger.test.js`.
- **Offline & Local-First**: IndexedDB persistence for Firestore. Service worker (`public/sw.js`) caches app shell only under a per-build cache name. Post creation offline queues to IndexedDB (`src/utils/offlineQueue.js`) and auto-drains upon reconnect.
- **Native Android**: Capacitor 8 project in `android/`. Uses ProGuard minification in release. Releases are served directly at `/Tour2026.apk` and `/Tour2026-v{code}.apk`.

---

## 2. Media & Reels Tiered Storage Architecture

Reels videos up to 3 minutes (180s) can be up to 400MB from high-resolution phone cameras. The app uses a resilient tiered pipeline:

1. **Chunked Upload ([src/utils/reelUploader.js](file:///d:/Software_and_Apps/Tour-2026/src/utils/reelUploader.js))**:
   - Files > 5MB are split into 8MB chunks (`CHUNK_SIZE = 8 * 1024 * 1024`), bypassing Cloudflare's 100MB body limit.
   - Upload concurrency is limited to 2 by `src/utils/uploadQueue.js` to prevent mobile network socket exhaustion.
   - Resumable upload checkpoints are persisted in IndexedDB and localStorage by `src/utils/mediaUploadCheckpoint.js`.
   - Uses a deterministic session `uploadId` (`up_${postId}`) so retries don't re-upload already uploaded chunks.
   - Timeouts: 120s for single uploads, 150s for intermediate chunks, 240s for final chunk assembly/compression.
   - On final chunk timeout/drop, client polls `GET /api/upload?uploadId=...` to automatically recover completed uploads without re-uploading.
2. **Server Assembly & Race-Condition Lock ([server/app.js](file:///d:/Software_and_Apps/Tour-2026/server/app.js))**:
   - `activeAssemblies` and `completedUploads` in-memory maps prevent duplicate assembly and race conditions.
   - If an assembly is in progress or completed when a retry chunk arrives, the server returns the cached result instead of failing with `Missing chunk 0`.
3. **FFmpeg Video Compression ([server/video-compressor.js](file:///d:/Software_and_Apps/Tour-2026/server/video-compressor.js))**:
   - Compresses raw video to 720p H.264 vertical HD (`-preset veryfast -threads 0 -crf 23 -c:a aac -b:a 128k -movflags +faststart`).
   - Cuts raw file size by 75-90% with instant progressive playback.
4. **7-Day Hot Storage & Automatic Drive Archiving ([server/reels-archiver.js](file:///d:/Software_and_Apps/Tour-2026/server/reels-archiver.js))**:
   - Recent reels live in hot VPS storage (`data/uploads/`, served via `/uploads/`).
   - Reels older than 7 days are automatically archived to Google Drive via the Apps Script webhook, registered in `data/reels-registry.json`, and deleted from VPS disk.
   - [server/static-files.js](file:///d:/Software_and_Apps/Tour-2026/server/static-files.js) seamlessly issues HTTP 302 redirects to Google Drive stream URLs for archived files.
   - `cleanStaleChunkDirs()` automatically purges abandoned `chunks_*` temporary folders older than 2 hours.

---

## 3. Standard Deployment & Mandatory Version Increments

**MANDATORY RULE FOR EVERY APK BUILD**:
Each and every time the Android APK is built and deployed, you MUST increment the version code (+1) and version name across all 5 files:
1. `android/app/build.gradle`: `versionCode {code}`, `versionName "{name}"`.
2. `public/version.json`: `versionCode: {code}`, `versionName: "{name}"`, `apkUrl: "https://tour2026.izhaanintellect.fun/Tour2026-v{code}.apk"`, release notes and timestamp.
3. `src/utils/appUpdater.js`: `CURRENT_WEB_VERSION = '{name}'`, `CURRENT_WEB_BUILD = {code}`.
4. `src/App.jsx`: `/Tour2026.apk?v={code}` (in download buttons).
5. `server/app.js`: default `versionCode` and `versionName` in `/api/app-version`.

### Exact Build & Deploy Commands (Run from root in PowerShell):

```powershell
# 1. Run full test suite and build web bundle
npm test
npm run build

# 2. Sync Capacitor and build Android release APK
# Note: JAVA_HOME must point to JDK 17
npx cap sync
cmd /c "set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot&& cd /d d:\Software_and_Apps\Tour-2026\android && gradlew assembleRelease"

# 3. Publish APK to public directory and rebuild web bundle
Copy-Item -Path "android/app/build/outputs/apk/release/app-release.apk" -Destination "public/Tour2026.apk" -Force
Copy-Item -Path "android/app/build/outputs/apk/release/app-release.apk" -Destination "public/Tour2026-v{code}.apk" -Force
npm run build

# 4. Create deployment tar archives
tar -cf dist.tar dist
tar -cf server.tar server.js server package.json

# 5. Upload archives to VPS (SFTP is disabled on port 2222; use Python stdin pipe)
python -c "import subprocess; [subprocess.run(['ssh','banglaqr-vps','cat > /opt/tour2026/'+n], input=open(n,'rb').read(), check=True) for n in ['dist.tar','server.tar']]; print('Uploaded')"

# 6. Unpack on VPS, update container, restart, and clean up
ssh banglaqr-vps "cd /opt/tour2026 && tar -xf dist.tar && tar -xf server.tar && docker cp dist/. tour2026-app:/app/dist/ && docker cp server.js tour2026-app:/app/ && docker cp server tour2026-app:/app/ && docker restart tour2026-app && rm dist.tar server.tar"
Remove-Item -Force dist.tar, server.tar

# 7. Commit, tag, and push
git add .
git commit -m "release: v{name} (build {code})"
git tag -a v{name} -m "Release v{name} (Build {code})"
git push origin main --tags
```

---

## 4. Android Native Layer & WebView Specifics

- **Java Environment**: JDK 17 installed at `C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot`.
- **WebView Media Settings ([MainActivity.java](file:///d:/Software_and_Apps/Tour-2026/android/app/src/main/java/com/izhaanintellect/tour2026/MainActivity.java))**:
  - `settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW)` is REQUIRED for HTML5 video, blob URLs, and media playback.
  - Hardware acceleration, DOM storage, and media autoplay without user gesture must remain enabled.
- **PDF Generation & Printing ([src/utils/printHelper.js](file:///d:/Software_and_Apps/Tour-2026/src/utils/printHelper.js))**:
  - Handles audit sheet, journey itinerary, and digital scrapbook printing on both Web and Android WebView.
  - Android uses hidden print iframe / WebView print adapter and `@capacitor/filesystem`. Ensures web fonts and images are fully rendered before triggering `window.print()` to avoid blank sheets.
- **Sharing Links**:
  - NEVER share `localhost` or `http://localhost/#feed`! Universal sharing links must always use the production domain: `https://tour2026.izhaanintellect.fun/#feed` or `#reels`.
- **In-App Updater ([AppUpdatePlugin.java](file:///d:/Software_and_Apps/Tour-2026/android/app/src/main/java/com/izhaanintellect/tour2026/AppUpdatePlugin.java), [AppUpdateModal.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/AppUpdateModal.jsx))**:
  - Custom native download manager with progress tracking and direct package installer intent for seamless updates without Play Store.

---

## 5. Feature Modules Reference

- **Media Feed, Reels & Profile ([InstagramFeed.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/InstagramFeed.jsx), [UserProfileModal.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/UserProfileModal.jsx), [ReelsPlayerModal.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/ReelsPlayerModal.jsx))**:
  - Instagram-style vertical feed (4:5) and explore mosaic (3x3).
  - Multi-image carousel with synchronized image index controls.
  - Video trimmer up to 3 mins (`VideoTrimmerModal.jsx`).
  - Likes, comment sliding sheet, member tagging, and instant client-side video caching (`localVideoCache.js`).
- **Interactive GameZone Hub ([GameZoneHub.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/GameZoneHub.jsx))**:
  - 29 Card Game (`card29Logic.js`) with bidding and trump suit engine.
  - Chess with Minimax AI (`chessLogic.js`, `chessAi.js`).
  - Ludo multiplayer (`ludoLogic.js`).
  - Poker Evaluator (`pokerEvaluator.js`).
  - Haptic feedback (`haptics.js`) and audio synthesizers (`gameAudio.js`).
- **Family Safety & Beach Compass ([FamilySafetyHub.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/FamilySafetyHub.jsx))**:
  - Real-time geolocation bearing to Hotel Sea Moon and bus meetup point.
  - Emergency siren and one-click dialer for coordinators and local emergency hotlines.
- **Discord Discussion Hub ([DiscordDiscussion.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/DiscordDiscussion.jsx))**:
  - Real-time channel chat (`general`, `food`, `sightseeing`, `emergency`, `plans`), single reaction per person, typing indicators, Bengali counters.
- **Seat & Room Maps ([BusSeatMap.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/BusSeatMap.jsx), [HotelRoomMap.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/HotelRoomMap.jsx))**:
  - Interactive bus layout (40 seats) and Hotel Sea Moon room allocations linked to members.
- **Audit Sheet & Digital Scrapbook ([PrintableReport.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/PrintableReport.jsx), [TourScrapbookModal.jsx](file:///d:/Software_and_Apps/Tour-2026/src/components/TourScrapbookModal.jsx))**:
  - Integer paisa ledger accounting, print export, and interactive flipbook magazine.

---

## 6. Rules for Changes & Operational Wisdom

- **Preserve Unit Tests**: Keep all 30 test files and 227+ tests passing (`npm test`). Always run tests before building.
- **Never Hardcode Secrets or PII**: Personal phone numbers, emails, or credentials live in Firestore and environment variables only.
- **Firestore Writes**: Always write discrete documents with field bounds (`tourStore.js`). Never overwrite entire root collections.
- **Responsive & Daylight Readable**: High contrast Tailwind styling, Bengali typography, and tactile active-press animations suitable for outdoor mobile use.
