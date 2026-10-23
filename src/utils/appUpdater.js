import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

// Register custom native Android AppUpdate plugin
const NativeAppUpdate = registerPlugin('AppUpdate');

export const CURRENT_WEB_VERSION = '2.31';
export const CURRENT_WEB_BUILD = 31;

/**
 * Returns the version metadata API endpoint URL.
 */
export function getVersionApiUrl() {
  return Capacitor.isNativePlatform()
    ? 'https://tour2026.izhaanintellect.fun/api/app-version'
    : '/api/app-version';
}

/**
 * Checks if a newer version of the app is available on the server.
 * Only applies to native Android APKs; web visitors update via service worker.
 *
 * @returns {Promise<{
 *   hasUpdate: boolean,
 *   currentVersion: string,
 *   currentBuild: number,
 *   serverVersion: string,
 *   serverBuild: number,
 *   apkUrl: string,
 *   apkSize: string,
 *   releaseNotes: string,
 *   forceUpdate: boolean
 * } | null>}
 */
export async function checkForAppUpdate() {
  if (!Capacitor.isNativePlatform()) {
    return {
      hasUpdate: false,
      currentVersion: CURRENT_WEB_VERSION,
      currentBuild: CURRENT_WEB_BUILD,
    };
  }

  try {
    let currentVersion = CURRENT_WEB_VERSION;
    let currentBuild = CURRENT_WEB_BUILD;

    try {
      const info = await App.getInfo();
      if (info?.version) currentVersion = info.version;
      if (info?.build) {
        const parsedBuild = parseInt(info.build, 10);
        if (!isNaN(parsedBuild)) currentBuild = parsedBuild;
      }
    } catch (err) {
      console.warn('Could not read native app info:', err);
    }

    const res = await fetch(getVersionApiUrl(), {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;
    const data = await res.json();

    const serverBuild = parseInt(data.versionCode, 10) || 0;
    const serverVersion = String(data.versionName || serverBuild);
    const hasUpdate = serverBuild > currentBuild;

    return {
      hasUpdate,
      currentVersion,
      currentBuild,
      serverVersion,
      serverBuild,
      apkUrl: data.apkUrl || 'https://tour2026.izhaanintellect.fun/Tour2026.apk',
      apkSize: data.apkSize || '35 MB',
      releaseNotes: data.releaseNotes || 'নতুন ফিচার ও পারফরম্যান্স আপডেট।',
      forceUpdate: Boolean(data.forceUpdate),
    };
  } catch (err) {
    console.warn('App update check failed:', err);
    return null;
  }
}

/**
 * Checks whether Android allows this app to install unknown packages.
 */
export async function canInstallPackages() {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await NativeAppUpdate.canRequestPackageInstalls();
    return Boolean(res?.granted);
  } catch {
    return true;
  }
}

/**
 * Opens system settings so user can toggle "Allow from this source".
 */
export async function openInstallSettings() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeAppUpdate.openInstallPermissionSettings();
  } catch (err) {
    console.warn('Could not open install settings:', err);
  }
}

/**
 * Downloads the APK in background with real-time progress callbacks,
 * then launches the Android package installer.
 *
 * @param {Object} options
 * @param {string} options.apkUrl - URL to download Tour2026.apk
 * @param {function} options.onProgress - Callback ({ percent, bytesDownloaded, totalBytes })
 * @returns {Promise<{ success: boolean, path: string }>}
 */
export async function downloadAndInstallApk({ apkUrl, onProgress }) {
  if (!Capacitor.isNativePlatform()) {
    // On web, open the APK URL in browser to trigger standard download
    window.open(apkUrl, '_blank');
    return { success: true, web: true };
  }

  let listener = null;
  try {
    if (onProgress) {
      listener = await NativeAppUpdate.addListener('downloadProgress', (data) => {
        onProgress(data);
      });
    }

    const result = await NativeAppUpdate.downloadAndInstall({ url: apkUrl });
    return result;
  } finally {
    if (listener) {
      await listener.remove();
    }
  }
}
