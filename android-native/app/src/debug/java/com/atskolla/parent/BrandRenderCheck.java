package com.atskolla.parent;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;

/** Pixel-level regression check for reused Paint alpha; debug fixture only. */
final class BrandRenderCheck {
    static void run(Context context){
        Drawable icon=context.getDrawable(R.drawable.launcher_mark);icon.setBounds(0,0,108,108);Bitmap launcher=Bitmap.createBitmap(108,108,Bitmap.Config.ARGB_8888);icon.draw(new Canvas(launcher));for(int y=0;y<108;y++)for(int x=0;x<108;x++){int p=launcher.getPixel(x,y);if(Color.alpha(p)!=255||Math.max(Color.red(p),Math.max(Color.green(p),Color.blue(p)))<150)throw new IllegalStateException("Launcher contains transparent or dark background");}if(launcher.getPixel(0,0)!=Color.WHITE)throw new IllegalStateException("Launcher background is not white");launcher.recycle();
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
