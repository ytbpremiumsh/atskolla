package com.atskolla.parent;

import android.app.Activity;
import android.graphics.*;
import android.os.*;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

/** Shared web PDF template, streamed from assets; bounded logos and chunked PDF transport. */
final class InvoiceExporter {
    interface Result {void ready(byte[] pdf);void failed();}
    private final Activity activity;private final Handler main=new Handler(Looper.getMainLooper());private final ExecutorService io=Executors.newSingleThreadExecutor();private WebView web;private volatile boolean closed;private boolean started;private int attempts;
    InvoiceExporter(Activity activity){this.activity=activity;}
    void render(JSONObject source,Result callback){if(closed)return;io.execute(()->{try{
        JSONObject payload=new JSONObject(source.toString()),school=payload.getJSONObject("school");String logo=school.optString("logo");if(!logo.isEmpty()){try{school.put("logo",logoData(logo));}catch(Exception ignored){school.remove("logo");}}
        main.post(()->{if(closed||activity.isDestroyed())return;try{
            web=new WebView(activity);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setBlockNetworkLoads(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            web.setWebViewClient(new WebViewClient(){
                @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}
                @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){try{if(request.getUrl().toString().equals("https://appassets.androidplatform.net/invoice-renderer.js"))return new WebResourceResponse("application/javascript","UTF-8",activity.getAssets().open("invoice-renderer.js"));}catch(IOException ignored){}return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
                @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){fail(callback);return true;}
                @Override public void onPageFinished(WebView view,String url){if(started||closed)return;started=true;view.evaluateJavascript("window.makeSchoolInvoice("+payload.toString()+")",null);poll(callback);}
            });
            web.loadDataWithBaseURL("https://appassets.androidplatform.net/","<!doctype html><meta charset='utf-8'><script src='https://appassets.androidplatform.net/invoice-renderer.js'></script>","text/html","UTF-8",null);
            main.postDelayed(()->fail(callback),20000);
        }catch(Exception | OutOfMemoryError e){fail(callback);}});
    }catch(Exception | OutOfMemoryError e){main.post(()->fail(callback));}});}
    private void poll(Result callback){if(closed)return;web.evaluateJavascript("window.__invoiceResult === 'ERROR' ? -1 : (window.__invoiceResult || '').length",encoded->{if(closed)return;try{int length=Integer.parseInt(encoded);if(length<0||length>8*1024*1024){fail(callback);return;}if(length==0){if(++attempts>70){fail(callback);return;}main.postDelayed(()->poll(callback),160);return;}readChunk(callback,length,0,new ByteArrayOutputStream(Math.min(length,1024*1024)));}catch(Exception | OutOfMemoryError e){fail(callback);}});}
    private void readChunk(Result callback,int length,int offset,ByteArrayOutputStream output){if(closed)return;int end=Math.min(length,offset+32768);web.evaluateJavascript("window.__invoiceResult.slice("+offset+","+end+")",encoded->{if(closed)return;try{String chunk=new JSONArray("["+encoded+"]").getString(0);byte[] bytes=android.util.Base64.decode(chunk,android.util.Base64.DEFAULT);output.write(bytes);if(end<length){readChunk(callback,length,end,output);return;}byte[] pdf=output.toByteArray();if(pdf.length<5||pdf[0]!='%'||pdf[1]!='P')throw new IOException();close();callback.ready(pdf);}catch(Exception | OutOfMemoryError e){fail(callback);}});}
    private void fail(Result callback){if(closed)return;close();if(!activity.isDestroyed())callback.failed();}
    private static String logoData(String value) throws Exception {URI uri=new URI(value);if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getUserInfo()!=null)throw new IOException();HttpURLConnection connection=(HttpURLConnection)uri.toURL().openConnection();try{connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(1200);connection.setReadTimeout(1200);if(connection.getResponseCode()!=200)throw new IOException();ByteArrayOutputStream input=new ByteArrayOutputStream();try(InputStream stream=connection.getInputStream()){byte[] part=new byte[4096];int n;while((n=stream.read(part))!=-1){if(input.size()+n>256*1024)throw new IOException();input.write(part,0,n);}}byte[] raw=input.toByteArray();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(raw,0,raw.length,bounds);if(bounds.outWidth<=0||bounds.outHeight<=0)throw new IOException();BitmapFactory.Options opts=new BitmapFactory.Options();opts.inSampleSize=1;while(Math.max(bounds.outWidth,bounds.outHeight)/opts.inSampleSize>256)opts.inSampleSize*=2;Bitmap bitmap=BitmapFactory.decodeByteArray(raw,0,raw.length,opts);if(bitmap==null)throw new IOException();ByteArrayOutputStream png=new ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.PNG,100,png);bitmap.recycle();return "data:image/png;base64,"+android.util.Base64.encodeToString(png.toByteArray(),android.util.Base64.NO_WRAP);}finally{connection.disconnect();}}
    void close(){if(closed)return;closed=true;main.removeCallbacksAndMessages(null);io.shutdownNow();if(web!=null){WebView old=web;web=null;main.post(()->{try{old.stopLoading();old.setWebViewClient(new WebViewClient());old.removeAllViews();old.destroy();}catch(Exception ignored){}});}}
}
