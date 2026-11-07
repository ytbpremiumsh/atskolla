package com.atskolla.parent;

import android.graphics.*;
import com.google.zxing.*;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.util.*;

/** Native rounded QR modules and indigo finders, matching the web card's styling. */
final class StudentQr {
    static Bitmap render(String value,int size) throws Exception {
        Map<EncodeHintType,Object> hints=new EnumMap<>(EncodeHintType.class);hints.put(EncodeHintType.MARGIN,4);hints.put(EncodeHintType.CHARACTER_SET,"UTF-8");hints.put(EncodeHintType.ERROR_CORRECTION,ErrorCorrectionLevel.Q);
        BitMatrix matrix=new MultiFormatWriter().encode(value,BarcodeFormat.QR_CODE,0,0,hints);
        int count=matrix.getWidth(),q=4,last=count-q-7;float unit=size/(float)count;
        Bitmap bitmap=Bitmap.createBitmap(size,size,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(bitmap);canvas.drawColor(Color.WHITE);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setColor(0xFF0F172A);
        for(int y=0;y<count;y++)for(int x=0;x<count;x++){
            if(!matrix.get(x,y)||finder(x,y,q,q)||finder(x,y,last,q)||finder(x,y,q,last))continue;
            float l=x*unit,t=y*unit,r=l+unit,b=t+unit,cx=l+unit/2,cy=t+unit/2;
            canvas.drawRoundRect(l,t,r,b,unit/2,unit/2,paint);
            if(x>0&&matrix.get(x-1,y))canvas.drawRect(l,t,cx,b,paint);
            if(x<count-1&&matrix.get(x+1,y))canvas.drawRect(cx,t,r,b,paint);
            if(y>0&&matrix.get(x,y-1))canvas.drawRect(l,t,r,cy,paint);
            if(y<count-1&&matrix.get(x,y+1))canvas.drawRect(l,cy,r,b,paint);
        }
        finder(canvas,paint,q,q,unit);finder(canvas,paint,last,q,unit);finder(canvas,paint,q,last,unit);return bitmap;
    }
    private static boolean finder(int x,int y,int l,int t){return x>=l&&x<l+7&&y>=t&&y<t+7;}
    private static void finder(Canvas canvas,Paint paint,int x,int y,float u){float l=x*u,t=y*u;paint.setColor(0xFF4F46E5);canvas.drawRoundRect(l,t,l+7*u,t+7*u,2.2f*u,2.2f*u,paint);paint.setColor(Color.WHITE);canvas.drawRoundRect(l+u,t+u,l+6*u,t+6*u,1.3f*u,1.3f*u,paint);paint.setColor(0xFF4F46E5);canvas.drawRoundRect(l+2*u,t+2*u,l+5*u,t+5*u,.6f*u,.6f*u,paint);}
}
