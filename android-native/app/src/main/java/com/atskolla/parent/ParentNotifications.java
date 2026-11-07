package com.atskolla.parent;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/** Shared foreground/job checks. No background service, no external push broker. */
final class ParentNotifications {
    static volatile boolean foreground;
    private static final ReentrantLock CHECK=new ReentrantLock();
    static void check(Context context,boolean mayRenew) throws Exception { check(context,mayRenew,new ParentApi(context)); }
    static void check(Context context,boolean mayRenew,ParentApi api) throws Exception {
        if(!ParentNotificationJob.enabled(context)||!ParentNotificationJob.allowed(context)||!CHECK.tryLock())return;
        try{
            Vault vault=new Vault(context);String token=vault.get("token");if(token.isEmpty())return;
            JSONObject me;
            try{me=api.call("me",new JSONObject(),token);}catch(ParentApi.Failure error){if(!error.unauthorized||!mayRenew||foreground)throw error;String next=ParentSessions.renew(context,api,token);if(next.isEmpty())throw error;token=next;me=api.call("me",new JSONObject(),token);}
            synchronized(Vault.LOCK){if(!active(context,vault,token))return;vault.put("me",me.toString());}
            JSONArray children=me.optJSONArray("students");if(children==null)return;
            Instant since;try{since=Instant.parse(vault.get("notifications_since"));}catch(Exception e){return;}
            String from=LocalDate.now(ZoneId.of("Asia/Jakarta")).minusDays(1).toString(),to=LocalDate.now(ZoneId.of("Asia/Jakarta")).toString();
            for(int i=0;i<children.length();i++){
                if(Thread.currentThread().isInterrupted())return;
                JSONObject student=children.getJSONObject(i);String id=student.optString("id");if(id.isEmpty())continue;
                JSONObject result;
                try{result=api.call("attendance",new JSONObject().put("student_id",id).put("from",from).put("to",to),token);}
                catch(ParentApi.Failure error){
                    if(!error.unauthorized){result=new JSONObject();}else {if(!mayRenew||foreground)throw error;
                    String next=ParentSessions.renew(context,api,token);if(next.isEmpty())throw error;token=next;
                    result=api.call("attendance",new JSONObject().put("student_id",id).put("from",from).put("to",to),token);}
                }catch(java.io.IOException error){result=new JSONObject();}
                if(!active(context,vault,token))return;
                JSONArray rows=result.optJSONArray("attendance");LinkedHashSet<String> seen=new LinkedHashSet<>();String seenKey="attendance_notification_seen:"+id;
                try{JSONArray saved=new JSONArray(vault.get(seenKey));for(int n=0;n<saved.length();n++)seen.add(saved.getString(n));}catch(Exception ignored){}
                List<JSONObject> ordered=new ArrayList<>();if(rows!=null)for(int n=0;n<rows.length();n++)ordered.add(rows.getJSONObject(n));ordered.sort(Comparator.comparing(r->r.optString("date")+r.optString("time")));
                for(JSONObject row:ordered){String key=AttendanceEvents.key(id,row);if(seen.contains(key)||!AttendanceEvents.fresh(row,since,Instant.now()))continue;
                    synchronized(Vault.LOCK){if(!active(context,vault,token))return;showAttendance(context,student,row,key);seen.add(key);while(seen.size()>256)seen.remove(seen.iterator().next());vault.put(seenKey,new JSONArray(seen).toString());}
                }
                try{JSONObject payments=api.call("spp_list",new JSONObject().put("student_id",id),token);JSONArray invoices=payments.optJSONArray("invoices");if(invoices!=null)PaymentNotifications.check(context,student,invoices,api,token,since);}catch(ParentApi.Failure e){if(e.unauthorized)throw e;}catch(Exception ignored){}
                JSONObject announcements;try{announcements=api.call("announcements",new JSONObject().put("student_id",id),token);}catch(ParentApi.Failure e){if(e.unauthorized)throw e;announcements=new JSONObject();}catch(java.io.IOException e){announcements=new JSONObject();}
                if(!active(context,vault,token))return;
                JSONArray news=announcements.optJSONArray("announcements");String newsKey="notification_seen:"+id;Instant cutoff=since;try{String saved=vault.get(newsKey);if(!saved.isEmpty())cutoff=Instant.parse(saved);}catch(Exception ignored){}
                Instant newest=cutoff;int count=0;if(news!=null)for(int n=0;n<news.length();n++){try{Instant date=Instant.parse(news.getJSONObject(n).optString("created_at"));if(date.isAfter(cutoff)&&date.isBefore(Instant.now().plusSeconds(300))){count++;if(date.isAfter(newest))newest=date;}}catch(Exception ignored){}}
                if(count>0){synchronized(Vault.LOCK){if(!active(context,vault,token))return;showAnnouncement(context,id);vault.put(newsKey,newest.toString());}}
            }
        }finally{CHECK.unlock();}
    }
    private static boolean active(Context c,Vault vault,String token){return ParentNotificationJob.enabled(c)&&ParentNotificationJob.allowed(c)&&token.equals(vault.get("token"));}
    static void showAttendance(Context context,JSONObject student,JSONObject row,String key){
        NotificationManager manager=context.getSystemService(NotificationManager.class);String channel="student_attendance";
        manager.createNotificationChannel(new NotificationChannel(channel,"Absensi Datang & Pulang",NotificationManager.IMPORTANCE_HIGH));
        String id=student.optString("id"),direction=AttendanceEvents.direction(row),time=row.optString("time");if(time.length()>5)time=time.substring(0,5);
        Intent intent=new Intent(context,ParentActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).setData(Uri.parse("atskolla://attendance/"+Uri.encode(id))).putExtra("open_attendance",true).putExtra("student_id",id).putExtra("attendance_date",row.optString("date"));
        PendingIntent action=PendingIntent.getActivity(context,key.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String method=row.optString("method"),message=direction+" • "+time+" WIB"+(method.isEmpty()?"":" • "+method);
        Notification publicVersion=new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setColor(Ui.BLUE).setContentTitle("ATSkolla Parent").setContentText("Ada pembaruan absensi siswa.").build();
        manager.notify("attendance:"+key,key.hashCode(),new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setColor(Ui.BLUE).setContentTitle(student.optString("name","Ananda")+" • Absensi "+direction).setContentText(message).setStyle(new Notification.BigTextStyle().bigText(message)).setContentIntent(action).setAutoCancel(true).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(publicVersion).build());
    }
    private static void showAnnouncement(Context context,String id){String channel="school_announcements";NotificationManager manager=context.getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel(channel,"Pengumuman sekolah",NotificationManager.IMPORTANCE_DEFAULT));Intent open=new Intent(context,ParentActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).setData(Uri.parse("atskolla://announcements/"+Uri.encode(id))).putExtra("open_announcements",true).putExtra("student_id",id);PendingIntent action=PendingIntent.getActivity(context,id.hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);manager.notify("announcements",id.hashCode(),new Notification.Builder(context,channel).setSmallIcon(R.drawable.ic_notification).setColor(Ui.BLUE).setContentTitle("ATSkolla Parent").setContentText("Ada pengumuman baru dari sekolah.").setContentIntent(action).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build());}
}
