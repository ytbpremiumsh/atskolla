package com.atskolla.parent;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;

final class Ui {
    static final int BLUE=Color.rgb(82,104,224),INK=Color.rgb(24,36,61),MUTED=Color.rgb(107,120,143),BG=Color.rgb(246,248,252),LINE=Color.rgb(232,237,246);
    static int dp(Context c,float v){return Math.round(v*c.getResources().getDisplayMetrics().density);}
    static GradientDrawable bg(Context c,int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(c,radius));return d;}
    static LinearLayout column(Context c){LinearLayout v=new LinearLayout(c);v.setOrientation(LinearLayout.VERTICAL);return v;}
    static LinearLayout row(Context c){LinearLayout v=new LinearLayout(c);v.setGravity(Gravity.CENTER_VERTICAL);return v;}
    static TextView text(Context c,String value,int size,int color,boolean bold){TextView t=new TextView(c);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setFontFeatureSettings("kern");if(bold)t.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));t.setLineSpacing(dp(c,3),1);return t;}
    static void pad(View v,int all){int d=dp(v.getContext(),all);v.setPadding(d,d,d,d);}
    static void gap(LinearLayout v,int height){View gap=new View(v.getContext());v.addView(gap,new LinearLayout.LayoutParams(1,dp(v.getContext(),height)));}
    static LinearLayout card(Context c){LinearLayout v=column(c);pad(v,20);v.setBackground(bg(c,Color.WHITE,20));v.setElevation(dp(c,1));return v;}
    static Button button(Context c,String label,boolean primary,Runnable action){Button b=new Button(c);b.setText(label);b.setAllCaps(false);b.setTextSize(14);b.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));b.setTextColor(primary?Color.WHITE:BLUE);b.setMinHeight(dp(c,48));b.setPadding(dp(c,16),dp(c,8),dp(c,16),dp(c,8));b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x225268E0),bg(c,primary?BLUE:0xFFF0F3FF,14),null));b.setOnClickListener(v->action.run());return b;}
    static EditText input(Context c,String hint,int type){EditText e=new EditText(c);e.setHint(hint);e.setTextSize(16);e.setTextColor(INK);e.setHintTextColor(MUTED);e.setInputType(type);e.setSingleLine(true);e.setMinHeight(dp(c,56));e.setPadding(dp(c,16),dp(c,12),dp(c,16),dp(c,12));GradientDrawable d=bg(c,BG,14);d.setStroke(dp(c,1),LINE);e.setBackground(d);return e;}
    static class Glyph extends View {
        final String kind;final int color;final Paint p=new Paint(3);
        Glyph(Context c,String kind,int color){super(c);this.kind=kind;this.color=color;setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
        @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);canvas.save();canvas.scale(getWidth()/24f,getHeight()/24f);p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.7f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);Path path=new Path();
            switch(kind){
                case "home":path.moveTo(3,10);path.lineTo(12,3);path.lineTo(21,10);path.lineTo(21,21);path.lineTo(15,21);path.lineTo(15,14);path.lineTo(9,14);path.lineTo(9,21);path.lineTo(3,21);path.close();canvas.drawPath(path,p);break;
                case "wallet":canvas.drawRoundRect(3,6,21,20,3,3,p);canvas.drawRoundRect(14,10,22,16,2,2,p);canvas.drawLine(4,6,18,3,p);canvas.drawPoint(17,13,p);break;
                case "calendar":canvas.drawRoundRect(3,5,21,21,3,3,p);canvas.drawLine(3,10,21,10,p);canvas.drawLine(8,3,8,7,p);canvas.drawLine(16,3,16,7,p);canvas.drawLine(7,14,10,14,p);canvas.drawLine(14,14,17,14,p);canvas.drawLine(7,17,10,17,p);break;
                case "check":canvas.drawRoundRect(4,3,20,21,3,3,p);path.moveTo(8,12);path.lineTo(11,15);path.lineTo(16,9);canvas.drawPath(path,p);break;
                case "message":canvas.drawRoundRect(3,4,21,18,4,4,p);path.moveTo(5,18);path.lineTo(5,22);path.lineTo(10,18);canvas.drawPath(path,p);canvas.drawLine(7,9,17,9,p);canvas.drawLine(7,13,14,13,p);break;
                case "card":canvas.drawRoundRect(2,5,22,20,3,3,p);canvas.drawCircle(8,11,2,p);canvas.drawArc(4,14,12,20,190,160,false,p);canvas.drawLine(14,10,18,10,p);canvas.drawLine(14,14,19,14,p);break;
                case "refresh":canvas.drawArc(4,4,20,20,40,290,false,p);path.moveTo(20,3);path.lineTo(20,9);path.lineTo(14,9);canvas.drawPath(path,p);break;
                case "chevron":path.moveTo(9,5);path.lineTo(16,12);path.lineTo(9,19);canvas.drawPath(path,p);break;
                case "bell":path.moveTo(5,17);path.lineTo(7,14);path.lineTo(7,9);path.cubicTo(7,2,17,2,17,9);path.lineTo(17,14);path.lineTo(19,17);path.close();canvas.drawPath(path,p);canvas.drawArc(10,17,14,22,0,180,false,p);break;
                default:for(int x=4;x<20;x+=10)for(int y=4;y<20;y+=10)canvas.drawRoundRect(x,y,x+6,y+6,1.5f,1.5f,p);
            }canvas.restore();}
    }
}
