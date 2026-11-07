package com.atskolla.teacher;
import android.content.Context;
import android.os.SystemClock;
import android.view.*;
import android.widget.ScrollView;

/** Defer expensive data rebinds until both dragging and fling have settled. */
final class SoftScrollView extends ScrollView {
    private boolean dragging;private long motion;
    SoftScrollView(Context context){super(context);setSmoothScrollingEnabled(true);setOverScrollMode(OVER_SCROLL_IF_CONTENT_SCROLLS);setVerticalScrollBarEnabled(false);setFadingEdgeLength(0);}
    @Override public boolean onTouchEvent(MotionEvent event){if(event.getActionMasked()==MotionEvent.ACTION_DOWN)dragging=true;else if(event.getActionMasked()==MotionEvent.ACTION_UP||event.getActionMasked()==MotionEvent.ACTION_CANCEL)dragging=false;motion=SystemClock.uptimeMillis();return super.onTouchEvent(event);}
    @Override protected void onScrollChanged(int x,int y,int oldX,int oldY){super.onScrollChanged(x,y,oldX,oldY);motion=SystemClock.uptimeMillis();}
    boolean busy(){return dragging||SystemClock.uptimeMillis()-motion<250;}
    void whenIdle(Runnable action){if(busy())postDelayed(()->whenIdle(action),100);else action.run();}
}
