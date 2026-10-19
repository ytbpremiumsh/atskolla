package com.atskolla.parent;

import org.json.*;
import android.content.Context;

/** Local sample data only. This activity and its fixtures do not exist in release builds. */
public class NativePreviewActivity extends ParentActivity {
    @Override protected boolean preview(){return true;}
    @Override protected void startPreview(){
        api=new Fixtures(this);token="native-ui-preview";studentId="sample-student";
        JSONObject student=j("id",studentId,"name","Nadia Putri","class","VII A","student_id","DEMO-001","card_number","0000000000000000","qr_code","ATSkolla-demo","parent_name","Orang Tua Nadia","parent_phone","","schools",j("name","Sekolah Contoh"));
        students=new JSONArray().put(student);screen=getIntent().getStringExtra("screen");if(screen==null)screen="home";dashboard();
    }
    static class Fixtures extends ParentApi {
        Fixtures(Context c){super(c);}
        @Override JSONObject call(String action,JSONObject args,String token){
            switch(action){
                case "attendance":return j("ok",true,"attendance",new JSONArray().put(j("date",day().toString(),"time","07:04","status","hadir","attendance_type","masuk","notes","Tepat waktu")));
                case "announcements":return j("announcements",new JSONArray().put(j("title","Pertemuan orang tua dan wali kelas","message","Mari bersama mendukung perjalanan belajar ananda. Pertemuan dilaksanakan di aula sekolah.","created_at",day().toString(),"is_pinned",true)));
                case "schedule":return j("schedule",new JSONArray().put(j("day_of_week",1,"start_time","07:30","end_time","08:30","room","Ruang 7A","subjects",j("name","Matematika"),"profiles",j("full_name","Ibu Guru"))).put(j("day_of_week",1,"start_time","08:30","end_time","09:30","subjects",j("name","Bahasa Indonesia"),"profiles",j("full_name","Bapak Guru"))));
                case "spp_list":return j("invoices",new JSONArray().put(j("id","sample-bill","period_label","SPP Oktober 2026","invoice_number","DEMO/202610/001","total_amount",250000,"amount",250000,"status","pending","due_date","2026-10-25","bill_type","spp")).put(j("id","sample-paid","period_label","SPP September 2026","invoice_number","DEMO/202609/001","total_amount",250000,"status","paid","paid_at","2026-09-12")));
                case "list_leaves":return j("leaves",new JSONArray().put(j("type","izin","date",day().minusDays(5).toString(),"reason","Keperluan keluarga","status","approved","review_note","Semoga urusannya dilancarkan.")));
                case "homeroom":return j("teacher",j("full_name","Ibu Ratna","phone",""),"school",j("name","Sekolah Contoh","address","Informasi sekolah dari server"),"class_name","VII A");
                case "grades":return j("grades",new JSONArray().put(j("subject","Matematika","school_year","2026/2027","semester","1","term","UTS","score",92,"note","Pertahankan semangat belajar.")));
                case "list_messages":return j("messages",new JSONArray().put(j("sender_type","teacher","message","Selamat pagi, perkembangan belajar Nadia sangat baik minggu ini.","created_at",day().toString())).put(j("sender_type","parent","message","Terima kasih atas bimbingannya, Bu.","created_at",day().toString())));
                case "calendar":return j("events",new JSONArray().put(j("date","2026-10-26","label","Pertemuan wali murid","description","Aula sekolah pukul 09.00 WIB","is_holiday",false)));
                default:return j("ok",true);
            }
        }
    }
}
