package com.izhaanintellect.tour2026;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
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

    // Retain strong reference to prevent premature garbage collection during print job spooling
    private WebView printWebView;

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
                    ViewGroup rootView = getActivity().findViewById(android.R.id.content);
                    if (printWebView != null) {
                        try {
                            if (rootView != null) {
                                rootView.removeView(printWebView);
                            }
                            printWebView.stopLoading();
                            printWebView.destroy();
                        } catch (Exception ignored) {}
                        printWebView = null;
                    }

                    // Create dedicated off-screen printing WebView
                    printWebView = new WebView(getContext());
                    WebSettings settings = printWebView.getSettings();
                    settings.setJavaScriptEnabled(true);
                    settings.setDomStorageEnabled(true);
                    settings.setDefaultTextEncodingName("UTF-8");
                    settings.setAllowFileAccess(true);
                    settings.setAllowContentAccess(true);
                    settings.setLoadWithOverviewMode(true);
                    settings.setUseWideViewPort(true);

                    // Use SOFTWARE layer for print rasterization to avoid hardware acceleration blank preview bugs
                    printWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

                    // Attach to view hierarchy with standard printable dimensions (invisible to user)
                    // This forces Android's view system to measure and lay out the DOM tree, preventing blank pages
                    int width = 1080;
                    int height = 1920;
                    printWebView.setVisibility(View.INVISIBLE);
                    if (rootView != null) {
                        rootView.addView(printWebView, new ViewGroup.LayoutParams(width, height));
                    }
                    printWebView.measure(
                            View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
                            View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
                    );
                    printWebView.layout(0, 0, width, height);

                    printWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            // Delay slightly to ensure layout rendering, images, and font calculations stabilize
                            view.postDelayed(() -> {
                                try {
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
                                } catch (Exception ex) {
                                    call.reject("Failed to trigger print spooler: " + ex.getMessage(), ex);
                                }
                            }, 350);
                        }
                    });

                    printWebView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
                } else {
                    // Fallback: print active WebView directly
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
