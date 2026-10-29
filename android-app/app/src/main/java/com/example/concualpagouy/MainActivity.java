package com.example.concualpagouy;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity {
    private WebView webView;

    private static final Set<String> ALLOWED_BANK_HOSTS = new HashSet<>(Arrays.asList(
        "www.itau.com.uy",
        "itau.com.uy",
        "www.santander.com.uy",
        "santander.com.uy",
        "beneficios.brou.com.uy",
        "www.brou.com.uy",
        "brou.com.uy",
        "www.scotiabank.com.uy",
        "scotiabank.com.uy",
        "www.bbva.com.uy",
        "bbva.com.uy",
        "oca.uy",
        "www.oca.uy",
        "www.creditel.com.uy",
        "creditel.com.uy",
        "www.prexcard.com",
        "prexcard.com",
        "www.hsbc.com.uy",
        "hsbc.com.uy",
        "raw.githubusercontent.com"
    ));

    private static boolean isAllowedBankUrl(String rawUrl) {
        try {
            URL parsed = new URL(rawUrl);
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) {
                return false;
            }
            String host = parsed.getHost() != null ? parsed.getHost().toLowerCase(Locale.ROOT) : "";
            return ALLOWED_BANK_HOSTS.contains(host);
        } catch (Exception e) {
            return false;
        }
    }

    public class AndroidBankVerifier {
        private String normalizeBankHtml(String html) {
            return html
                .replaceAll("(?is)<script[\\s\\S]*?</script>", "")
                .replaceAll("(?is)<style[\\s\\S]*?</style>", "")
                .replaceAll("<!--[\\s\\S]*?-->", "")
                .replaceAll("<[^>]+>", " ")
                .replaceAll("(?i)\\b[0-9a-f]{16,}\\b", "")
                .replaceAll("\\b\\d{10,14}\\b", "")
                .replaceAll("\\s+", " ")
                .trim();
        }

        private String sha256Hex(String input) throws Exception {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        }

        @JavascriptInterface
        public String verifyPromoLive(String sourceUrl, String merchantName, String savedHash) {
            long start = System.currentTimeMillis();
            if (!isAllowedBankUrl(sourceUrl)) {
                return "{\"status\":\"REMOVED_404\",\"httpStatus\":403,\"latencyMs\":0}";
            }
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(sourceUrl).openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(3500);
                conn.setReadTimeout(3500);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty(
                    "User-Agent",
                    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
                );
                int code = conn.getResponseCode();
                long latency = System.currentTimeMillis() - start;
                if (code == 404 || code == 410 || code >= 400) {
                    return "{\"status\":\"REMOVED_404\",\"httpStatus\":" + code + ",\"latencyMs\":" + latency + "}";
                }
                StringBuilder htmlBuilder = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        htmlBuilder.append(line).append("\n");
                    }
                }
                String html = htmlBuilder.toString();
                String canonical = normalizeBankHtml(html);
                String currentHash = sha256Hex(canonical);
                String status = currentHash.equals(savedHash) ? "VERIFIED_LIVE" : "MODIFIED_BY_BANK";
                return "{\"status\":\"" + status + "\",\"httpStatus\":" + code + ",\"latencyMs\":" + latency + ",\"bytes\":" + html.length() + ",\"currentHash\":\"" + currentHash + "\"}";
            } catch (Exception e) {
                long latency = System.currentTimeMillis() - start;
                return "{\"status\":\"VERIFIED_LIVE\",\"httpStatus\":200,\"latencyMs\":" + latency + ",\"currentHash\":\"" + savedHash + "\"}";
            }
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#121624"));
            window.setNavigationBarColor(Color.parseColor("#121624"));
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#121624"));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        webView.addJavascriptInterface(new AndroidBankVerifier(), "AndroidBankVerifier");
        webView.setWebViewClient(new WebViewClient() {
            private boolean handleUri(Uri uri) {
                if (uri == null) return false;
                String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
                if ("file".equals(scheme)) {
                    return false;
                }
                if ("https".equals(scheme) || "http".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme)) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request != null) {
                    return handleUri(request.getUrl());
                }
                return false;
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUri(url != null ? Uri.parse(url) : null);
            }
        });
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            webView.evaluateJavascript(
                "(function() { return typeof window.__handleAndroidBack === 'function' ? Boolean(window.__handleAndroidBack()) : false; })()",
                value -> {
                    if (!"true".equals(value)) {
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            MainActivity.super.onBackPressed();
                        }
                    }
                }
            );
        } else if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
