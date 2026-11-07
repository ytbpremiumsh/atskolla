package com.atskolla.teacher;
import org.json.*;
import java.io.*;
import java.time.*;
import java.util.*;
import static com.atskolla.teacher.Json.*;

/** The same tables, fields and attendance conflict keys used by the web teacher dashboard. */
class TeacherStore {
 final TeacherApi api;JSONObject profile=new JSONObject(),school=new JSONObject();JSONArray roles=new JSONArray(),assignments=new JSONArray(),schedules=new JSONArray(),classes=new JSONArray(),subjects=new JSONArray(),teachers=new JSONArray();
 TeacherStore(TeacherApi api){this.api=api;}
 String uid(){return api.uid();}String schoolId(){return s(profile,"school_id");}String scope(){return q("school_id","eq."+schoolId());}
 ZoneId zone(){switch(s(school,"timezone")){case "WITA":return ZoneId.of("Asia/Makassar");case "WIT":return ZoneId.of("Asia/Jayapura");default:return ZoneId.of("Asia/Jakarta");}}
 LocalDate today(){return LocalDate.now(zone());}String timeNow(){return LocalTime.now(zone()).withNano(0).toString();}
 void initialize()throws Exception{
  profile=first(api.get("profiles",q("select","*","user_id","eq."+uid())));if(schoolId().isEmpty())throw new IOException("Akun belum terhubung ke sekolah. Hubungi admin sekolah.");
  roles=api.get("user_roles",q("select","role","user_id","eq."+uid()));boolean permitted=false;for(JSONObject r:list(roles))if(Arrays.asList("teacher","wali_kelas").contains(s(r,"role")))permitted=true;
  assignments=api.get("class_teachers",scope()+"&"+q("select","class_name,school_id","user_id","eq."+uid()));if(!permitted&&assignments.length()==0)throw new IOException("Akun ini tidak memiliki akses Guru atau Wali Kelas.");
  school=first(api.get("schools",q("id","eq."+schoolId(),"select","id,name,address,city,logo,timezone,is_suspended,suspended_reason,holiday_mode,holiday_mode_label,holiday_days")));checkSchool();
  schedules=api.all("teaching_schedules",scope()+"&"+q("select","*","teacher_id","eq."+uid(),"is_active","eq.true","order","day_of_week,start_time"));
  classes=api.all("classes",scope()+"&"+q("select","id,name,wa_group_id","order","name"));subjects=api.all("subjects",scope()+"&"+q("select","id,name,color"));teachers=api.all("profiles",scope()+"&"+q("select","user_id,full_name"));
 }
 void checkSchool()throws IOException{if(school.optBoolean("is_suspended"))throw new IOException("Akses sekolah ditangguhkan. "+s(school,"suspended_reason"));}
 List<String> waliClasses(){List<String> out=new ArrayList<>();for(JSONObject a:list(assignments))out.add(s(a,"class_name"));return out;}
 boolean wali(String name){return waliClasses().contains(name);}
 String className(JSONObject schedule){return name(classes,"id",s(schedule,"class_id"),"name");}String subject(JSONObject schedule){return name(subjects,"id",s(schedule,"subject_id"),"name");}
 static String name(JSONArray values,String key,String id,String value){for(JSONObject o:list(values))if(s(o,key).equals(id))return s(o,value);return "—";}
 String scheduleState(JSONObject schedule,LocalDate day){if(schedule.optInt("day_of_week")!=day.getDayOfWeek().getValue()%7)return "Hari lain";String now=timeNow(),start=s(schedule,"start_time"),end=s(schedule,"end_time");return now.compareTo(start)>=0&&now.compareTo(end)<0?"Sedang berlangsung":now.compareTo(end)>=0?"Selesai":"Akan datang";}
 JSONArray students(String className)throws Exception{boolean allowed=wali(className);for(JSONObject s:list(schedules))if(className(s).equals(className))allowed=true;if(!allowed)throw new IOException("Kelas tidak ditugaskan kepada Anda");return api.all("students",scope()+"&"+q("select","id,name,student_id,class,gender,photo_url,parent_name,parent_phone,card_number,qr_code","class","eq."+className,"order","name"));}
 JSONArray schoolStudents()throws Exception{return api.all("students",scope()+"&"+q("select","id,name,student_id,class,photo_url,parent_name,parent_phone","order","name"));}
 JSONArray logs(String from,String to,String type)throws Exception{return api.all("attendance_logs",scope()+"&"+q("select","id,student_id,date,time,status,method,attendance_type,notes","date","gte."+from,"date","lte."+to,"attendance_type","eq."+type,"order","date.desc,time.desc"));}
 JSONArray mapelLogs(JSONObject schedule,String from,String to)throws Exception{
  StringBuilder ids=new StringBuilder();for(JSONObject a:list(schedules))if(s(a,"class_id").equals(s(schedule,"class_id"))&&s(a,"subject_id").equals(s(schedule,"subject_id"))){if(ids.length()>0)ids.append(',');ids.append(s(a,"id"));}
  if(ids.length()==0)throw new IOException("Jadwal mengajar tidak ditugaskan kepada Anda");
  return api.all("subject_attendance",scope()+"&"+q("select","id,student_id,date,status,notes,teaching_schedule_id","teacher_id","eq."+uid(),"teaching_schedule_id","in.("+ids+")","date","gte."+from,"date","lte."+to,"order","date.desc"));
 }
 void holidayCheck(String day)throws Exception{
  JSONObject fresh=first(api.get("schools",q("id","eq."+schoolId(),"select","holiday_mode,holiday_mode_label,holiday_days,is_suspended,suspended_reason")));if(fresh.optBoolean("is_suspended"))throw new IOException("Akses sekolah ditangguhkan");
  if(fresh.optBoolean("holiday_mode"))throw new IOException("Absensi ditangguhkan: Mode libur "+s(fresh,"holiday_mode_label"));int dow=LocalDate.parse(day).getDayOfWeek().getValue()%7;JSONArray days=a(fresh,"holiday_days");for(int i=0;i<days.length();i++)if(days.optInt(i)==dow)throw new IOException("Hari libur mingguan sekolah");
  JSONArray dates=api.get("school_holidays",scope()+"&"+q("select","label","date","eq."+day,"is_holiday","eq.true","limit",1));if(dates.length()>0)throw new IOException("Libur sekolah: "+s(first(dates),"label"));
 }
 void saveSubject(JSONObject schedule,JSONArray pupils,Map<String,String> states,String note)throws Exception{
  boolean owns=false;for(JSONObject row:list(schedules))if(s(row,"id").equals(s(schedule,"id")))owns=true;if(!owns)throw new IOException("Jadwal tidak ditugaskan kepada Anda");holidayCheck(today().toString());JSONArray records=new JSONArray();for(JSONObject pupil:list(pupils)){String status=states.get(s(pupil,"id"));checkStatus(status);records.put(j("student_id",s(pupil,"id"),"teaching_schedule_id",s(schedule,"id"),"school_id",schoolId(),"teacher_id",uid(),"date",today().toString(),"status",status,"notes",note.trim().isEmpty()?JSONObject.NULL:note.trim()));}
  if(records.length()==0)throw new IOException("Belum ada siswa");JSONArray saved=api.write("POST","subject_attendance",q("on_conflict","student_id,teaching_schedule_id,date"),records,true);if(saved.length()!=records.length())throw new IOException("Sebagian absensi belum tersimpan; muat ulang untuk memeriksa");
 }
 void saveManual(String className,String day,JSONArray pupils,Map<String,String> changes,JSONArray existing)throws Exception{
  if(!wali(className))throw new IOException("Anda bukan wali kelas ini");if(day.equals(today().toString()))holidayCheck(day);Map<String,JSONObject> byId=new HashMap<>();for(JSONObject p:list(pupils))byId.put(s(p,"id"),p);
  for(Map.Entry<String,String> change:changes.entrySet()){if(!byId.containsKey(change.getKey()))throw new IOException("Siswa tidak terdaftar di kelas ini");checkStatus(change.getValue());String logId="";for(JSONObject log:list(existing))if(s(log,"student_id").equals(change.getKey())){logId=s(log,"id");break;}if(logId.isEmpty()){JSONArray fresh=api.get("attendance_logs",scope()+"&"+q("student_id","eq."+change.getKey(),"date","eq."+day,"attendance_type","eq.datang","select","id","limit",1));logId=s(first(fresh),"id");}JSONObject payload=j("status",change.getValue(),"time",timeNow());JSONArray result;
   if(!logId.isEmpty())result=api.write("PATCH","attendance_logs",scope()+"&"+q("id","eq."+logId,"student_id","eq."+change.getKey(),"date","eq."+day,"attendance_type","eq.datang"),payload,false);
   else{payload.put("school_id",schoolId());payload.put("student_id",change.getKey());payload.put("date",day);payload.put("attendance_type","datang");payload.put("method","manual");result=api.write("POST","attendance_logs","",payload,false);}
   if(result.length()!=1)throw new IOException("Absensi belum tersimpan; muat ulang untuk memeriksa");
   if(day.equals(today().toString())&&change.getValue().equals("hadir"))notifyAttendance(byId.get(change.getKey()),"datang","Manual Wali Kelas");
  }
 }
 static void checkStatus(String status)throws IOException{if(!Arrays.asList("hadir","izin","sakit","alfa").contains(status))throw new IOException("Status absensi tidak valid");}
 JSONArray leaves()throws Exception{JSONArray rows=api.all("parent_leave_requests",scope()+"&"+q("select","id,type,date,reason,status,review_note,created_at,attachment_url,parent_phone,student_id,students(name,class,student_id)","order","created_at.desc"));JSONArray own=new JSONArray();for(JSONObject row:list(rows))if(wali(s(o(row,"students"),"class")))own.put(row);return own;}
 void review(JSONObject row,String result,String note)throws Exception{
  if(!wali(s(o(row,"students"),"class")))throw new IOException("Pengajuan bukan kelas Anda");JSONArray updated=api.write("PATCH","parent_leave_requests",scope()+"&"+q("id","eq."+s(row,"id"),"status","eq.pending"),j("status",result,"review_note",note.isEmpty()?JSONObject.NULL:note,"reviewed_by",uid(),"reviewed_at",Instant.now().toString()),false);if(updated.length()!=1)throw new IOException("Pengajuan sudah berubah. Muat ulang untuk memeriksa");
  if(result.equals("approved")){JSONArray existing=api.get("attendance_logs",scope()+"&"+q("student_id","eq."+s(row,"student_id"),"date","eq."+s(row,"date"),"attendance_type","eq.datang","select","id"));JSONObject payload=j("status",s(row,"type").equals("sakit")?"sakit":"izin","method","manual","notes","Disetujui dari pengajuan wali murid: "+s(row,"reason"),"recorded_by",uid());JSONArray sync;
   if(existing.length()>0)sync=api.write("PATCH","attendance_logs",scope()+"&"+q("id","eq."+s(first(existing),"id")),payload,false);else{payload.put("school_id",schoolId());payload.put("student_id",s(row,"student_id"));payload.put("date",s(row,"date"));payload.put("attendance_type","datang");sync=api.write("POST","attendance_logs","",payload,false);}if(sync.length()!=1)throw new IOException("Pengajuan tersimpan tetapi sinkronisasi absensi belum selesai. Periksa absensi manual.");
  }
  if(!s(row,"parent_phone").isEmpty())try{api.function("send-whatsapp",j("school_id",schoolId(),"phone",s(row,"parent_phone"),"message","Pengajuan "+s(row,"type")+" "+(result.equals("approved")?"DISETUJUI":"DITOLAK")+"\n"+s(o(row,"students"),"name")+" • "+date(s(row,"date"))+"\n"+note,"message_type","leave_review"));}catch(Exception ignored){}
 }
 String attendanceType()throws Exception{JSONObject settings=first(api.get("dismissal_settings",scope()+"&"+q("select","attendance_start_time,attendance_end_time,departure_start_time,departure_end_time")));String now=timeNow(),start=s(settings,"attendance_start_time"),end=s(settings,"attendance_end_time"),dep=s(settings,"departure_start_time"),depEnd=s(settings,"departure_end_time");if(start.isEmpty())start="06:00:00";if(end.isEmpty())end="12:00:00";if(dep.isEmpty())dep="12:00:00";if(depEnd.isEmpty())depEnd="17:00:00";return now.compareTo(start)<0||now.compareTo(start)>=0&&now.compareTo(end)<0?"datang":"pulang";}
 JSONObject lookup(String code)throws Exception{code=code.trim();if(code.isEmpty()||code.length()>200)throw new IOException("Kode tidak valid");JSONArray found=api.get("students",scope()+"&"+q("select","*","or","(student_id.eq."+filter(code)+",qr_code.eq."+filter(code)+",rfid_uid.eq."+filter(code)+",card_number.eq."+filter(code)+")","limit",1));if(found.length()>0)return j("type","student","person",first(found));
  String or="(qr_code.eq."+filter(code)+",rfid_uid.eq."+filter(code);if(code.matches("[a-fA-F0-9-]{36}"))or+=",user_id.eq."+code;or+=")";JSONObject teacher=first(api.get("profiles",scope()+"&"+q("select","user_id,full_name,photo_url","or",or,"limit",1)));if(s(teacher,"user_id").isEmpty())throw new IOException("Kode tidak ditemukan di sekolah ini");JSONArray rs=api.get("user_roles",q("user_id","eq."+s(teacher,"user_id"),"select","role"));for(JSONObject r:list(rs))if(Arrays.asList("teacher","staff","bendahara","school_admin").contains(s(r,"role")))return j("type","teacher","person",teacher);throw new IOException("Kode bukan akun Guru/Staff yang aktif");
 }
 void confirmScan(JSONObject match,String method)throws Exception{holidayCheck(today().toString());String type=attendanceType();boolean teacher=s(match,"type").equals("teacher");JSONObject person=o(match,"person");String id=s(person,teacher?"user_id":"id"),table=teacher?"teacher_attendance_logs":"attendance_logs",field=teacher?"user_id":"student_id";
  JSONArray exists=api.get(table,scope()+"&"+q(field,"eq."+id,"date","eq."+today(),"attendance_type","eq."+type,"select","id"));if(exists.length()>0)throw new IOException("Absensi "+type+" sudah tercatat hari ini");JSONArray saved=api.write("POST",table,"",j("school_id",schoolId(),field,id,"date",today().toString(),"time",timeNow(),"method",method,"status","hadir","attendance_type",type,"recorded_by",s(profile,"full_name")),false);if(saved.length()!=1)throw new IOException("Absensi belum tersimpan");if(!teacher)notifyAttendance(person,type,method);
 }
 void notifyAttendance(JSONObject pupil,String type,String method){try{
  JSONObject integration=first(api.get("school_integrations",scope()+"&"+q("integration_type","eq.onesender","select","attendance_arrive_template,attendance_depart_template,attendance_group_template,wa_delivery_target,wa_enabled,is_active","limit",1)));if(!integration.optBoolean("wa_enabled",true)||integration.length()==0)return;String target=s(integration,"wa_delivery_target"),parent=s(pupil,"parent_phone"),group=name(classes,"name",s(pupil,"class"),"wa_group_id");String template=s(integration,type.equals("datang")?"attendance_arrive_template":"attendance_depart_template");String fallback="*Notifikasi Absensi "+(type.equals("datang")?"Datang":"Pulang")+"*\n\n"+s(school,"name")+"\n"+s(pupil,"name")+" • "+s(pupil,"class")+"\n"+date(today().toString())+" • "+timeNow()+"\nMetode: "+method;
  String message=template.isEmpty()?fallback:apply(template,pupil,type,method);
  if(!parent.isEmpty()&&!target.equals("group_only"))api.function("send-whatsapp",j("school_id",schoolId(),"phone",parent,"message",message,"message_type","attendance","student_name",s(pupil,"name")));
  if(!group.isEmpty()&&(target.equals("group_only")||target.equals("both"))){String t=s(integration,"attendance_group_template");api.function("send-whatsapp",j("school_id",schoolId(),"group_id",group,"message",t.isEmpty()?fallback:apply(t,pupil,type,method),"message_type","attendance_group","student_name",s(pupil,"name")));}
 }catch(Exception ignored){/* Attendance is durable; delivery failure must not repeat attendance writes. */}}
 String apply(String text,JSONObject pupil,String type,String method){return text.replace("{student_name}",s(pupil,"name")).replace("{class}",s(pupil,"class")).replace("{time}",timeNow().substring(0,5)).replace("{date}",date(today().toString())).replace("{day}",today().getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL,new Locale("id","ID"))).replace("{student_id}",s(pupil,"student_id")).replace("{method}",method).replace("{parent_name}",s(pupil,"parent_name")).replace("{school_name}",s(school,"name")).replace("{type}",type.equals("datang")?"Datang (Hadir)":"Pulang");}
}
