package com.atskolla.parent;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import java.io.FileOutputStream;
import org.json.JSONObject;

/** Both paid and unpaid use the real bundled web template, with no live student records. */
public final class InvoiceCheckActivity extends Activity {
    private InvoiceExporter exporter;private TextView label;
    @Override public void onCreate(Bundle state){super.onCreate(state);label=new TextView(this);label.setText("INVOICE CHECKING");setContentView(label);renderCase(true);}
    private void renderCase(boolean paid){
        JSONObject payload=ParentActivity.j("invoice",ParentActivity.j("invoice_number","TEST/202611/001","student_name","Nadia Putri","class_name","VII A","period_label","SPP November 2026","amount",250000,"total_amount",250000,"status",paid?"paid":"unpaid","paid_at",paid?"2026-11-07T06:45:00Z":""),"student",ParentActivity.j("student_id","DEMO-001","parent_name","Wali Contoh"),"school",ParentActivity.j("name","Sekolah Contoh","address","Jalan Pendidikan, Kota Contoh, Indonesia"));
        exporter=new InvoiceExporter(this);exporter.render(payload,new InvoiceExporter.Result(){public void ready(byte[] pdf){try{
            if(pdf.length<1000)throw new IllegalStateException("Incomplete PDF");String cached=InvoiceFiles.store(InvoiceCheckActivity.this,payload,pdf);if(!cached.equals(InvoiceFiles.cached(InvoiceCheckActivity.this,payload)))throw new AssertionError("PDF cache miss");JSONObject changed=new JSONObject(payload.toString());changed.getJSONObject("invoice").put("total_amount",260000);if(InvoiceFiles.cached(InvoiceCheckActivity.this,changed)!=null)throw new AssertionError("Stale PDF reused after amount change");
            if(paid){try(FileOutputStream out=openFileOutput("invoice-fixture.pdf",MODE_PRIVATE)){out.write(pdf);}renderCase(false);}else{try(FileOutputStream out=openFileOutput("invoice-unpaid-fixture.pdf",MODE_PRIVATE)){out.write(pdf);}label.setText("INVOICE CHECK PASSED");}
        }catch(Exception | AssertionError e){label.setText("INVOICE CHECK FAILED: "+e.getMessage());}}public void failed(){label.setText("INVOICE CHECK FAILED");}});
    }
    @Override protected void onDestroy(){if(exporter!=null)exporter.close();super.onDestroy();}
}
