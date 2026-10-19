package com.atskolla.parent;

import android.content.Context;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

class ParentApi {
    final String baseUrl, publicKey;
    ParentApi(Context context) {
        try(InputStream in=context.getAssets().open("api.json")) {
            JSONObject config=new JSONObject(readText(in));
            baseUrl=config.getString("baseUrl");publicKey=config.optString("publicKey");
        }catch(Exception e){throw new IllegalStateException("Konfigurasi aplikasi tidak tersedia",e);}
    }
    private static String readText(InputStream in) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] part=new byte[4096];int n;
        while((n=in.read(part))!=-1)out.write(part,0,n);
        return out.toString(StandardCharsets.UTF_8.name());
    }
    static class Failure extends IOException {
        final boolean unauthorized;
        Failure(String message,boolean auth){super(message);unauthorized=auth;}
    }
    JSONObject call(String action,JSONObject args,String token) throws Exception {
        JSONObject body=new JSONObject(args.toString());body.put("action",action);
        return request(baseUrl+"/functions/v1/parent-portal",body.toString().getBytes(StandardCharsets.UTF_8),"application/json",token,false);
    }
    String upload(byte[] bytes,String mime,String extension,String token) throws Exception {
        if(publicKey.isEmpty())throw new IOException("Unggah lampiran belum dikonfigurasi");
        String path="leave/"+java.util.UUID.randomUUID()+extension;
        request(baseUrl+"/storage/v1/object/parent-attachments/"+path,bytes,mime,token,true);
        return baseUrl+"/storage/v1/object/public/parent-attachments/"+path;
    }
    private JSONObject request(String url,byte[] body,String mime,String token,boolean storage) throws Exception {
        HttpURLConnection conn=(HttpURLConnection)new URL(url).openConnection();
        try {
            conn.setConnectTimeout(12000);conn.setReadTimeout(30000);conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type",mime);
            conn.setRequestProperty("Accept","application/json");
            if(storage) {
                conn.setRequestProperty("apikey",publicKey);
                if(publicKey.startsWith("eyJ"))conn.setRequestProperty("Authorization","Bearer "+publicKey);
            } else if(!token.isEmpty())conn.setRequestProperty("x-parent-token",token);
            conn.setFixedLengthStreamingMode(body.length);
            try(OutputStream out=conn.getOutputStream()){out.write(body);}
            int status=conn.getResponseCode();InputStream stream=status>=400?conn.getErrorStream():conn.getInputStream();
            if(stream==null)throw new IOException("Server belum merespons");
            ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] part=new byte[8192];int n;
            try(InputStream in=stream){while((n=in.read(part))!=-1){if(buffer.size()+n>8*1024*1024)throw new IOException("Respons terlalu besar");buffer.write(part,0,n);}}
            JSONObject result=new JSONObject(buffer.toString(StandardCharsets.UTF_8.name()));
            boolean unauth="UNAUTH".equals(result.optString("code"));
            if(status>=400||result.has("error")||unauth)throw new Failure(result.optString("error","Layanan sedang sibuk. Coba lagi."),unauth);
            return result;
        } finally {conn.disconnect();}
    }
}
