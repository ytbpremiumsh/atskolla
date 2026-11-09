package com.atskolla.parent;

import android.app.*;
import android.content.Context;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/** Registers the installation with an authenticated parent session, never a selected child. */
final class ParentPush {
 private static final ExecutorService IO=Executors.newSingleThreadExecutor();
 static void channels(Context c){NotificationManager m=c.getSystemService(NotificationManager.class);for(String[] item:new String[][]{{"student_attendance","Absensi Datang & Pulang"},{"school_new_invoices","SPP & tagihan baru"}}){NotificationChannel channel=new NotificationChannel(item[0],item[1],NotificationManager.IMPORTANCE_HIGH);channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);m.createNotificationChannel(channel);}}
 static String fingerprint(String token)throws Exception{StringBuilder b=new StringBuilder();for(byte v:MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)))b.append(String.format(Locale.ROOT,"%02x",v&255));return b.toString();}
 static void sync(Context context){sync(context,null);}
 static void sync(Context context,String refreshed){Context c=context.getApplicationContext();Vault v=new Vault(c);if(!ParentNotificationJob.enabled(c)||!ParentNotificationJob.allowed(c)||v.get("token").isEmpty())return;channels(c);
  try{FirebaseMessaging.getInstance().setAutoInitEnabled(true);if(refreshed!=null){register(c,refreshed);return;}FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token->register(c,token));}catch(Exception ignored){}
 }
 private static void register(Context c,String pushToken){IO.execute(()->{try{Vault v=new Vault(c);String auth=v.get("token");if(auth.isEmpty()||!ParentNotificationJob.enabled(c)||!ParentNotificationJob.allowed(c))return;String binding=fingerprint(auth+"|"+pushToken);long last=0;try{last=Long.parseLong(v.get("push_registered_at"));}catch(Exception ignored){}if(binding.equals(v.get("push_binding"))&&System.currentTimeMillis()-last<("active".equals(v.get("push_state"))?6*60*60*1000L:60000))return;
   JSONObject result=new ParentApi(c).call("register_push",new JSONObject().put("fcm_token",pushToken).put("app_package",c.getPackageName()).put("app_version",BuildConfig.VERSION_CODE),auth);
   synchronized(Vault.LOCK){if(!auth.equals(v.get("token"))||!ParentNotificationJob.enabled(c))return;v.put("push_state",result.optBoolean("ready")?"active":"pending");v.put("push_binding",binding);v.put("push_registered_at",String.valueOf(System.currentTimeMillis()));}
  }catch(Exception ignored){/* A later resume or persisted job retries; never interrupt login/forms. */}});}
 static void disable(Context context){Context c=context.getApplicationContext();Vault v=new Vault(c);String auth=v.get("token");try{FirebaseMessaging.getInstance().setAutoInitEnabled(false);FirebaseMessaging.getInstance().deleteToken();}catch(Exception ignored){}IO.execute(()->{if(auth.isEmpty())return;try{new ParentApi(c).call("unregister_push",new JSONObject(),auth);}catch(Exception ignored){}});}
 static void receive(Context c,Map<String,String> data){try{Vault v=new Vault(c);String auth=v.get("token");if(auth.isEmpty()||!ParentNotificationJob.enabled(c)||!ParentNotificationJob.allowed(c)||!fingerprint(auth).equals(data.get("session_fingerprint")))return;
  JSONObject me=new JSONObject(v.get("me"));JSONArray students=me.optJSONArray("students");if(students==null)return;JSONObject student=null;for(int i=0;i<students.length();i++)if(students.getJSONObject(i).optString("id").equals(data.get("student_id"))){student=students.getJSONObject(i);break;}if(student==null)return;
  JSONObject payload=new JSONObject(data.getOrDefault("payload","{}"));Instant since=Instant.parse(v.get("notifications_since"));channels(c);
  synchronized(Vault.LOCK){if(!auth.equals(v.get("token"))||!ParentNotificationJob.enabled(c))return;
   if("attendance".equals(data.get("kind"))&&AttendanceEvents.fresh(payload,since,Instant.now()))ParentNotifications.showAttendance(c,student,payload,AttendanceEvents.key(student.optString("id"),payload));
   else if("invoice_new".equals(data.get("kind"))&&InvoiceNoticePolicy.shouldNotify(true,payload.optString("status"),payload.optString("created_at"),v.get("notifications_since")))NewInvoiceNotifications.show(c,student,payload);
  }
 }catch(Exception ignored){/* Malformed/stale payloads never bypass the current parent session. */}}
 private ParentPush(){}
}
