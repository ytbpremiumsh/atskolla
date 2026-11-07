package com.atskolla.teacher;
import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import static com.atskolla.teacher.Json.*;

/** Uses only the website's publishable key and the teacher's own JWT; all REST calls keep RLS. */
class TeacherApi {
 final String base,key;final Vault vault;private volatile JSONObject session;
 static class Failure extends IOException {final int status;Failure(String text,int status){super(text);this.status=status;}}
 TeacherApi(Context c){vault=new Vault(c);try(InputStream in=c.getAssets().open("api.json")){JSONObject cfg=new JSONObject(read(in));base=cfg.getString("baseUrl");key=cfg.getString("publicKey");String stored=vault.get("teacher-session");session=stored.isEmpty()?new JSONObject():new JSONObject(stored);}catch(Exception e){throw new IllegalStateException("Konfigurasi Guru tidak tersedia",e);}}
 synchronized void login(String email,String password)throws Exception{JSONObject next=(JSONObject)request("POST","/auth/v1/token?grant_type=password",j("email",email,"password",password),"",null);store(next);}
 synchronized void store(JSONObject next)throws Exception{if(s(next,"access_token").isEmpty()||s(next,"refresh_token").isEmpty())throw new IOException("Sesi tidak lengkap");vault.put("teacher-session",next.toString());session=next;}
 String uid(){return s(o(session,"user"),"id");}boolean signedIn(){return !s(session,"access_token").isEmpty();}
 synchronized void refresh()throws Exception{String refresh=s(session,"refresh_token");if(refresh.isEmpty())throw new Failure("Silakan masuk kembali",401);try{JSONObject next=(JSONObject)request("POST","/auth/v1/token?grant_type=refresh_token",j("refresh_token",refresh),"",null);store(next);}catch(Failure e){if(e.status==400||e.status==401||e.status==403){localLogout();throw new Failure("Sesi berakhir. Silakan masuk kembali.",401);}throw e;}}
 String detachSession(){String old=s(session,"access_token");localLogout();return old;}
 void localLogout(){session=new JSONObject();vault.clear();}
 void logout()throws Exception{String token=s(session,"access_token");localLogout();if(!token.isEmpty())request("POST","/auth/v1/logout?scope=local",j(),token,null);}
 Object authenticated(String method,String path,Object body,String prefer)throws Exception{String original=s(session,"access_token");if(original.isEmpty())throw new Failure("Silakan masuk kembali",401);try{return request(method,path,body,original,prefer);}catch(Failure e){if(e.status!=401)throw e;synchronized(this){if(original.equals(s(session,"access_token")))refresh();}return request(method,path,body,s(session,"access_token"),prefer);}}
 JSONArray get(String table,String query)throws Exception{return (JSONArray)authenticated("GET","/rest/v1/"+table+"?"+query,null,null);}
 JSONArray all(String table,String query)throws Exception{JSONArray out=new JSONArray();for(int offset=0;offset<50000;offset+=500){JSONArray page=get(table,query+"&limit=500&offset="+offset);for(int i=0;i<page.length();i++)out.put(page.get(i));if(page.length()<500)return out;}throw new IOException("Data terlalu besar; persempit periode laporan");}
 JSONArray write(String method,String table,String query,Object body,boolean upsert)throws Exception{return (JSONArray)authenticated(method,"/rest/v1/"+table+"?"+query,body,upsert?"return=representation,resolution=merge-duplicates":"return=representation");}
 JSONObject function(String name,JSONObject body)throws Exception{JSONObject response=(JSONObject)authenticated("POST","/functions/v1/"+name,body,null);if(!s(response,"error").isEmpty())throw new IOException(s(response,"error"));return response;}
 Object request(String method,String path,Object body,String token,String prefer)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(base+path).openConnection();try{c.setConnectTimeout(12000);c.setReadTimeout(25000);c.setInstanceFollowRedirects(false);c.setRequestMethod(method);c.setRequestProperty("apikey",key);if(!token.isEmpty())c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Content-Type","application/json");if(prefer!=null)c.setRequestProperty("Prefer",prefer);if(body!=null){c.setDoOutput(true);try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}}int status=c.getResponseCode();InputStream stream=status>=400?c.getErrorStream():c.getInputStream();String text=stream==null?"":read(stream);if(status>=400){String message="Permintaan gagal ("+status+")";try{JSONObject e=new JSONObject(text);message=s(e,"msg");if(message.isEmpty())message=s(e,"message");if(message.isEmpty())message=s(e,"error_description");if(message.isEmpty())message="Permintaan tidak diizinkan ("+status+")";}catch(Exception ignored){}throw new Failure(message,status);}if(text.isEmpty())return new JSONArray();return new JSONTokener(text).nextValue();}finally{c.disconnect();}}
 static String read(InputStream in)throws IOException{try(InputStream stream=in){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=stream.read(b))!=-1){if(out.size()+n>8*1024*1024)throw new IOException("Respons terlalu besar");out.write(b,0,n);}return out.toString("UTF-8");}}
}
