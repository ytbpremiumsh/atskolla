package com.atskolla.parent;

import android.app.Activity;
import android.app.Dialog;
import android.widget.Button;
import android.view.*;
import org.json.*;
import java.time.Instant;
import static com.atskolla.parent.ParentActivity.*;

final class InstallmentChoiceCheck {
    static JSONObject invoice(){return j("id","sample-installment","period_label","Daftar Ulang 2026/2027","total_amount",1000000,"allow_installment",true,"bill_type","other");}
    static JSONObject summary(){return j("invoice",invoice(),"paid_amount",10000,"pending_amount",0,"remaining",990000,"installments",new JSONArray().put(j("id","partial-paid","amount",10000,"status","paid","paid_at","2026-11-07T07:33:00Z")));}
    static void run(Activity activity){
        long[] continued={0};InstallmentChoiceModal choice=new InstallmentChoiceModal(activity,invoice(),summary(),value->continued[0]=value,item->{});Dialog dialog=choice.show();
        require(!choice.proceed.isEnabled()&&choice.nominal()==0,"Empty amount must not create payment");
        Button quick=find((ViewGroup)choice.editor,"Rp 100.000");require(quick!=null,"Quick amount missing");quick.performClick();require(choice.nominal()==100000&&choice.proceed.isEnabled(),"Quick amount changed");
        choice.amount.setText("9999");require(!choice.proceed.isEnabled(),"Minimum amount not enforced");
        choice.amount.setText("990001");require(!choice.proceed.isEnabled(),"Amount exceeded server remaining");
        choice.amount.setText("10000");require(choice.proceed.isEnabled(),"Minimum amount rejected");choice.proceed.performClick();require(continued[0]==10000&&!dialog.isShowing(),"Partial payment callback failed");
        JSONObject pending=summary();try{pending.put("pending_amount",100000);pending.put("remaining",890000);}catch(Exception e){throw new AssertionError(e);}
        InstallmentChoiceModal full=new InstallmentChoiceModal(activity,invoice(),pending,value->continued[0]=value,item->{});full.show();full.fullTile.performClick();require(full.nominal()==890000&&full.editor.getVisibility()==View.GONE,"Full payment ignored server pending lock");full.proceed.performClick();require(continued[0]==890000,"Full payment used invoice total instead of remaining");
        JSONObject open=j("status","pending","mayar_payment_url","https://jokul.doku.com/fixture","expired_at",Instant.now().plusSeconds(3600).toString());require(InstallmentChoiceModal.canResume(open),"Pending resume missing");try{open.put("expired_at",Instant.now().minusSeconds(60).toString());}catch(Exception ignored){}require(!InstallmentChoiceModal.canResume(open),"Expired payment may not resume");
        JSONObject settled=summary();try{settled.put("remaining",0);settled.put("paid_amount",1000000);}catch(Exception ignored){}InstallmentChoiceModal paid=new InstallmentChoiceModal(activity,invoice(),settled,value->{throw new AssertionError("Paid invoice allowed payment");},item->{});paid.show();require(paid.proceed==null,"Settled invoice has payment action");paid.dialog.dismiss();
    }
    static Button find(ViewGroup group,String label){for(int i=0;i<group.getChildCount();i++){View v=group.getChildAt(i);if(v instanceof Button&&label.contentEquals(((Button)v).getText()))return (Button)v;if(v instanceof ViewGroup){Button found=find((ViewGroup)v,label);if(found!=null)return found;}}return null;}
    static void require(boolean result,String message){if(!result)throw new AssertionError(message);}
}
