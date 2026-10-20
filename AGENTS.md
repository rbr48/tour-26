# Rangpur ➔ Cox's Bazar Tour 2026 — Agent Operational Memory & Guidelines

## 1. Architecture

- **Web app**: Vite 8 + React 19 + Tailwind 4 (`src/`). Production output is `dist/`.
- **Server**: `server.js` with modules in `server/`. It serves `dist/` and the backup API at `/api`. It runs in Docker (`Dockerfile`, `docker-compose.yml`, port `127.0.0.1:8190 → 3000`).
- **Data**: Firestore project `tour-26` (`asia-south1`). The trip lives in `tours/coxsbazar2026`. Each list is a subcollection: `itinerary`, `members`, `expenses`, `checklist`, `notices`, `posts`, `channels/{general|food|sightseeing|emergency}/messages`, `locations/{email}`, `profiles/{email}`. Schema marker: `schemaVersion: 2`.
- **Access**: Google sign-in only. Family allowlist: Firestore `config/access` with `emails` and `admins` (set in the Firebase console; family members can read it, nobody can change it from the app). The server has its own allowlist in the `ALLOWED_EMAILS` environment variable. Keep both lists in sync.
- **Photos**: full-size copies go to the shared Drive folder through the Apps Script webhook. Firestore keeps only a 640px thumbnail per photo (`src/services/photos.js`). A photo post is saved only after its Drive upload succeeds.
- **Money**: `src/utils/ledger.js` is the single source of truth (integer paisa; the fund is a party in the settlement). Do not re-implement it in components.
- **Offline**: Firestore uses IndexedDB persistence. The service worker (`public/sw.js`) caches only the app shell, under a per-build cache name. It never caches `/api` or trip data.
- **Native**: Capacitor 8 Android project in `android/`. Its release build is minified and not debuggable. APK downloads are served at `/Tour2026.apk`.

## 2. Standard Deployment & Mandatory Version Increments

**MANDATORY RULE FOR EVERY APK BUILD**:
Each and every time the Android APK is built and deployed, you MUST increment the version code and version name:
1. Bump `versionCode` (+1) and `versionName` in `android/app/build.gradle`.
2. Update `public/version.json` (`versionCode`, `versionName`, `apkUrl: "https://tour2026.izhaanintellect.fun/Tour2026-v{code}.apk"`).
3. Update `CURRENT_WEB_VERSION` and `CURRENT_WEB_BUILD` in `src/utils/appUpdater.js`.
4. Update the APK download links in `src/App.jsx` (`/Tour2026.apk?v={code}`).
5. After `gradlew assembleRelease`, copy the APK to both `public/Tour2026.apk` and `public/Tour2026-v{code}.apk`, then rebuild the web bundle.

Run from the repository root in PowerShell:

```powershell
# 1. Tests and build
npm test
npm run build

# 2. Sync and build the Android app (release)
npx cap sync
cmd /c "cd /d e:\Projects\Tour\android && gradlew assembleRelease"

# 3. Publish the APK under the name the app links to, then rebuild the web dist
Copy-Item -Path "android/app/build/outputs/apk/release/app-release.apk" -Destination "public/Tour2026.apk" -Force
npm run build

# 4. Archive the web dist and the server
tar -cf dist.tar dist
tar -cf server.tar server.js server package.json

# 5. Upload both archives to the VPS
python3 -c "import subprocess; [subprocess.run(['ssh','banglaqr-vps','cat > /opt/tour2026/'+n], input=open(n,'rb').read(), check=True) for n in ['dist.tar','server.tar']]; print('Uploaded')"

# 6. Unpack, copy into the container, and restart it
ssh banglaqr-vps "cd /opt/tour2026 && tar -xf dist.tar && tar -xf server.tar && docker cp dist/. tour2026-app:/app/dist/ && docker cp server.js tour2026-app:/app/ && docker cp server tour2026-app:/app/ && docker restart tour2026-app"
Remove-Item -Force dist.tar, server.tar
```

