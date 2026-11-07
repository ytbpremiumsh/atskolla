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
    static File resolve(Context context,String id) throws IOException {if(id==null||!id.matches("[a-f0-9-]{36}"))throw new IOException("Dokumen tidak ditemukan");return new File(directory(context),id+".pdf");}
    static void copy(InputStream input,OutputStream output) throws IOException {byte[] part=new byte[8192];int n;while((n=input.read(part))!=-1)output.write(part,0,n);output.flush();}
    static Uri download(Context context,File file,String filename) throws IOException {
        if(Build.VERSION.SDK_INT<29)throw new IOException("Gunakan pemilih lokasi penyimpanan");
        ContentValues values=new ContentValues();values.put(MediaStore.Downloads.DISPLAY_NAME,filename);values.put(MediaStore.Downloads.MIME_TYPE,"application/pdf");values.put(MediaStore.Downloads.RELATIVE_PATH,"Download/ATSkolla");values.put(MediaStore.Downloads.IS_PENDING,1);ContentResolver resolver=context.getContentResolver();Uri uri=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);if(uri==null)throw new IOException("Lokasi Download belum tersedia");
        try{try(InputStream input=new FileInputStream(file);OutputStream output=resolver.openOutputStream(uri)){if(output==null)throw new IOException("Berkas tidak dapat disimpan");copy(input,output);}values.clear();values.put(MediaStore.Downloads.IS_PENDING,0);if(resolver.update(uri,values,null,null)!=1)throw new IOException("Berkas belum selesai disimpan");return uri;}catch(Exception error){resolver.delete(uri,null,null);if(error instanceof IOException)throw (IOException)error;throw new IOException(error);}
    }
    static void clear(Context context){File[] files=directory(context).listFiles();if(files!=null)for(File file:files)file.delete();}
}
