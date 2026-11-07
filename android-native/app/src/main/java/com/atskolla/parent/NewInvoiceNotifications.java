package com.atskolla.parent;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.*;
import java.util.*;

/** First snapshot is a silent baseline; only newly available invoice IDs are announced. */
final class NewInvoiceNotifications {
    static void check(android.content.Context context,JSONObject student,JSONArray invoices,String token) throws Exception {
        Vault vault=new Vault(context);synchronized(Vault.LOCK){
            if(!ParentNotificationJob.enabled(context)||!ParentNotificationJob.allowed(context)||!token.equals(vault.get("token")))return;
            String key="invoice_available_seen:"+student.optString("id"),raw=vault.get(key);Set<String> seen=new LinkedHashSet<>();boolean baseline=raw.isEmpty();
            if(!baseline){JSONArray previous=new JSONArray(raw);for(int i=0;i<previous.length();i++)seen.add(previous.getString(i));}
            for(int i=0;i<invoices.length();i++){JSONObject invoice=invoices.getJSONObject(i);String id=invoice.optString("id");if(id.isEmpty()||seen.contains(id))continue;
                if(!baseline&&Arrays.asList("pending","unpaid","expired","failed","partial").contains(invoice.optString("status")))show(context,student,invoice);
                seen.add(id);
            }
            vault.put(key,new JSONArray(seen).toString());
        }
    }
    private static void show(android.content.Context context,JSONObject student,JSONObject invoice){
        String channel="school_new_invoices",id=invoice.optString("id");NotificationManager manager=context.getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel(channel,"SPP & tagihan baru",NotificationManager.IMPORTANCE_HIGH));
        String label=invoice.optString("period_label");if(label.isEmpty())label=invoice.optString("invoice_number","Tagihan sekolah");String message=label+" • "+ParentActivity.rupiah(invoice.optDouble("total_amount"));String due=invoice.optString("due_date");if(!due.isEmpty()&&!due.equals("null"))message+="\nJatuh tempo: "+ParentActivity.date(due);
        Intent intent=new Intent(context,ParentActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).setData(Uri.parse("atskolla://new-invoice/"+Uri.encode(id))).putExtra("open_payments",true).putExtra("student_id",student.optString("id"));PendingIntent action=PendingIntent.getActivity(context,id.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification publicVersion=new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setContentTitle("ATSkolla Parent").setContentText("Ada tagihan sekolah baru.").build();
        manager.notify("invoice_new:"+id,id.hashCode(),new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setColor(Ui.BLUE).setContentTitle("Tagihan baru • "+student.optString("name","Ananda")).setContentText(message).setStyle(new Notification.BigTextStyle().bigText(message)).setContentIntent(action).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(publicVersion).setOnlyAlertOnce(true).setAutoCancel(true).build());
    }
}
