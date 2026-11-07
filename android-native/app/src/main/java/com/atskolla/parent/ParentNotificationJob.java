package com.atskolla.parent;

import android.Manifest;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import java.time.Instant;
import java.util.concurrent.*;

/** Opt-in persisted checks. Android controls background timing (15 minutes or longer). */
public final class ParentNotificationJob extends JobService {
    private static final int JOB=81021;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private Future<?> running;
    private volatile boolean stopped;
    static boolean enabled(Context c){return "yes".equals(new Vault(c).get("notifications_enabled"));}
    static boolean allowed(Context c){return (Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)&&c.getSystemService(NotificationManager.class).areNotificationsEnabled();}
    static void schedule(Context c){
        if(!enabled(c)||!allowed(c)||new Vault(c).get("token").isEmpty())return;
        JobScheduler scheduler=c.getSystemService(JobScheduler.class);JobInfo old=scheduler.getPendingJob(JOB);
        if(old!=null&&old.isPersisted())return;
        scheduler.schedule(new JobInfo.Builder(JOB,new ComponentName(c,ParentNotificationJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).setPersisted(true).build());
    }
    static void enable(Context c) throws Exception{Vault v=new Vault(c);v.put("notifications_since",Instant.now().toString());v.put("notifications_enabled","yes");schedule(c);}
    static void disable(Context c){try{new Vault(c).put("notifications_enabled","no");}catch(Exception ignored){}c.getSystemService(JobScheduler.class).cancel(JOB);c.getSystemService(NotificationManager.class).cancelAll();}
    @Override public boolean onStartJob(JobParameters params){stopped=false;if(!enabled(this)||!allowed(this))return false;running=executor.submit(()->{boolean retry=false;try{ParentNotifications.check(this,true);}catch(Exception e){retry=true;}finally{if(!stopped)jobFinished(params,retry);}});return true;}
    @Override public boolean onStopJob(JobParameters params){stopped=true;if(running!=null)running.cancel(true);return enabled(this);}
    @Override public void onDestroy(){stopped=true;executor.shutdownNow();super.onDestroy();}
}
