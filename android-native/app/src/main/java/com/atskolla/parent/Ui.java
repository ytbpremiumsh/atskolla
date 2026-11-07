package com.atskolla.parent;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;

final class Ui {
    static final int BLUE=Color.rgb(91,108,249),INK=Color.rgb(36,38,47),MUTED=Color.rgb(107,120,143),BG=Color.rgb(245,246,250),LINE=Color.rgb(228,230,239);
    static int dp(Context c,float v){return Math.round(v*c.getResources().getDisplayMetrics().density);}
    static GradientDrawable bg(Context c,int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(c,radius));return d;}
    static LinearLayout column(Context c){LinearLayout v=new LinearLayout(c);v.setOrientation(LinearLayout.VERTICAL);return v;}
    static LinearLayout row(Context c){LinearLayout v=new LinearLayout(c);v.setGravity(Gravity.CENTER_VERTICAL);return v;}
    static TextView text(Context c,String value,int size,int color,boolean bold){TextView t=new TextView(c);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setFontFeatureSettings("kern");if(bold)t.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));t.setLineSpacing(dp(c,3),1);return t;}
    static void pad(View v,int all){int d=dp(v.getContext(),all);v.setPadding(d,d,d,d);}
    static void gap(LinearLayout v,int height){View gap=new View(v.getContext());v.addView(gap,new LinearLayout.LayoutParams(1,dp(v.getContext(),height)));}
    static LinearLayout card(Context c){LinearLayout v=column(c);pad(v,20);v.setBackground(surface(c,0xFFF0F1FF,24));v.setElevation(0);return v;}
    static Button button(Context c,String label,boolean primary,Runnable action){Button b=new Button(c){@Override public void setEnabled(boolean enabled){super.setEnabled(enabled);setAlpha(enabled?1f:.48f);}};b.setStateListAnimator(null);b.setElevation(0);b.setTranslationZ(0);b.setMinimumWidth(0);b.setMinWidth(0);b.setText(label);b.setAllCaps(false);b.setTextSize(14);b.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));b.setTextColor(primary?Color.WHITE:BLUE);b.setMinHeight(dp(c,48));b.setPadding(dp(c,16),dp(c,8),dp(c,16),dp(c,8));b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x225268E0),primary?gradient(c,BLUE,0xFF4C5DED,16):surface(c,0xFFEEF0FF,16),null));b.setOnClickListener(v->action.run());return b;}
    static EditText input(Context c,String hint,int type){EditText e=new EditText(c);e.setHint(hint);e.setTextSize(16);e.setTextColor(INK);e.setHintTextColor(MUTED);e.setInputType(type);e.setSingleLine(true);e.setMinHeight(dp(c,56));e.setPadding(dp(c,16),dp(c,12),dp(c,16),dp(c,12));GradientDrawable d=bg(c,BG,14);d.setStroke(dp(c,1),LINE);e.setBackground(d);return e;}
    static GradientDrawable gradient(Context c,int start,int end,int radius){GradientDrawable d=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{start,end});d.setCornerRadius(dp(c,radius));return d;}
    static GradientDrawable surface(Context c,int tint,int radius){GradientDrawable d=gradient(c,Color.WHITE,tint,radius);d.setStroke(dp(c,1),LINE);return d;}
    static Button colorButton(Context c,String label,int start,int end,Runnable action){Button b=button(c,label,true,action);b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x30FFFFFF),gradient(c,start,end,16),null));return b;}
    static android.graphics.drawable.Drawable brand(Context c, boolean dark){
        return new android.graphics.drawable.Drawable(){
            final Paint paint=new Paint(3);
            @Override public void draw(Canvas canvas){
                Rect b=getBounds(); float r=dp(c,24); Path clip=new Path();clip.addRoundRect(new RectF(b),r,r,Path.Direction.CW);
                canvas.save();canvas.clipPath(clip);
                paint.setColor(Color.WHITE);paint.setAlpha(255);paint.setStyle(Paint.Style.FILL);paint.setShader(new LinearGradient(b.left,b.top,b.right,b.bottom,new int[]{BLUE,0xFF4338CA,dark?0xFF1E1B4B:0xFF4C5DED},null,Shader.TileMode.CLAMP));canvas.drawRect(b,paint);paint.setShader(null);
                paint.setColor(0x16FFFFFF);canvas.drawCircle(b.right,b.top,dp(c,130),paint);canvas.drawCircle(b.left,b.bottom,dp(c,90),paint);
                paint.setColor(0x14FFFFFF);for(int x=b.left+12;x<b.right;x+=dp(c,24))for(int y=b.top+12;y<b.bottom;y+=dp(c,24))canvas.drawCircle(x,y,dp(c,1),paint);
                canvas.restore();
            }
            @Override public void setAlpha(int a){} @Override public void setColorFilter(ColorFilter f){} @Override public int getOpacity(){return PixelFormat.TRANSLUCENT;}
        };
    }
    static TextView chip(Context c,String label,int color,int fill){TextView t=text(c,label,11,color,true);t.setPadding(dp(c,10),dp(c,5),dp(c,10),dp(c,5));t.setBackground(bg(c,fill,20));return t;}
    static FrameLayout iconTile(Context c,String kind,int color,int fill,int size){FrameLayout tile=new FrameLayout(c);tile.setBackground(bg(c,fill,16));tile.addView(new Glyph(c,kind,color),new FrameLayout.LayoutParams(dp(c,size/2),dp(c,size/2),Gravity.CENTER));return tile;}
    static class Glyph extends View {
        final String kind;final int color;final Paint p=new Paint(3);
        Glyph(Context c,String kind,int color){super(c);this.kind=kind;this.color=color;setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
        @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);canvas.save();canvas.scale(getWidth()/24f,getHeight()/24f);p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.7f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);Path path=new Path();
            switch(kind){
                case "logout":canvas.drawRoundRect(3,3,13,21,2,2,p);canvas.drawLine(10,12,22,12,p);path.moveTo(18,8);path.lineTo(22,12);path.lineTo(18,16);canvas.drawPath(path,p);break;
                case "send":path.moveTo(2,10);path.lineTo(22,2);path.lineTo(15,22);path.lineTo(10,14);path.close();canvas.drawPath(path,p);canvas.drawLine(10,14,22,2,p);break;
                case "clock":canvas.drawCircle(12,12,9,p);canvas.drawLine(12,6,12,12,p);canvas.drawLine(12,12,16,15,p);break;
                case "sparkle":path.moveTo(12,2);path.lineTo(15,9);path.lineTo(22,12);path.lineTo(15,15);path.lineTo(12,22);path.lineTo(9,15);path.lineTo(2,12);path.lineTo(9,9);path.close();canvas.drawPath(path,p);break;
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
