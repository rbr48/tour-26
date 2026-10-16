# Rangpur ➔ Cox's Bazar Tour 2026 — Agent Operational Memory & Guidelines

## 1. Server, Infrastructure & Deployment Architecture

### VPS Details
- **Host Alias**: `banglaqr-vps` (configured in local `~/.ssh/config`)
- **Web App Directory**: `/opt/tour2026/`
- **Docker Container**: `tour2026-app` (Mapped port `8190:3000`)
- **Live Public Domain**: `https://tour2026.izhaanintellect.fun` (Proxied via Cloudflare)

### Standard Deployment Procedure
Whenever updating and deploying the application to production, use this exact workflow:

```powershell
# 1. Build web application for production
npm run build

# 2. Sync assets to Capacitor Android
npx cap sync

# 3. Compile Android APK with Gradle
cmd /c "cd /d e:\Projects\Tour\android && gradlew assembleDebug"

# 4. Copy fresh APK to public and rebuild web dist
Copy-Item -Path "android/app/build/outputs/apk/debug/app-debug.apk" -Destination "public/Tour2026.apk" -Force
npm run build

# 5. Archive dist folder
tar -cf dist.tar dist

# 6. Stream upload dist.tar to VPS and reload container
python3 -c "import subprocess; data = open('dist.tar', 'rb').read(); p = subprocess.Popen(['ssh', 'banglaqr-vps', 'cat > /opt/tour2026/dist.tar'], stdin=subprocess.PIPE); p.communicate(input=data); print('Uploaded, code:', p.returncode)"
ssh banglaqr-vps "cd /opt/tour2026 && tar -xf dist.tar && docker cp dist/. tour2026-app:/app/dist/ && docker restart tour2026-app"; Remove-Item -Force dist.tar
```

---

## 2. Cloud Backends & Zero-Auth Google Drive Uploads

### Firebase Cloud Backend
- **Project**: `tour-26`
- **Region**: `asia-south1`
- **Document Path**: `tours/coxsbazar2026`
- **Strict Constraint**: Firestore documents have a hard 1 MB (1,048,576 bytes) limit. Large base64 image strings MUST NOT be stored in Firestore! Always use image compression and sanitize data before pushing (`sanitizeAndCompressTourData` in `src/utils/imageCompressor.js`).

### Google Drive Integration (Zero-Auth Webhook)
- **Drive Folder ID**: `1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM`
- **Apps Script Webhook**: `https://script.google.com/macros/s/AKfycbzdoJLe5hD8Gmx3Q-vISeFAy5GDXs0thbt2DO-3aotJ2gWZlqxEB1fE3FJ2kq2tjdgWlA/exec`
- **Flow**: Any user uploading photos to InstagramFeed sends multipart base64 directly to the Google Apps Script Webhook. It uploads directly into the shared tour folder without requiring OAuth authentication from members.

---

## 3. Superpower Modules (Option C)

- **AI Tour Copilot & Beach Guide (`src/components/AITourGuideModal.jsx`)**:
  - Interactive expert on Cox's Bazar, Marine Drive, Himchari, Inani, and local delicacies.
  - Speech synthesis (Bengali TTS) and automated Bengali photo caption generator.
- **Family Safety & Beach Compass (`src/components/FamilySafetyHub.jsx`)**:
  - Real-time GPS location sharing across the family dashboard.
  - Rotating compass needle calculating dynamic bearing & distance towards Hotel Sea Moon & Evergreen Bus.
  - Web Audio synthesized emergency siren and quick dialer for Tour Lead (Sohag Rana: `01749-064887`) and Tourist Police (`01320-163599` / `999`).
- **Smart Fund & bKash / Nagad Instant Deposit (`src/components/BkashDepositModal.jsx`)**:
  - 1-click account copy and TrxID submission.
  - Submissions automatically update Splitwise member balances and financial audit reports.
- **Family Travel Trivia Quiz (`src/components/TourQuizModal.jsx`)**:
  - 8-round interactive tour quiz with explanations, celebratory audio, and digital champion certificates.
- **PWA Offline Service Worker (`public/sw.js`)**:
  - Cache-first strategy for beach usage with low or zero network connectivity.
- **Android APK Package (`public/Tour2026.apk`)**:
  - Standalone compiled APK bundle directly downloadable from the web app header.

---

## 4. Coding & Design Standards
- **UI & Layout**: Mobile-first responsive design, Tailwind CSS, high-contrast badges for bright daylight outdoor readability on the beach.
- **Language**: Bengali language typography and friendly tone tailored for a family tour.
- **State Integrity**: Always preserve local-first fallback (`localStorage`) synchronized with real-time Firebase listeners.
