package com.atskolla.parent;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import java.io.FileOutputStream;

/** Runs the real bundled web template on Android, using synthetic data only. */
public final class InvoiceCheckActivity extends Activity {
    private InvoiceExporter exporter;
    @Override public void onCreate(Bundle state){super.onCreate(state);TextView label=new TextView(this);label.setText("INVOICE CHECKING");setContentView(label);exporter=new InvoiceExporter(this);exporter.render(ParentActivity.j("invoice",ParentActivity.j("invoice_number","TEST/202611/001","student_name","Nadia Putri","class_name","VII A","period_label","SPP November 2026","amount",250000,"total_amount",250000,"status","paid","paid_at","2026-11-07T06:45:00Z"),"student",ParentActivity.j("student_id","DEMO-001","parent_name","Wali Contoh"),"school",ParentActivity.j("name","Sekolah Contoh","address","Jalan Pendidikan, Kota Contoh, Indonesia")),new InvoiceExporter.Result(){public void ready(byte[] pdf){try{if(pdf.length<1000)throw new IllegalStateException("Incomplete PDF");try(FileOutputStream out=openFileOutput("invoice-fixture.pdf",MODE_PRIVATE)){out.write(pdf);}label.setText("INVOICE CHECK PASSED");}catch(Exception e){label.setText("INVOICE CHECK FAILED");}}public void failed(){label.setText("INVOICE CHECK FAILED");}});}
    @Override protected void onDestroy(){if(exporter!=null)exporter.close();super.onDestroy();}
}
