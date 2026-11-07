package com.atskolla.parent;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.*;
import android.widget.*;
import static com.atskolla.parent.Ui.*;

/** A shared, scrollable native dialog with consistent cards and comfortable actions. */
final class CardModal {
    final Activity activity;
    String title="",message="",positive="",negative="",neutral="",icon="card";
    DialogInterface.OnClickListener onPositive,onNegative,onNeutral,onItem;
    String[] items;View custom;boolean closeButton;
    CardModal(Activity activity){this.activity=activity;}
    CardModal setTitle(String value){title=value;if(value.toLowerCase(java.util.Locale.ROOT).contains("bayar")||value.toLowerCase(java.util.Locale.ROOT).contains("metode"))icon="wallet";return this;}
    CardModal setIcon(String value){icon=value;return this;}
    CardModal setMessage(String value){message=value;return this;}
    CardModal setPositiveButton(String text,DialogInterface.OnClickListener callback){positive=text;onPositive=callback;return this;}
    CardModal setNegativeButton(String text,DialogInterface.OnClickListener callback){negative=text;onNegative=callback;return this;}
    CardModal setNeutralButton(String text,DialogInterface.OnClickListener callback){neutral=text;onNeutral=callback;return this;}
    CardModal setItems(String[] values,DialogInterface.OnClickListener callback){items=values;onItem=callback;return this;}
    CardModal setView(View view){custom=view;return this;}
    CardModal setCloseButton(){closeButton=true;return this;}
    Dialog show(){
        Dialog dialog=new Dialog(activity);dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        LinearLayout panel=column(activity);pad(panel,22);panel.setBackground(surface(activity,Color.WHITE,26));
        LinearLayout header=row(activity);header.addView(iconTile(activity,icon,Color.WHITE,BLUE,38),new LinearLayout.LayoutParams(dp(activity,38),dp(activity,38)));
        TextView heading=text(activity,title,19,INK,true);heading.setPadding(dp(activity,12),0,0,0);header.addView(heading,new LinearLayout.LayoutParams(0,-2,1));if(closeButton){Button close=button(activity,"×",false,dialog::dismiss);close.setTextSize(23);close.setContentDescription("Tutup pembayaran");close.setBackgroundColor(Color.TRANSPARENT);header.addView(close,new LinearLayout.LayoutParams(dp(activity,44),dp(activity,44)));}panel.addView(header);gap(panel,18);
        if(!message.isEmpty()){TextView detail=text(activity,message,14,MUTED,false);detail.setLineSpacing(dp(activity,4),1);panel.addView(detail);gap(panel,18);}
        if(items!=null)for(int i=0;i<items.length;i++){final int index=i;Button choice=button(activity,items[i]+"  ›",false,()->{dialog.dismiss();if(onItem!=null)onItem.onClick(dialog,index);});choice.setGravity(Gravity.CENTER_VERTICAL|Gravity.START);panel.addView(choice,new LinearLayout.LayoutParams(-1,-2));gap(panel,10);}
        if(custom!=null){panel.addView(custom);gap(panel,14);}
        if(!positive.isEmpty())action(panel,dialog,positive,true,onPositive,DialogInterface.BUTTON_POSITIVE);
        if(!neutral.isEmpty())action(panel,dialog,neutral,false,onNeutral,DialogInterface.BUTTON_NEUTRAL);
        if(!negative.isEmpty())action(panel,dialog,negative,false,onNegative,DialogInterface.BUTTON_NEGATIVE);
        ScrollView scroll=new ScrollView(activity);scroll.setFillViewport(false);scroll.addView(panel);scroll.setClipToOutline(true);scroll.setBackground(bg(activity,Color.WHITE,26));
        dialog.setContentView(scroll);dialog.setOnShowListener(d->{Window w=dialog.getWindow();if(w==null)return;w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE|WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);WindowManager.LayoutParams p=w.getAttributes();p.dimAmount=.42f;p.width=Math.min(activity.getResources().getDisplayMetrics().widthPixels-dp(activity,32),dp(activity,460));p.height=WindowManager.LayoutParams.WRAP_CONTENT;w.setAttributes(p);w.setWindowAnimations(R.style.CardModalAnimation);scroll.post(()->{int max=(int)(activity.getResources().getDisplayMetrics().heightPixels*.80f);if(scroll.getHeight()>max)w.setLayout(p.width,max);});});
        dialog.show();return dialog;
    }
    private void action(LinearLayout parent,Dialog dialog,String label,boolean primary,DialogInterface.OnClickListener callback,int which){Button b=button(activity,label,primary,()->{dialog.dismiss();if(callback!=null)callback.onClick(dialog,which);});parent.addView(b,new LinearLayout.LayoutParams(-1,-2));gap(parent,9);}
}
