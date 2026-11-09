package com.atskolla.parent;

import org.json.*;
import android.content.Context;

/** Local sample data only. This activity and its fixtures do not exist in release builds. */
public class NativePreviewActivity extends ParentActivity {
    @Override protected boolean preview(){return true;}
    @Override protected void startPreview(){
        BrandRenderCheck.run(this);QrIdentityCheck.run(this);api=new Fixtures(this);token="native-ui-preview";studentId="sample-student";
        JSONObject student=j("id",studentId,"name","Nadia Putri","class","VII A","student_id","DEMO-001","card_number","0000000000000000","qr_code","ATSkolla-demo","parent_name","Orang Tua Nadia","parent_phone","","schools",j("name","Sekolah Contoh"));
        students=new JSONArray().put(student);screen=getIntent().getStringExtra("screen");if(screen==null)screen="home";String modal=getIntent().getStringExtra("modal");if(modal!=null){screen="spp";dashboard();if(modal.equals("installment")){InstallmentChoiceCheck.run(this);installments(InstallmentChoiceCheck.invoice());}else if(modal.equals("students"))chooseStudent();else if(modal.equals("ready"))showPaymentReady(j("id","sample-bill","period_label","SPP November 2026","invoice_number","TEST/202611/001","total_amount",250000),0,student,"qris",j("service_fee",3000,"total_charged",253000),"https://jokul.doku.com/checkout/link/fixture");else if(modal.equals("payment"))payment(j("id","sample-bill","period_label","SPP Contoh","total_amount",250000),0);else alert("Pembayaran berhasil","SPP Contoh sudah dikonfirmasi server.\nNadia Putri • 13:45 WIB");}else dashboard();
    }
    static class Fixtures extends ParentApi {
        Fixtures(Context c){super(c);}
        @Override JSONObject call(String action,JSONObject args,String token){
            switch(action){
                case "installment_list":return InstallmentChoiceCheck.summary();
                case "payment_config":return j("fees",j("qris",3000,"va",3000,"retail",5000));
                case "me":return j("students",new JSONArray().put(j("id","sample-student","name","Nadia Putri","class","VII A","student_id","DEMO-001","card_number","0000000000000000","qr_code","ATSkolla-demo","schools",j("name","Sekolah Contoh"))));
                case "attendance":return j("ok",true,"attendance",new JSONArray().put(j("date",day().toString(),"time","07:04","status","hadir","attendance_type","masuk","notes","Tepat waktu")).put(j("date",day().toString(),"time","14:05","status","hadir","attendance_type","pulang","notes","Pulang sekolah")));
                case "announcements":return j("announcements",new JSONArray().put(j("title","Pertemuan orang tua dan wali kelas","message","Mari bersama mendukung perjalanan belajar ananda. Pertemuan dilaksanakan di aula sekolah.","created_at",day().toString(),"is_pinned",true)));
                case "schedule":return j("schedule",new JSONArray().put(j("day_of_week",0,"start_time","07:30","end_time","08:30","room","Ruang 7A","subjects",j("name","Matematika"),"profiles",j("full_name","Ibu Guru"))).put(j("day_of_week",0,"start_time","08:30","end_time","09:30","subjects",j("name","Bahasa Indonesia dan Sastra Nusantara"),"profiles",j("full_name","Bapak Guru dengan nama yang lebih panjang"))).put(j("day_of_week",1,"start_time","09:00","end_time","10:00","room","Laboratorium","subjects",j("name","Informatika","color","#10B981"),"profiles",j("full_name","Ibu Ratna"))));
                case "spp_list":return j("invoices",new JSONArray().put(j("id","sample-bill","period_label","SPP Oktober 2026","invoice_number","DEMO/202610/001","total_amount",250000,"amount",250000,"status","expired","due_date","2026-10-25","bill_type","other","allow_installment",true)).put(j("id","sample-paid","period_label","SPP September 2026","invoice_number","DEMO/202609/001","total_amount",250000,"status","paid","paid_at","2026-09-12")));
                case "list_leaves":return j("leaves",new JSONArray().put(j("type","izin","date",day().minusDays(5).toString(),"reason","Keperluan keluarga","status","approved","review_note","Semoga urusannya dilancarkan.")));
                case "homeroom":return j("teacher",j("full_name","Ibu Ratna","phone",""),"school",j("name","Sekolah Contoh","address","Informasi sekolah dari server"),"class_name","VII A");
                case "calendar":return j("events",new JSONArray().put(j("date","2026-10-26","label","Pertemuan wali murid","description","Aula sekolah pukul 09.00 WIB","is_holiday",false)));
                default:return j("ok",true);
            }
        }
    }
}
