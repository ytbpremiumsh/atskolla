package com.atskolla.parent;
import android.os.*;
import android.provider.MediaStore;
import android.widget.*;
import android.view.*;
import android.database.Cursor;
import android.content.ContentUris;
import java.io.*;

/** Exercises the real preview and real scoped-storage download, including process restart. */
public final class PdfPreviewCheckActivity extends PdfPreviewActivity {
    static final String NAME="ATSkolla-Preview-Test.pdf";private boolean clicked;
    @Override public void onCreate(Bundle state){try{String id=getSharedPreferences("pdf-test",0).getString("document_id","");if(!getIntent().getBooleanExtra("reuse",false)||id.isEmpty()){ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=openFileInput("invoice-fixture.pdf")){InvoiceFiles.copy(in,out);}id=InvoiceFiles.stage(this,out.toByteArray());getSharedPreferences("pdf-test",0).edit().putString("document_id",id).commit();}getIntent().putExtra("document_id",id).putExtra("filename",NAME);}catch(Exception error){throw new IllegalStateException(error);}super.onCreate(state);
        if(getIntent().getBooleanExtra("auto_download",false))new Handler(Looper.getMainLooper()).post(new Runnable(){public void run(){if(isDestroyed()||clicked)return;Button download=find(getWindow().getDecorView());if(download!=null&&download.isEnabled()){clicked=true;download.performClick();}else new Handler(Looper.getMainLooper()).postDelayed(this,100);}});
    }
    private Button find(View view){if(view instanceof Button&&((Button)view).getText().toString().equals("Download bukti pembayaran"))return (Button)view;if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){Button result=find(group.getChildAt(i));if(result!=null)return result;}}return null;}
    @Override protected void onDownloadSaved(boolean success){boolean valid=false;if(success)try(Cursor cursor=getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,new String[]{MediaStore.Downloads._ID},MediaStore.Downloads.DISPLAY_NAME+"=?",new String[]{NAME},null)){if(cursor!=null&&cursor.moveToFirst()){android.net.Uri uri=ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI,cursor.getLong(0));try(InputStream in=getContentResolver().openInputStream(uri)){valid=in!=null&&in.read()=='%'&&in.read()=='P'&&in.read()=='D'&&in.read()=='F';}getContentResolver().delete(uri,null,null);}}catch(Exception ignored){}TextView result=new TextView(this);result.setText(valid?"PDF DOWNLOAD PASSED":"PDF DOWNLOAD FAILED");setContentView(result);}
}
