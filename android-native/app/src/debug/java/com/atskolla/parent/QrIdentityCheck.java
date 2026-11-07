package com.atskolla.parent;

import android.graphics.Bitmap;
import com.google.zxing.*;
import com.google.zxing.common.HybridBinarizer;
import org.json.JSONObject;

/** Decode the actual rendered bitmap; distinct pupils must retain their web identities. */
final class QrIdentityCheck {
    static void run(ParentActivity activity) {
        try {
            check(activity, ParentActivity.j("id","a","student_id","NIS-A","qr_code","web-siswa-A"), "web-siswa-A");
            check(activity, ParentActivity.j("id","b","student_id","NIS-B","qr_code","web-siswa-B"), "web-siswa-B");
            check(activity, ParentActivity.j("id","c","student_id","NIS-C"), "NIS-C");
            check(activity, ParentActivity.j("id","d"), "d");
            check(activity, ParentActivity.j("id","f","qr_code","00000000-1111-2222-3333-444444444444"), "00000000-1111-2222-3333-444444444444");
            check(activity, ParentActivity.j("id","g","qr_code","1234567890123456"), "1234567890123456");
            check(activity, ParentActivity.j("id","e","qr_code","Siswa-É-学校"), "Siswa-É-学校");
        } catch (Exception error) { throw new IllegalStateException("Student QR differs from web identity",error); }
    }
    private static void check(ParentActivity activity, JSONObject student, String expected) throws Exception {
        Bitmap bitmap=activity.studentQr(student,768);
        int width=bitmap.getWidth(),height=bitmap.getHeight();int[] pixels=new int[width*height];
        bitmap.getPixels(pixels,0,width,0,0,width,height);
        String result=new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(width,height,pixels)))).getText();
        bitmap.recycle();if(!expected.equals(result))throw new IllegalStateException("Wrong pupil QR");
    }
}
