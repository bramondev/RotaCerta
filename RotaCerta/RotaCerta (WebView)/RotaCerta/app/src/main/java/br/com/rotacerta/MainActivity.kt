package br.com.rotacerta

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webview: WebView
    private val baseUrl = BuildConfig.APP_BASE_URL
    private var pendingFileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = pendingFileChooserCallback ?: return@registerForActivityResult
            pendingFileChooserCallback = null

            val selectedFiles =
                if (result.resultCode == RESULT_OK) {
                    WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
                } else {
                    null
                }

            callback.onReceiveValue(selectedFiles)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webview = findViewById(R.id.webview)
        webview.addJavascriptInterface(AndroidPushBridge(this), "AndroidPushBridge")
        webview.webChromeClient =
            object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?,
                ): Boolean {
                    pendingFileChooserCallback?.onReceiveValue(null)
                    pendingFileChooserCallback = filePathCallback

                    val chooserIntent =
                        try {
                            fileChooserParams?.createIntent()?.apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                            } ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                                type = "image/*"
                            }
                        } catch (_: Exception) {
                            pendingFileChooserCallback = null
                            return false
                        }

                    return try {
                        fileChooserLauncher.launch(
                            Intent.createChooser(chooserIntent, "Selecionar imagem"),
                        )
                        true
                    } catch (_: ActivityNotFoundException) {
                        pendingFileChooserCallback?.onReceiveValue(null)
                        pendingFileChooserCallback = null
                        false
                    }
                }
            }
        configureBackNavigation()
        webview.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""

                return if (url.startsWith(baseUrl)) {
                    false
                } else {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                super.onReceivedError(view, request, error)

                if (request?.isForMainFrame == true) {
                    view?.loadUrl(baseUrl)
                }
            }
        }

        webview.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webview, true)
            flush()
        }

        if (savedInstanceState != null) {
            webview.restoreState(savedInstanceState)
        } else {
            webview.loadUrl(buildUrl())
        }
    }

    override fun onStart() {
        super.onStart()
        NotificationRouting.bind(::openHashRoute)
    }

    override fun onStop() {
        NotificationRouting.bind(null)
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webview.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webview.restoreState(savedInstanceState)
    }

    private fun buildUrl(hashRoute: String? = null): String {
        val normalizedRoute = hashRoute?.trim().orEmpty()

        return when {
            normalizedRoute.isBlank() -> baseUrl
            normalizedRoute.startsWith("/#/") -> "$baseUrl$normalizedRoute"
            normalizedRoute.startsWith("#/") -> "$baseUrl/$normalizedRoute"
            else -> "$baseUrl/#/${normalizedRoute.trimStart('/')}"
        }
    }

    private fun openHashRoute(hashRoute: String) {
        val targetUrl = buildUrl(hashRoute)
        if (webview.url != targetUrl) {
            webview.loadUrl(targetUrl)
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webview.canGoBack() && webview.url?.startsWith(baseUrl) == true) {
                        webview.goBack()
                        return
                    }

                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            },
        )
    }
}
