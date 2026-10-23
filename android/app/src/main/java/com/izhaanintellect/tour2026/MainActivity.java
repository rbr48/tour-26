package com.izhaanintellect.tour2026;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(NativePrintPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        customizeNativeWebView();
    }

    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String channelId = "tour_2026_channel";
            CharSequence name = "ট্যুর ২০২৬ নোটিফিকেশন";
            String description = "জরুরি নোটিশ, ফটো আপডেট, আলোচনা ও খরচ সংক্রান্ত তথ্য";
            int importance = android.app.NotificationManager.IMPORTANCE_HIGH;
            android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        customizeNativeWebView();
    }

    private void customizeNativeWebView() {
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();

            // Disable overscroll glow and bounce for true native Android feeling
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

            // Configure advanced native webview settings
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setGeolocationEnabled(true);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setSupportZoom(false);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // Essential for Reels and HTML5 video playback in native Android
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);

            // Hardware acceleration for smooth 60fps video playback
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }
    }
}
