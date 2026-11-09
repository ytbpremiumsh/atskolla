package com.atskolla.parent;

import android.graphics.*;
import android.text.*;
import android.text.style.ReplacementSpan;
import android.widget.EditText;

/** Paint-only group gaps: the actual Editable always contains up to 16 digits. */
final class CardNumberField {
    static void configure(EditText field){
        field.setFilters(new InputFilter[]{(source,start,end,dest,dstart,dend)->{
            String raw=source.subSequence(start,end).toString(),digits=LoginInput.digits(raw);
            return raw.equals(digits)?null:digits;
        },new InputFilter.LengthFilter(16)});
        field.addTextChangedListener(new TextWatcher(){
            public void beforeTextChanged(CharSequence s,int start,int count,int after){}
            public void onTextChanged(CharSequence s,int start,int before,int count){}
            public void afterTextChanged(Editable text){
                for(GroupGap span:text.getSpans(0,text.length(),GroupGap.class))text.removeSpan(span);
                for(int i=3;i<text.length()-1;i+=4)text.setSpan(new GroupGap(field.getResources().getDisplayMetrics().density*7),i,i+1,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            }
        });
    }
    static final class GroupGap extends ReplacementSpan {
        final float gap;GroupGap(float value){gap=value;}
        public int getSize(Paint paint,CharSequence text,int start,int end,Paint.FontMetricsInt fm){if(fm!=null)paint.getFontMetricsInt(fm);return (int)Math.ceil(paint.measureText(text,start,end)+gap);}
        public void draw(Canvas canvas,CharSequence text,int start,int end,float x,int top,int y,int bottom,Paint paint){canvas.drawText(text,start,end,x,y,paint);}
    }
    private CardNumberField(){}
}
