package com.atskolla.parent;

import android.app.Activity;
import android.os.*;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

/** Runs the shared web PDF generator locally with no remote navigation or JS bridge. */
final class InvoiceExporter {
    interface Result {void ready(byte[] pdf);void failed();}
    private final Activity activity;private final Handler main=new Handler(Looper.getMainLooper());private final ExecutorService io=Executors.newSingleThreadExecutor();private WebView web;private volatile boolean closed;private int attempts;private boolean started;
    InvoiceExporter(Activity activity){this.activity=activity;}
    void render(JSONObject payload,Result callback){if(closed)return;io.execute(()->{try{
        JSONObject school=payload.getJSONObject("school");String logo=school.optString("logo");if(!logo.isEmpty()){try{school.put("logo",logoData(logo));}catch(Exception ignored){school.remove("logo");}}
        String script;try(InputStream input=activity.getAssets().open("invoice-renderer.js")){ByteArrayOutputStream bundle=new ByteArrayOutputStream();byte[] part=new byte[8192];int n;while((n=input.read(part))!=-1)bundle.write(part,0,n);script=new String(bundle.toByteArray(),StandardCharsets.UTF_8);}
        final String html="<!doctype html><meta charset='utf-8'><script>"+script.replace("</script","<\\/script")+"</script>";
        main.post(()->{if(closed||activity.isDestroyed())return;try{web=new WebView(activity);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setBlockNetworkLoads(true);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}@Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}@Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){if(!closed)callback.failed();close();return true;}@Override public void onPageFinished(WebView view,String url){if(started||closed)return;started=true;view.evaluateJavascript("window.makeSchoolInvoice("+payload.toString()+")",null);main.postDelayed(new Runnable(){public void run(){if(closed||activity.isDestroyed())return;if(++attempts>120){callback.failed();close();return;}web.evaluateJavascript("window.__invoiceResult || ''",encoded->{if(closed)return;try{String result=new JSONArray("["+encoded+"]").getString(0);if(result.equals("ERROR")){callback.failed();close();}else if(!result.isEmpty()){byte[] pdf=android.util.Base64.decode(result,android.util.Base64.DEFAULT);if(pdf.length<5||pdf[0]!='%'||pdf[1]!='P')throw new IOException("Invalid PDF");callback.ready(pdf);close();}else main.postDelayed(this,250);}catch(Exception e){callback.failed();close();}});}},250);}});
            web.loadDataWithBaseURL("https://appassets.androidplatform.net/",html,"text/html","UTF-8",null);}catch(Exception error){if(!closed)callback.failed();close();}
        });
    }catch(Exception e){main.post(()->{if(!closed)callback.failed();close();});}});}
    private static String logoData(String value) throws Exception {URI uri=new URI(value);if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getUserInfo()!=null)throw new IOException("Invalid logo");HttpURLConnection connection=(HttpURLConnection)uri.toURL().openConnection();try{connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(6000);connection.setReadTimeout(6000);if(connection.getResponseCode()!=200)throw new IOException("Logo unavailable");ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream input=connection.getInputStream()){byte[] part=new byte[8192];int n;while((n=input.read(part))!=-1){if(out.size()+n>1024*1024)throw new IOException("Logo too large");out.write(part,0,n);}}return "data:image/png;base64,"+android.util.Base64.encodeToString(out.toByteArray(),android.util.Base64.NO_WRAP);}finally{connection.disconnect();}}
    void close(){closed=true;main.removeCallbacksAndMessages(null);io.shutdownNow();if(web!=null){WebView old=web;web=null;main.post(()->{old.stopLoading();old.setWebViewClient(new WebViewClient());old.removeAllViews();old.destroy();});}}
}
