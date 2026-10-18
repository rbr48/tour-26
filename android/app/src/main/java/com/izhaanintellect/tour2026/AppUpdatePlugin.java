package com.izhaanintellect.tour2026;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    /**
     * Checks if the app is allowed to request package installations.
     * On Android 8.0+ (Oreo), apps require user permission to install unknown apps.
     */
    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
            ret.put("granted", canInstall);
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    /**
     * Opens system settings so the user can grant "Install unknown apps" permission for Tour 2026.
     */
    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                    call.resolve();
                } catch (Exception fallbackErr) {
                    call.reject("Cannot open security settings: " + fallbackErr.getMessage());
                }
            }
        } else {
            call.resolve();
        }
    }

    /**
     * Downloads the APK file from the server with real-time progress callbacks,
     * and automatically launches the Android package installer.
     */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("APK URL is required");
            return;
        }

        executor.execute(() -> {
            File tempApk = null;
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.connect();

                int responseCode = conn.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) {
                    call.reject("Server responded with HTTP " + responseCode);
                    return;
                }

                int totalBytes = conn.getContentLength();
                File cacheDir = getContext().getExternalCacheDir();
                if (cacheDir == null) {
                    cacheDir = getContext().getCacheDir();
                }
                tempApk = new File(cacheDir, "Tour2026_update.apk");
                if (tempApk.exists()) {
                    tempApk.delete();
                }

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(tempApk)) {
                    byte[] buffer = new byte[16384];
                    int bytesRead;
                    int downloadedBytes = 0;
                    long lastNotifyTime = 0;

                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                        downloadedBytes += bytesRead;

                        long now = System.currentTimeMillis();
                        if (now - lastNotifyTime > 150 || downloadedBytes == totalBytes) {
                            lastNotifyTime = now;
                            int percent = totalBytes > 0 ? (int) ((downloadedBytes * 100L) / totalBytes) : -1;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            progress.put("bytesDownloaded", downloadedBytes);
                            progress.put("totalBytes", totalBytes);
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                    out.flush();
                }

                File finalApk = tempApk;
                getActivity().runOnUiThread(() -> {
                    try {
                        installApkFile(finalApk);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("path", finalApk.getAbsolutePath());
                        call.resolve(ret);
                    } catch (Exception e) {
                        call.reject("Failed to open package installer: " + e.getMessage());
                    }
                });

            } catch (Exception e) {
                if (tempApk != null && tempApk.exists()) {
                    tempApk.delete();
                }
                call.reject("Download failed: " + e.getMessage());
            }
        });
    }

    /**
     * Launches the system package installer for an already downloaded APK file.
     */
    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        File file;
        if (path != null && !path.isEmpty()) {
            file = new File(path);
        } else {
            File cacheDir = getContext().getExternalCacheDir();
            if (cacheDir == null) cacheDir = getContext().getCacheDir();
            file = new File(cacheDir, "Tour2026_update.apk");
        }

        if (!file.exists()) {
            call.reject("APK file does not exist at: " + file.getAbsolutePath());
            return;
        }

        try {
            installApkFile(file);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to trigger installer: " + e.getMessage());
        }
    }

    private void installApkFile(File apkFile) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}
