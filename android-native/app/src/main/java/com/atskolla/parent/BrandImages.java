package com.atskolla.parent;

import android.graphics.*;
import android.os.*;
import android.util.LruCache;
import android.widget.ImageView;
import java.net.*;
import java.io.*;
import java.util.concurrent.*;

/** Bounded, in-memory images only. Student photos are never saved to public storage. */
final class BrandImages {
    private final ExecutorService workers=Executors.newFixedThreadPool(2);
    private final Handler main=new Handler(Looper.getMainLooper());
    private final LruCache<String,Bitmap> images=new LruCache<String,Bitmap>(6*1024*1024){
        @Override protected int sizeOf(String key,Bitmap bitmap){return bitmap.getAllocationByteCount();}
    };
    private volatile int generation;
    void load(ImageView target,String url){
        target.setTag(url);if(url==null||!url.startsWith("https://"))return;
        Bitmap cached=images.get(url);if(cached!=null){target.setImageBitmap(cached);return;}
        int current=generation;
        workers.execute(()->{
            HttpURLConnection connection=null;
            try{
                String currentUrl=url;
                for(int redirect=0;redirect<4;redirect++){
                    connection=(HttpURLConnection)new URL(currentUrl).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(8000);connection.setReadTimeout(10000);
                    int status=connection.getResponseCode();if(status<300||status>399)break;
                    String location=connection.getHeaderField("Location");if(location==null)return;String next=new URL(new URL(currentUrl),location).toString();if(!next.startsWith("https://"))return;connection.disconnect();connection=null;currentUrl=next;
                }
                if(connection==null)return;
                if(connection.getResponseCode()!=200||connection.getContentLengthLong()>3*1024*1024)return;
                ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;
                try(InputStream in=connection.getInputStream()){while((count=in.read(buffer))!=-1){if(out.size()+count>3*1024*1024)return;out.write(buffer,0,count);}}
                byte[] bytes=out.toByteArray();BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);
                if(options.outWidth<=0||options.outHeight<=0)return;
                options.inSampleSize=1;while(Math.max(options.outWidth,options.outHeight)/options.inSampleSize>640)options.inSampleSize*=2;
                options.inJustDecodeBounds=false;Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);
                if(bitmap==null||generation!=current)return;
                images.put(url,bitmap);main.post(()->{if(generation==current&&url.equals(target.getTag()))target.setImageBitmap(bitmap);});
            }catch(Exception ignored){/* Identity remains readable with the local placeholder. */}
            finally{if(connection!=null)connection.disconnect();}
        });
    }
    void clear(){generation++;images.evictAll();}
    void close(){clear();workers.shutdownNow();}
}
