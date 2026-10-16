# Rangpur ➔ Cox's Bazar Tour 2026 — Agent Operational Memory & Guidelines

See [AGENTS.md](AGENTS.md) for full architecture and guidelines.

## Quick Deployment Commands
```powershell
npm run build
npx cap sync
cmd /c "cd /d e:\Projects\Tour\android && gradlew assembleDebug"
Copy-Item -Path "android/app/build/outputs/apk/debug/app-debug.apk" -Destination "public/Tour2026.apk" -Force
npm run build
tar -cf dist.tar dist

# Upload & Reload
python3 -c "import subprocess; data = open('dist.tar', 'rb').read(); p = subprocess.Popen(['ssh', 'banglaqr-vps', 'cat > /opt/tour2026/dist.tar'], stdin=subprocess.PIPE); p.communicate(input=data); print('Uploaded, code:', p.returncode)"
ssh banglaqr-vps "cd /opt/tour2026 && tar -xf dist.tar && docker cp dist/. tour2026-app:/app/dist/ && docker restart tour2026-app"; Remove-Item -Force dist.tar
```

## Infrastructure Specs
- **VPS Host**: `banglaqr-vps` (configured in local `~/.ssh/config`)
- **Docker Container**: `tour2026-app` on `/opt/tour2026`
- **Live URL**: `https://tour2026.izhaanintellect.fun`
- **Firebase Project**: `tour-26` (`asia-south1`)
- **Google Drive Webhook**: `https://script.google.com/macros/s/AKfycbzdoJLe5hD8Gmx3Q-vISeFAy5GDXs0thbt2DO-3aotJ2gWZlqxEB1fE3FJ2kq2tjdgWlA/exec`
