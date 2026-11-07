package com.atskolla.parent;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

public final class CheckoutCheckActivity extends Activity {
    @Override public void onCreate(Bundle state){super.onCreate(state);TextView label=new TextView(this);label.setText("CHECKOUT CHECKING");setContentView(label);if(state!=null)return;
        try{Vault vault=new Vault(this);vault.put("token","checkout-fixture-session");vault.put("notifications_enabled","no");}catch(Exception e){throw new IllegalStateException(e);}
        startActivityForResult(new Intent(this,PaymentPreviewActivity.class).putExtra("mode",getIntent().getStringExtra("mode")).putExtra("url","https://jokul.doku.com/checkout/link/native-fixture").putExtra("student",ParentActivity.j("id","sample-student","name","Nadia Putri").toString()).putExtra("invoice",ParentActivity.j("id","test-checkout","period_label","SPP Uji").toString()),920);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);TextView label=new TextView(this);boolean verified=request==920&&result==RESULT_OK&&data!=null&&"test-checkout".equals(data.getStringExtra("invoice_id"));label.setText(verified?"CHECKOUT CONFIRMED":"CHECKOUT CANCELLED");setContentView(label);}
}
