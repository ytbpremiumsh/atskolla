package com.atskolla.parent;

import android.app.Activity;
import android.os.*;
import android.content.Intent;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;
import static com.atskolla.parent.Ui.*;

/** Branded startup; routing never clears the encrypted session. */
public final class SplashActivity extends Activity {
    private final Handler handler=new Handler(Looper.getMainLooper());
    @Override public void onCreate(Bundle state){
        setTheme(R.style.AppTheme);super.onCreate(state);
        LinearLayout page=column(this);page.setGravity(Gravity.CENTER);pad(page,28);page.setBackgroundColor(Color.WHITE);
        ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.launcher_mark);logo.setContentDescription("Logo ATSkolla");page.addView(logo,new LinearLayout.LayoutParams(dp(this,112),dp(this,112)));gap(page,22);
        TextView brand=text(this,"ATSkolla Parent",25,INK,true);brand.setGravity(Gravity.CENTER);page.addView(brand);gap(page,8);TextView subtitle=text(this,"Selalu dekat dengan perjalanan ananda",13,MUTED,false);subtitle.setGravity(Gravity.CENTER);page.addView(subtitle);gap(page,30);
        ProgressBar progress=new ProgressBar(this);progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(BLUE));page.addView(progress,new LinearLayout.LayoutParams(dp(this,26),dp(this,26)));gap(page,12);TextView loading=text(this,"Menyiapkan ruang ananda…",12,MUTED,false);loading.setGravity(Gravity.CENTER);page.addView(loading);setContentView(page);
        handler.postDelayed(()->{if(!isFinishing()){startActivity(new Intent(this,ParentActivity.class));finish();}},700);
    }
    @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);super.onDestroy();}
}
