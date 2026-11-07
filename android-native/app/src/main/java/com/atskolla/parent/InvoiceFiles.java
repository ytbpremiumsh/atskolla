package com.atskolla.parent;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import java.io.*;
import java.util.UUID;

final class InvoiceFiles {
    static File directory(Context context){File directory=new File(context.getFilesDir(),"invoice-previews");directory.mkdirs();return directory;}
    static String stage(Context context,byte[] bytes) throws IOException {String id=UUID.randomUUID().toString();File file=resolve(context,id);try(FileOutputStream out=new FileOutputStream(file)){out.write(bytes);}return id;}
    static String cachedId(org.json.JSONObject payload) throws Exception {byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest((BuildConfig.VERSION_NAME+payload.toString()).getBytes(java.nio.charset.StandardCharsets.UTF_8));StringBuilder key=new StringBuilder();for(byte b:hash)key.append(String.format(java.util.Locale.ROOT,"%02x",b));return java.util.UUID.nameUUIDFromBytes(key.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();}
    static String cached(Context context,org.json.JSONObject payload) throws Exception {String id=cachedId(payload);File f=resolve(context,id);return f.isFile()&&f.length()>5?id:null;}
    static String store(Context context,org.json.JSONObject payload,byte[] bytes) throws Exception {String id=cachedId(payload);File f=resolve(context,id);try(FileOutputStream out=new FileOutputStream(f)){out.write(bytes);}File[] files=directory(context).listFiles();if(files!=null&&files.length>24){java.util.Arrays.sort(files,java.util.Comparator.comparingLong(File::lastModified).reversed());for(int i=24;i<files.length;i++)files[i].delete();}return id;}
    static File resolve(Context context,String id) throws IOException {if(id==null||!id.matches("[a-f0-9-]{36}"))throw new IOException("Dokumen tidak ditemukan");return new File(directory(context),id+".pdf");}
    static void copy(InputStream input,OutputStream output) throws IOException {byte[] part=new byte[8192];int n;while((n=input.read(part))!=-1)output.write(part,0,n);output.flush();}
    static Uri download(Context context,File file,String filename) throws IOException {
        if(Build.VERSION.SDK_INT<29)throw new IOException("Gunakan pemilih lokasi penyimpanan");
        ContentValues values=new ContentValues();values.put(MediaStore.Downloads.DISPLAY_NAME,filename);values.put(MediaStore.Downloads.MIME_TYPE,"application/pdf");values.put(MediaStore.Downloads.RELATIVE_PATH,"Download/ATSkolla");values.put(MediaStore.Downloads.IS_PENDING,1);ContentResolver resolver=context.getContentResolver();Uri uri=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);if(uri==null)throw new IOException("Lokasi Download belum tersedia");
        try{try(InputStream input=new FileInputStream(file);OutputStream output=resolver.openOutputStream(uri)){if(output==null)throw new IOException("Berkas tidak dapat disimpan");copy(input,output);}values.clear();values.put(MediaStore.Downloads.IS_PENDING,0);if(resolver.update(uri,values,null,null)!=1)throw new IOException("Berkas belum selesai disimpan");return uri;}catch(Exception error){resolver.delete(uri,null,null);if(error instanceof IOException)throw (IOException)error;throw new IOException(error);}
    }
    static void clear(Context context){File[] files=directory(context).listFiles();if(files!=null)for(File file:files)file.delete();}
}
