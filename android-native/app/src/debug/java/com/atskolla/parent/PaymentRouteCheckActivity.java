package com.atskolla.parent;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

/** Both new and resumed checkout must target the internal activity with the same identifiers. */
public final class PaymentRouteCheckActivity extends ParentActivity {
    private int routes;
    @Override protected boolean preview(){return true;}
    @Override protected void startPreview(){
        launchCheckout(j("id","route-invoice"),"","https://jokul.doku.com/checkout/link/fixture",j("id","route-child"));
        launchCheckout(j("id","route-invoice"),"route-installment","https://bayar.atskolla.com/fixture",j("id","route-child"));
        if(routes!=2)throw new AssertionError("Payment route missing");token="";TextView label=new TextView(this);label.setText("PAYMENT ROUTES PASSED");setContentView(label);
    }
    @Override public void startActivityForResult(Intent intent,int request){
        if(intent.getComponent()==null||!intent.getComponent().getClassName().equals(PaymentActivity.class.getName())||Intent.ACTION_VIEW.equals(intent.getAction())||request!=902)throw new AssertionError("Checkout escaped to browser");
        if(!"route-invoice".equals(ParentActivity.s(parse(intent.getStringExtra("invoice")),"id")))throw new AssertionError("Invoice identity lost");
        if(routes==1&&!"route-installment".equals(intent.getStringExtra("installment_id")))throw new AssertionError("Resumed installment identity lost");routes++;
    }
    private org.json.JSONObject parse(String raw){try{return new org.json.JSONObject(raw);}catch(Exception e){throw new IllegalStateException(e);}}
}
