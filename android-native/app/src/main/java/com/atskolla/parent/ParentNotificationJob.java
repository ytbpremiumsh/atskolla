package com.atskolla.parent;

import android.Manifest;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.*;
import java.time.Instant;
import java.util.concurrent.*;

/** Opt-in periodic announcement checks. No FCM, no exact alarms, no student data in notifications. */
public final class ParentNotificationJob extends JobService {
    private static final int JOB=81021;
    private static final String CHANNEL="school_announcements";
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private Future<?> running;
    private volatile boolean stopped;
    static boolean enabled(Context c){return "yes".equals(new Vault(c).get("notifications_enabled"));}
    static boolean allowed(Context c){return Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
    static void schedule(Context c){
        if(!enabled(c)||!allowed(c))return;
        JobScheduler scheduler=c.getSystemService(JobScheduler.class);
        if(scheduler.getPendingJob(JOB)!=null)return;
        scheduler.schedule(new JobInfo.Builder(JOB,new ComponentName(c,ParentNotificationJob.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).build());
    }
    static void enable(Context c) throws Exception{Vault v=new Vault(c);v.put("notifications_since",Instant.now().toString());v.put("notifications_enabled","yes");schedule(c);}
    static void disable(Context c){try{new Vault(c).put("notifications_enabled","no");}catch(Exception ignored){}c.getSystemService(JobScheduler.class).cancel(JOB);c.getSystemService(NotificationManager.class).cancelAll();}
    @Override public boolean onStartJob(JobParameters params){
        stopped=false;
        if(!enabled(this)||!allowed(this))return false;
        running=executor.submit(()->{
            boolean retry=false;
            try{
                Vault vault=new Vault(this);String token=vault.get("token");if(token.isEmpty())return;
                JSONObject me=new JSONObject(vault.get("me"));JSONArray students=me.optJSONArray("students");if(students==null)return;
                ParentApi api=new ParentApi(this);
                for(int i=0;i<students.length()&&!stopped;i++){
                    if(Thread.currentThread().isInterrupted())break;
                    String id=students.getJSONObject(i).optString("id");if(id.isEmpty())continue;
                    JSONObject request=new JSONObject().put("student_id",id);
                    JSONObject result=api.call("announcements",request,token);
                    if(stopped||!token.equals(vault.get("token"))||!enabled(this))return;
                    JSONArray announcements=result.optJSONArray("announcements");if(announcements==null)continue;
                    String key="notification_seen:"+id;String seen=vault.get(key);if(seen.isEmpty())seen=vault.get("notifications_since");
                    Instant cutoff;try{cutoff=Instant.parse(seen);}catch(Exception e){cutoff=Instant.now();}
                    Instant newest=cutoff;boolean hasNew=false;
                    for(int j=0;j<announcements.length();j++){
                        JSONObject item=announcements.getJSONObject(j);Instant created;try{created=Instant.parse(item.optString("created_at"));}catch(Exception e){continue;}
                        if(created.isAfter(cutoff)){hasNew=true;if(created.isAfter(newest))newest=created;}
                    }
                    if(hasNew&&!stopped&&token.equals(vault.get("token"))&&enabled(this)&&allowed(this)){
                        NotificationManager nm=getSystemService(NotificationManager.class);
                        nm.createNotificationChannel(new NotificationChannel(CHANNEL,"Pengumuman sekolah",NotificationManager.IMPORTANCE_DEFAULT));
                        Intent open=new Intent(this,ParentActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP).putExtra("open_announcements",true).putExtra("student_id",id);
                        PendingIntent action=PendingIntent.getActivity(this,id.hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
                        nm.notify(id.hashCode(),new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("ATSkolla Parent")
                            .setContentText("Ada pengumuman baru dari sekolah. Buka aplikasi untuk melihatnya.").setContentIntent(action).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build());
                        vault.put(key,newest.toString());
                    }
                }
            }catch(ParentApi.Failure e){retry=!e.unauthorized;if(e.unauthorized)disable(this);}catch(Exception e){retry=true;}
            finally{if(!stopped)jobFinished(params,retry);}
        });return true;
    }
    @Override public boolean onStopJob(JobParameters params){stopped=true;if(running!=null)running.cancel(true);return enabled(this);}
    @Override public void onDestroy(){stopped=true;executor.shutdownNow();super.onDestroy();}
}
