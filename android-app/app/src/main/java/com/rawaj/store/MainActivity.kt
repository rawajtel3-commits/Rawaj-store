package com.rawaj.store

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineContainer: LinearLayout
    private lateinit var btnRetry: Button

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var pendingWebPermissionResources: Array<String> = emptyArray()

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
    }

    private val runtimePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val webReq = pendingWebPermissionRequest ?: return@registerForActivityResult
        val requestedResources = pendingWebPermissionResources
        pendingWebPermissionRequest = null
        pendingWebPermissionResources = emptyArray()

        val allGranted = requestedResources.all { res ->
            when (res) {
                PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                    grants[Manifest.permission.CAMERA] == true ||
                        hasPermission(Manifest.permission.CAMERA)
                PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                    grants[Manifest.permission.RECORD_AUDIO] == true ||
                        hasPermission(Manifest.permission.RECORD_AUDIO)
                else -> false
            }
        }
        if (allGranted && requestedResources.isNotEmpty()) {
            webReq.grant(requestedResources)
        } else {
            webReq.deny()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.storeWebView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        progressBar = findViewById(R.id.pageProgressBar)
        offlineContainer = findViewById(R.id.offlineContainer)
        btnRetry = findViewById(R.id.btnRetry)

        configureWebView()
        setupSwipeRefresh()
        setupBackNavigation()

        btnRetry.setOnClickListener {
            offlineContainer.visibility = View.GONE
            webView.visibility = View.VISIBLE
            webView.reload()
        }

        val initialUrl = resolveTargetUrl(intent)
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(initialUrl)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val deepLinkUrl = intent.dataString
        if (!deepLinkUrl.isNullOrBlank()) {
            webView.loadUrl(deepLinkUrl)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    private fun resolveTargetUrl(launchIntent: Intent?): String {
        val data = launchIntent?.dataString
        if (!data.isNullOrBlank() && data.startsWith("https://")) {
            return data
        }
        return BuildConfig.STORE_BASE_URL
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) ==
            PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            if (url.startsWith("http://") || url.startsWith("https://")) {
                try {
                    val request = DownloadManager.Request(Uri.parse(url)).apply {
                        setMimeType(mimeType)
                        addRequestHeader("User-Agent", userAgent)
                        addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                        setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                        )
                        val filename = URLUtil.guessFileName(url, contentDisposition, mimeType)
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                    }
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(request)
                    Toast.makeText(this, getString(R.string.download_started), Toast.LENGTH_SHORT)
                        .show()
                } catch (_: Exception) {
                    openExternalUri(Uri.parse(url))
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val scheme = uri.scheme?.lowercase() ?: return false
                val host = uri.host?.lowercase() ?: ""

                if (scheme == "tel" || scheme == "mailto" || scheme == "whatsapp" || scheme == "intent") {
                    openExternalUri(uri)
                    return true
                }

                // Keep first-party custom domain + OAuth/Firebase flows inside WebView / Custom Tab
                if (scheme == "https" || scheme == "http") {
                    val isFirstParty = host == BuildConfig.STORE_HOST.lowercase() ||
                        host.endsWith(".${BuildConfig.STORE_HOST.lowercase()}")
                    if (isFirstParty) {
                        return false
                    }

                    // Google Sign-In requires Chrome Custom Tabs (Google blocks embedded WebView OAuth)
                    if (host.contains("accounts.google.com")) {
                        val customTabsIntent = CustomTabsIntent.Builder().build()
                        customTabsIntent.launchUrl(this@MainActivity, uri)
                        return true
                    }

                    openExternalUri(uri)
                    return true
                }

                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    swipeRefresh.isRefreshing = false
                    progressBar.visibility = View.GONE
                    webView.visibility = View.GONE
                    offlineContainer.visibility = View.VISIBLE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress in 1..99) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                runOnUiThread {
                    val neededAndroidPerms = mutableListOf<String>()
                    val supportedResources = mutableListOf<String>()

                    for (res in request.resources) {
                        when (res) {
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                                supportedResources.add(res)
                                if (!hasPermission(Manifest.permission.CAMERA)) {
                                    neededAndroidPerms.add(Manifest.permission.CAMERA)
                                }
                            }
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                                supportedResources.add(res)
                                if (!hasPermission(Manifest.permission.RECORD_AUDIO)) {
                                    neededAndroidPerms.add(Manifest.permission.RECORD_AUDIO)
                                }
                            }
                        }
                    }

                    if (supportedResources.isEmpty()) {
                        request.deny()
                        return@runOnUiThread
                    }

                    if (neededAndroidPerms.isEmpty()) {
                        request.grant(supportedResources.toTypedArray())
                    } else {
                        pendingWebPermissionRequest?.deny()
                        pendingWebPermissionRequest = request
                        pendingWebPermissionResources = supportedResources.toTypedArray()
                        runtimePermissionLauncher.launch(neededAndroidPerms.toTypedArray())
                    }
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    filePathCallback = null
                    false
                }
            }
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.rawaj_primary),
            ContextCompat.getColor(this, R.color.rawaj_accent)
        )
        swipeRefresh.setOnChildScrollUpCallback { _, _ -> webView.scrollY > 0 }
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun openExternalUri(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // No handler installed on device
        }
    }
}
