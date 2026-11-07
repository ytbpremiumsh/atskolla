package com.atskolla.teacher;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.*;
import android.view.*;
import android.view.animation.LinearInterpolator;

/** Small native 2D school scene. No video, network, people images or animation library. */
final class SchoolMotionView extends View {
    final Paint p=new Paint(3);final RectF rect=new RectF();final Path clip=new Path();ValueAnimator clock;float phase,touch;final boolean dark;
    SchoolMotionView(Context c,boolean dark){super(c);this.dark=dark;setContentDescription("Ilustrasi sekolah ATSkolla bergerak. Ketuk untuk berinteraksi.");setLayerType(View.LAYER_TYPE_NONE,null);}
    @Override protected void onAttachedToWindow(){super.onAttachedToWindow();if(android.os.Build.VERSION.SDK_INT>=26&&!ValueAnimator.areAnimatorsEnabled())return;clock=ValueAnimator.ofFloat(0,1);clock.setDuration(7000);clock.setRepeatCount(ValueAnimator.INFINITE);clock.setInterpolator(new LinearInterpolator());clock.addUpdateListener(a->{phase=(float)a.getAnimatedValue();invalidate();});clock.start();}
    @Override protected void onDetachedFromWindow(){if(clock!=null){clock.cancel();clock=null;}animate().cancel();super.onDetachedFromWindow();}
    @Override protected void onWindowVisibilityChanged(int visibility){super.onWindowVisibilityChanged(visibility);if(clock!=null){if(visibility==VISIBLE)clock.resume();else clock.pause();}}
    @Override public boolean onTouchEvent(MotionEvent event){if(event.getAction()==MotionEvent.ACTION_UP){performClick();animate().scaleX(1.035f).scaleY(1.035f).setDuration(140).withEndAction(()->animate().scaleX(1).scaleY(1).setDuration(220).start()).start();return true;}return true;}
    @Override public boolean performClick(){super.performClick();return true;}
    void round(Canvas c,float l,float t,float r,float b,float radius,int color){p.setColor(color);p.setStyle(Paint.Style.FILL);rect.set(l,t,r,b);c.drawRoundRect(rect,radius,radius,p);}
    @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);canvas.save();canvas.scale(getWidth()/360f,getHeight()/210f);clip.reset();rect.set(0,0,360,210);clip.addRoundRect(rect,24,24,Path.Direction.CW);canvas.clipPath(clip);float drift=(float)Math.sin(phase*Math.PI*2)*5;
        round(canvas,0,0,360,210,24,dark?0xFF4C55E8:0xFFEEF0FF);p.setColor(dark?0x226CE4D0:0x225B6CF9);canvas.drawCircle(320,30,92,p);canvas.drawCircle(32,205,85,p);
        for(int i=0;i<7;i++){p.setColor(dark?0x55FFFFFF:0x445B6CF9);canvas.drawCircle(25+i*51,24+(i%3)*44+drift,2+(i%2),p);}
        round(canvas,119,78+drift,243,177+drift,10,0xFFFFFFFF);round(canvas,107,70+drift,255,88+drift,8,0xFFB6BDFE);round(canvas,169,137+drift,194,177+drift,5,0xFF5B6CF9);
        for(int x=134;x<237;x+=36)round(canvas,x,103+drift,x+18,123+drift,4,0xFFDEE2FF);
        p.setColor(0xFF5B6CF9);p.setStrokeWidth(3);canvas.drawLine(181,70+drift,181,38+drift,p);round(canvas,181,37+drift,212,53+drift,3,0xFF21B998);
        round(canvas,47,86-drift,96,143-drift,10,0xFFFFFFFF);round(canvas,57,99-drift,85,106-drift,3,0xFF5B6CF9);round(canvas,57,114-drift,77,119-drift,2,0xFFB6BDFE);round(canvas,57,125-drift,81,130-drift,2,0xFFB6BDFE);
        round(canvas,271,105+drift,318,152+drift,12,0xFF21B998);p.setColor(Color.WHITE);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(3);Path check=new Path();check.moveTo(282,127+drift);check.lineTo(290,135+drift);check.lineTo(306,118+drift);canvas.drawPath(check,p);p.setStyle(Paint.Style.FILL);
        canvas.restore();
    }
}
