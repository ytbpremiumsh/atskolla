package com.atskolla.teacher;
import android.content.Context;import org.json.*;import java.util.*;import java.time.*;import static com.atskolla.teacher.Json.*;
/** Synthetic data only. This file does not exist in release builds. */
final class FixtureApi extends TeacherApi {
 static final String UID="11111111-1111-4111-8111-111111111111",SCHOOL="22222222-2222-4222-8222-222222222222";final List<JSONObject> writes=new ArrayList<>();boolean holiday,suspended;
 FixtureApi(Context c){super(c);}
 @Override String uid(){return UID;}@Override boolean signedIn(){return true;}
 JSONObject profile(){return j("user_id",UID,"full_name","Ibu Ratna Puspita","school_id",SCHOOL,"qr_code",UID);}
 JSONArray pupils(){return new JSONArray().put(j("id","student-1","name","Nadia Putri","student_id","NIS-001","class","VII A","parent_name","Wali Nadia","parent_phone","","photo_url","" )).put(j("id","student-2","name","Gilang Ramadhan","student_id","NIS-002","class","VII A","parent_name","Wali Gilang","parent_phone","","photo_url",""));}
 JSONObject schedule(){return j("id","schedule-1","teacher_id",UID,"school_id",SCHOOL,"class_id","class-1","subject_id","subject-1","day_of_week",LocalDate.now(ZoneId.of("Asia/Jakarta")).getDayOfWeek().getValue()%7,"start_time","07:00:00","end_time","09:00:00","room","Ruang 7A","is_active",true);}
 @Override JSONArray get(String table,String query){String today=LocalDate.now(ZoneId.of("Asia/Jakarta")).toString();switch(table){
 case "profiles":return new JSONArray().put(profile());
 case "user_roles":return new JSONArray().put(j("role","teacher"));
 case "schools":return new JSONArray().put(j("id",SCHOOL,"name","Sekolah Contoh Cendekia","address","Jalan Pendidikan, Indonesia","timezone","WIB","holiday_mode",holiday,"is_suspended",suspended,"holiday_days",new JSONArray()));
 case "class_teachers":return new JSONArray().put(j("class_name","VII A","school_id",SCHOOL));
 case "classes":return new JSONArray().put(j("id","class-1","name","VII A","wa_group_id",""));
 case "subjects":return new JSONArray().put(j("id","subject-1","name","Matematika","color","#5B6CF9"));
 case "teaching_schedules":return new JSONArray().put(schedule());
 case "students":return pupils();
 case "subject_attendance":return new JSONArray().put(j("id","subject-log","student_id","student-1","date",today,"status","hadir","notes","Persamaan linear dan latihan kelompok","teaching_schedule_id","schedule-1"));
 case "attendance_logs":return new JSONArray().put(j("id","arrival-1","student_id","student-1","date",today,"time","07:02:00","status","hadir","method","barcode","attendance_type","datang"));
 case "school_holidays":return query.contains("is_holiday=eq.true")?new JSONArray():new JSONArray().put(j("id","calendar-1","date",today,"label","Kegiatan literasi sekolah","description","Membaca bersama di perpustakaan.","is_holiday",false,"event_type","event"));
 case "parent_leave_requests":return new JSONArray().put(j("id","leave-1","student_id","student-1","date",today,"type","sakit","reason","Istirahat sesuai anjuran dokter","status","pending","parent_phone","","students",j("name","Nadia Putri","class","VII A","student_id","NIS-001"))).put(j("id","leave-other","student_id","other","date",today,"type","izin","status","pending","students",j("class","VIII B")));
 case "school_announcements":return new JSONArray().put(j("id","announcement-1","title","Pertemuan wali murid","message","<p>Mari mendampingi perjalanan belajar siswa.</p>","type","info","is_pinned",true,"created_at",today));
 case "notifications":return new JSONArray().put(j("id","notif-1","title","Informasi rapat guru","message","Rapat dewan guru di ruang pertemuan.","created_at",today,"created_by",UID,"is_read",false));
 case "school_integrations":return new JSONArray();
 case "dismissal_settings":return new JSONArray().put(j("attendance_start_time","06:00:00","attendance_end_time","12:00:00","departure_start_time","12:00:00","departure_end_time","17:00:00"));
 default:return new JSONArray();}}
 @Override JSONArray all(String table,String query){return get(table,query);}
 @Override JSONArray write(String method,String table,String query,Object body,boolean upsert)throws Exception{writes.add(j("method",method,"table",table,"query",query,"body",body,"upsert",upsert));return body instanceof JSONArray?(JSONArray)body:new JSONArray().put(body);}
 @Override JSONObject function(String name,JSONObject body){writes.add(j("function",name));return j("ok",true);}
}
