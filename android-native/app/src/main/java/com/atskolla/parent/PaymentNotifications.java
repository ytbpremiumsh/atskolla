package com.atskolla.parent;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Only authenticated server payment records can produce a success notification. */
final class PaymentNotifications {
    static boolean fresh(JSONObject payment,Instant since,Instant now){try{Instant paid=Instant.parse(payment.optString("paid_at"));return "paid".equals(payment.optString("status"))&&!paid.isBefore(since)&&!paid.isAfter(now.plusSeconds(300));}catch(Exception ignored){return false;}}
    static void check(android.content.Context context,JSONObject student,JSONArray invoices,ParentApi api,String token,Instant since) throws Exception {
        for(int i=0;i<invoices.length();i++){
            JSONObject invoice=invoices.getJSONObject(i);boolean installment=false;
            if(invoice.optDouble("installment_paid_amount")>0||"partial".equals(invoice.optString("status"))){
                JSONObject result=api.call("installment_list",ParentActivity.j("student_id",student.optString("id"),"invoice_id",invoice.optString("id")),token);
                JSONArray rows=result.optJSONArray("installments");if(rows!=null)for(int j=0;j<rows.length();j++){JSONObject payment=rows.getJSONObject(j);if("paid".equals(payment.optString("status")))installment=true;if(fresh(payment,since,Instant.now()))publish(context,student,invoice,payment,"installment:"+payment.optString("id"),token);}
            }
            if(!installment&&fresh(invoice,since,Instant.now()))publish(context,student,invoice,invoice,"invoice:"+invoice.optString("id"),token);
        }
    }
    static void publish(android.content.Context context,JSONObject student,JSONObject invoice,JSONObject payment,String key,String token) throws Exception {
        Vault vault=new Vault(context);synchronized(Vault.LOCK){
            if(!ParentNotificationJob.enabled(context)||!ParentNotificationJob.allowed(context)||token.isEmpty()||!token.equals(vault.get("token")))return;
            String seenKey="payment_notification_seen:"+student.optString("id");LinkedHashSet<String> seen=new LinkedHashSet<>();try{JSONArray previous=new JSONArray(vault.get(seenKey));for(int i=0;i<previous.length();i++)seen.add(previous.getString(i));}catch(Exception ignored){}if(seen.contains(key))return;
            String channel="school_payments";NotificationManager manager=context.getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel(channel,"Pembayaran berhasil",NotificationManager.IMPORTANCE_HIGH));
            String time;try{time=Instant.parse(payment.optString("paid_at")).atZone(ZoneId.of("Asia/Jakarta")).format(DateTimeFormatter.ofPattern("d MMM • HH:mm",new Locale("id","ID")))+" WIB";}catch(Exception e){time="Terkonfirmasi server";}
            String label=invoice.optString("period_label");if(label.isEmpty())label=invoice.optString("invoice_number","Tagihan sekolah");String message=label+" • "+time;
            Intent intent=new Intent(context,ParentActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).setData(Uri.parse("atskolla://payment/"+Uri.encode(key))).putExtra("open_payments",true).putExtra("student_id",student.optString("id"));PendingIntent action=PendingIntent.getActivity(context,key.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification publicVersion=new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setContentTitle("ATSkolla Parent").setContentText("Ada konfirmasi pembayaran sekolah.").build();
            manager.notify("payment:"+key,key.hashCode(),new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setColor(Ui.BLUE).setContentTitle("Pembayaran berhasil • "+student.optString("name","Ananda")).setContentText(message).setStyle(new Notification.BigTextStyle().bigText(message)).setContentIntent(action).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(publicVersion).setOnlyAlertOnce(true).setAutoCancel(true).build());
            seen.add(key);while(seen.size()>256)seen.remove(seen.iterator().next());vault.put(seenKey,new JSONArray(seen).toString());
        }
    }
}
