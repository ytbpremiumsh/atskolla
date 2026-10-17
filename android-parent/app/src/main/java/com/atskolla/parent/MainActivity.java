package com.atskolla.parent;

import android.annotation.SuppressLint;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.View;
import android.webkit.*;
import android.widget.*;

public class MainActivity extends Activity {
    private static final String HOME = "https://atskolla.com/parent";
    private WebView web;
    private ProgressBar progress;
    private View error;
    private View loading;
    private TextView loadingMessage;
    private AnimatorSet logoAnimation;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean hasContent;
    private String retryUrl = HOME;
    private final Runnable slowNotice = () -> loadingMessage.setText(R.string.loading_slow);
    private final Runnable startupTimeout = () -> {
        if (!hasContent && !isFinishing()) { web.stopLoading(); showError(); }
    };
    private ValueCallback<Uri[]> files;
    private boolean failed;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        setTheme(R.style.AppTheme);
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        View root = findViewById(R.id.root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        root.requestApplyInsets();
        web = findViewById(R.id.web);
        progress = findViewById(R.id.page_progress);
        error = findViewById(R.id.error_panel);
        loading = findViewById(R.id.loading_panel);
        loadingMessage = findViewById(R.id.loading_message);
        findViewById(R.id.retry).setOnClickListener(v -> {
            hasContent = false;
            web.loadUrl(retryUrl);
        });
        findViewById(R.id.open_browser).setOnClickListener(v -> openExternal(Uri.parse(retryUrl)));
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
        showInitialLoading();
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (isTrusted(uri)) return false;
                openExternal(uri);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                failed = false;
                error.setVisibility(View.GONE);
                if (isTrusted(Uri.parse(url))) retryUrl = url;
                if (!hasContent) showInitialLoading();
                else progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                if (failed) { showError(); return; }
                hasContent = true;
                web.setVisibility(View.VISIBLE);
                handler.removeCallbacks(slowNotice);
                handler.removeCallbacks(startupTimeout);
                stopLogoAnimation();
                if (loading.getVisibility() == View.VISIBLE) {
                    loading.animate().alpha(0f).setDuration(ValueAnimator.areAnimatorsEnabled() ? 220 : 0)
                        .withEndAction(() -> loading.setVisibility(View.GONE)).start();
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError problem) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (files != null) files.onReceiveValue(null);
                files = callback;
                try { startActivityForResult(params.createIntent(), 100); }
                catch (ActivityNotFoundException ex) { files.onReceiveValue(null); files = null; return false; }
                return true;
            }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, Message result) {
                if (!userGesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        openExternal(request.getUrl());
                        view.post(view::destroy);
                        return true;
                    }
                });
                ((WebView.WebViewTransport) result.obj).setWebView(popup);
                result.sendToTarget();
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> openExternal(Uri.parse(url)));
        if (state != null) {
            String savedUrl = state.getString("retry_url", HOME);
            if (isTrusted(Uri.parse(savedUrl))) retryUrl = savedUrl;
        }
        if (state == null || web.restoreState(state) == null) web.loadUrl(retryUrl);
        else web.reload();
    }

    private boolean isTrusted(Uri uri) {
        return "https".equals(uri.getScheme()) &&
            ("atskolla.com".equals(uri.getHost()) || "www.atskolla.com".equals(uri.getHost()));
    }

    private void showInitialLoading() {
        loading.animate().cancel();
        loading.setAlpha(1f);
        loading.setVisibility(View.VISIBLE);
        web.setVisibility(View.INVISIBLE);
        error.setVisibility(View.GONE);
        loadingMessage.setText(R.string.loading_message);
        handler.removeCallbacks(slowNotice);
        handler.removeCallbacks(startupTimeout);
        handler.postDelayed(slowNotice, 12000);
        handler.postDelayed(startupTimeout, 45000);
        startLogoAnimation();
    }

    private void startLogoAnimation() {
        if (!ValueAnimator.areAnimatorsEnabled() || (logoAnimation != null && logoAnimation.isStarted())) return;
        View logo = findViewById(R.id.loading_logo);
        ObjectAnimator x = ObjectAnimator.ofFloat(logo, View.SCALE_X, 1f, 1.045f);
        ObjectAnimator y = ObjectAnimator.ofFloat(logo, View.SCALE_Y, 1f, 1.045f);
        for (ObjectAnimator animator : new ObjectAnimator[] { x, y }) {
            animator.setRepeatCount(ValueAnimator.INFINITE);
            animator.setRepeatMode(ValueAnimator.REVERSE);
            animator.setDuration(1200);
        }
        logoAnimation = new AnimatorSet();
        logoAnimation.playTogether(x, y);
        logoAnimation.start();
    }

    private void stopLogoAnimation() {
        if (logoAnimation != null) { logoAnimation.cancel(); logoAnimation = null; }
        View logo = findViewById(R.id.loading_logo);
        logo.setScaleX(1f);
        logo.setScaleY(1f);
    }

    private void showError() {
        failed = true;
        hasContent = false;
        handler.removeCallbacks(slowNotice);
        handler.removeCallbacks(startupTimeout);
        stopLogoAnimation();
        loading.animate().cancel();
        loading.setVisibility(View.GONE);
        progress.setVisibility(View.GONE);
        web.setVisibility(View.INVISIBLE);
        error.setVisibility(View.VISIBLE);
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!("https".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme) || "whatsapp".equals(scheme))) {
            Toast.makeText(this, R.string.unsupported_link, Toast.LENGTH_LONG).show();
            return;
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException ex) {
            Toast.makeText(this, R.string.missing_app, Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 100 && files != null) {
            files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            files = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putString("retry_url", retryUrl);
        web.saveState(state);
    }
    private void handleBack() { if (web.canGoBack()) web.goBack(); else finish(); }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (loading != null && loading.getVisibility() == View.VISIBLE) startLogoAnimation();
    }
    @Override protected void onPause() {
        stopLogoAnimation();
        if (web != null) { web.onPause(); CookieManager.getInstance().flush(); }
        super.onPause();
    }
    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        stopLogoAnimation();
        if (files != null) { files.onReceiveValue(null); files = null; }
        if (web != null) { ((android.view.ViewGroup) web.getParent()).removeView(web); web.destroy(); }
        super.onDestroy();
    }
}