Requirements on the VPS:
- `/opt/tour2026/.env` contains `ALLOWED_EMAILS=` with the family Google accounts (comma-separated). Without it, `docker compose` refuses to start and the backup API refuses every request.
- A release keystore is optional. Without `TOUR_RELEASE_KEYSTORE` (and its passwords), the release build is signed with the debug key so that the registered Google Sign-In SHA-1 keeps working. Before publishing to people outside the family, create a release keystore and register its SHA-1 in Firebase.

## 3. Firestore Rules and First-Time Upgrade

The rules in `firestore.rules` deny everyone outside the allowlist. Run them against the emulator with `npm run test:rules` (needs Java).

Upgrade order for the live project (the old app wrote everything into one document):
1. In the Firebase console, create `config/access` with `emails` (lowercase family addresses) and `admins` (the organiser's address). Do this before anything else, or the family will be locked out.
2. Deploy the rules: `npx firebase deploy --only firestore:rules`.
3. Deploy the app and server (section 2).
4. An admin opens the app once. The app moves the old arrays into subcollections (a banner shows progress). Only admins can run this; records keep their original authors. Check the expense totals afterwards.
5. In the Members list, set the coordinator's phone and mark that member with `role: "coordinator"` (the safety screen dials that number). Phone numbers are never stored in the code.

## 4. Rules for Changes

- Never write personal phone numbers, emails, or other private details into source files or the web bundle. Family data lives in Firestore only.
- Never store full-size base64 photos in Firestore. Thumbnails only (`src/services/photos.js`).
- Write single documents (`src/services/tourStore.js`). Do not overwrite whole lists.
- Money, dates, CSV, tides, and member linking have unit tests (`npm test`). Keep them passing.
- The tide table (`src/data/tideSchedule.js`) is hand-entered and not verified. Check it against a local tide table before anyone relies on it for swimming decisions.
- Known open risk, deliberately left unchanged: the Apps Script Drive webhook accepts uploads from anyone who has its URL.

## 5. Feature Modules

- **Family Safety & Beach Compass** (`src/components/FamilySafetyHub.jsx`): live location (one document per person, cleared on request), compass to Hotel Sea Moon and the bus meeting point, siren, dialer for the coordinator (from members) and public emergency numbers.
- **Family Travel Trivia Quiz** (`src/components/TourQuizModal.jsx`).
- **Seat and room maps** (`src/components/BusSeatMap.jsx`, `HotelRoomMap.jsx`): contact numbers are looked up from members by exact name.
- **Discord Discussion Hub** (`src/components/DiscordDiscussion.jsx`): mobile Discord-style drawer, real-time channels, reactions (single reaction per person per message), message deletion, and unified Bengali numeric counters.
- **Media Feed & Reels** (`src/components/InstagramFeed.jsx`, `ReelsPlayerModal.jsx`, `VideoTrimmerModal.jsx`): album galleries, video trimmers up to 3 mins, client-side video caching (`src/utils/localVideoCache.js`), and Apps Script Google Drive backup hub.
- **Member & Deposit Management** (`src/App.jsx`): live deposit breakdown (+/- calculation with quick preset adders and reset button), full-width clean labels, responsive inputs with `inputMode="numeric"`, and event isolation against accidental backdrop dismissals.
- **Native Android** (`android/`): Capacitor plugins for authentication, app lifecycle, geolocation, haptics, network, splash screen, status bar. Back button: modals, drawer, dashboard, exit.
- **Service worker** (`public/sw.js`): build-stamped cache name (`vite.config.js`), network-first navigations, cache-first hashed assets.

## 6. Coding Standards

- Mobile-first layout, Tailwind, high-contrast badges for outdoor daylight use.
- Bengali text and a friendly tone for the family.
- Keep the local-first behaviour: the last known data is shown instantly from `localStorage`, and Firestore's offline cache keeps edits while offline.
