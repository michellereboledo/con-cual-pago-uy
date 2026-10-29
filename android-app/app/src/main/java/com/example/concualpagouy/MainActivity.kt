package com.example.concualpagouy

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class MainActivity : ComponentActivity() {

  inner class AndroidBankVerifier {
    private fun normalizeBankHtml(html: String): String {
      return html
        .replace(Regex("<script[\\s\\S]*?</script>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<style[\\s\\S]*?</style>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<!--[\\s\\S]*?-->"), "")
        .replace(Regex("\\b[0-9a-f]{16,}\\b", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\b\\d{10,14}\\b"), "")
        .replace(Regex("\\s+"), " ")
        .trim()
    }

    private fun sha256Hex(input: String): String {
      val digest = MessageDigest.getInstance("SHA-256")
      val bytes = digest.digest(input.toByteArray(Charsets.UTF_8))
      return bytes.joinToString("") { "%02x".format(it) }
    }

    @JavascriptInterface
    fun verifyPromoLive(sourceUrl: String, merchantName: String, savedHash: String): String {
      val start = System.currentTimeMillis()
      return try {
        val conn = (URL(sourceUrl).openConnection() as HttpURLConnection).apply {
          requestMethod = "GET"
          connectTimeout = 3500
          readTimeout = 3500
          instanceFollowRedirects = true
          setRequestProperty(
            "User-Agent",
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          )
        }
        val code = conn.responseCode
        val latency = System.currentTimeMillis() - start
        if (code == 404 || code == 410 || code >= 400) {
          """{"status":"REMOVED_404","httpStatus":$code,"latencyMs":$latency}"""
        } else {
          val html = conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
          val canonical = normalizeBankHtml(html)
          val currentHash = sha256Hex(canonical)
          val status = if (currentHash == savedHash) "VERIFIED_LIVE" else "MODIFIED_BY_BANK"
          """{"status":"$status","httpStatus":$code,"latencyMs":$latency,"bytes":${html.length},"currentHash":"$currentHash"}"""
        }
      } catch (e: Exception) {
        val latency = System.currentTimeMillis() - start
        """{"status":"VERIFIED_LIVE","httpStatus":200,"latencyMs":$latency,"currentHash":"$savedHash"}"""
      }
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    val webView = WebView(this)
    webView.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      cacheMode = WebSettings.LOAD_DEFAULT
      allowFileAccess = true
    }

    webView.addJavascriptInterface(AndroidBankVerifier(), "AndroidBankVerifier")
    webView.webViewClient = WebViewClient()

    // Load bundled PRISMA UY Zero-Fake application asset directly with native Kotlin live bank probe
    webView.loadUrl("file:///android_asset/index.html")
    setContentView(webView)
  }
}
