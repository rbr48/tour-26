package com.izhaanintellect.tour2026;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {

    /**
     * Triggers Android's native PrintManager service.
     * Launches the system print dialog allowing the user to either:
     * 1. Save directly as a vector PDF ("Save as PDF" / "পিডিএফ হিসেবে সংরক্ষণ")
     * 2. Print directly to any Wi-Fi or Bluetooth printer.
     */
    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                String jobName = call.getString("name", "Tour2026_Document");
                PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) {
                    call.reject("PrintManager service is unavailable on this device");
                    return;
                }

                String html = call.getString("html");
                if (html != null && !html.trim().isEmpty()) {
                    // Create an isolated WebView to render and print the given HTML document
                    WebView printWebView = new WebView(getContext());
                    printWebView.getSettings().setJavaScriptEnabled(true);
                    printWebView.getSettings().setDomStorageEnabled(true);
                    printWebView.getSettings().setDefaultTextEncodingName("UTF-8");
                    printWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            PrintDocumentAdapter adapter;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                adapter = view.createPrintDocumentAdapter(jobName);
                            } else {
                                adapter = view.createPrintDocumentAdapter();
                            }

                            printManager.print(jobName, adapter, new PrintAttributes.Builder()
                                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                    .build());
                            call.resolve(new JSObject().put("success", true));
                        }
                    });
                    printWebView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
                } else {
                    // Print the current active WebView
                    WebView mainWebView = getBridge().getWebView();
                    PrintDocumentAdapter adapter;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        adapter = mainWebView.createPrintDocumentAdapter(jobName);
                    } else {
                        adapter = mainWebView.createPrintDocumentAdapter();
                    }

                    printManager.print(jobName, adapter, new PrintAttributes.Builder()
                            .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build());
                    call.resolve(new JSObject().put("success", true));
                }
            } catch (Exception e) {
                call.reject("Failed to start print job: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Saves a text, CSV or HTML document to app cache and opens Android's system share/save chooser.
     * Allows opening directly in Google Sheets, Microsoft Excel, Drive, or saving to Downloads.
     */
    @PluginMethod
    public void shareOrSaveFile(PluginCall call) {
        String fileName = call.getString("fileName", "document.txt");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType", "text/plain");

        if (content == null) {
            call.reject("File content cannot be null");
            return;
        }

        try {
            File cacheDir = getContext().getExternalCacheDir();
            if (cacheDir == null) {
                cacheDir = getContext().getCacheDir();
            }
            File docsDir = new File(cacheDir, "documents");
            if (!docsDir.exists()) {
                docsDir.mkdirs();
            }

            File targetFile = new File(docsDir, fileName);
            try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                fos.write(content.getBytes(StandardCharsets.UTF_8));
            }

            Uri fileUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    targetFile
            );

            Intent sendIntent = new Intent(Intent.ACTION_SEND);
            sendIntent.setType(mimeType);
            sendIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            sendIntent.putExtra(Intent.EXTRA_SUBJECT, fileName);
            sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(sendIntent, "ফাইলটি সংরক্ষণ বা শেয়ার করুন");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("fileName", fileName);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to share/save file: " + e.getMessage(), e);
        }
    }
}
