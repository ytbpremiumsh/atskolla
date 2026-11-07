package com.atskolla.parent;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;

/** Pixel-level regression check for reused Paint alpha; debug fixture only. */
final class BrandRenderCheck {
    static void run(Context context){
        Drawable brand=Ui.brand(context,false);brand.setBounds(0,0,400,400);
        int expected=0;
        for(int frame=0;frame<3;frame++){
            Bitmap bitmap=Bitmap.createBitmap(400,400,Bitmap.Config.ARGB_8888);
            brand.draw(new Canvas(bitmap));int pixel=bitmap.getPixel(200,200);bitmap.recycle();
            if(Color.alpha(pixel)<250)throw new IllegalStateException("Brand gradient lost opacity after redraw");
            if(frame==0)expected=pixel;else if(pixel!=expected)throw new IllegalStateException("Brand gradient changed across redraws");
        }
    }
}
