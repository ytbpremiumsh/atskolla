package com.atskolla.teacher;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
final class Json {
 static JSONObject j(Object...p){JSONObject o=new JSONObject();try{for(int i=0;i<p.length;i+=2)o.put(String.valueOf(p[i]),p[i+1]);}catch(JSONException e){throw new IllegalArgumentException(e);}return o;}
 static String s(JSONObject o,String k){if(o==null)return "";String v=o.optString(k,"");return v.equals("null")?"":v;}
 static double n(JSONObject o,String k){return o==null?0:o.optDouble(k,0);}
 static JSONArray a(JSONObject o,String k){JSONArray v=o==null?null:o.optJSONArray(k);return v==null?new JSONArray():v;}
 static JSONObject o(JSONObject o,String k){JSONObject v=o==null?null:o.optJSONObject(k);return v==null?new JSONObject():v;}
 static JSONObject first(JSONArray a){return a.length()==0?new JSONObject():a.optJSONObject(0);}
 static List<JSONObject> list(JSONArray a){List<JSONObject> r=new ArrayList<>();for(int i=0;i<a.length();i++)if(a.optJSONObject(i)!=null)r.add(a.optJSONObject(i));return r;}
 static String date(String d){try{return LocalDate.parse(d.substring(0,10)).format(DateTimeFormatter.ofPattern("d MMM yyyy",new Locale("id","ID")));}catch(Exception e){return d;}}
 static String time(String t){return t.length()>5?t.substring(0,5):t;}
 static String label(String t){switch(t){case "hadir":return "Hadir";case "sakit":return "Sakit";case "izin":return "Izin";case "alfa":return "Alfa";case "pending":return "Menunggu";case "approved":return "Disetujui";case "rejected":return "Ditolak";default:return t;}}
 static String q(Object...p){StringBuilder b=new StringBuilder();for(int i=0;i<p.length;i+=2){if(b.length()>0)b.append('&');b.append(android.net.Uri.encode(String.valueOf(p[i]))).append('=').append(android.net.Uri.encode(String.valueOf(p[i+1])));}return b.toString();}
 static String filter(String v){return "\""+v.replace("\\","\\\\").replace("\"","\\\"")+"\"";}
 static int color(String status){switch(status){case "hadir":case "approved":return 0xFF10B981;case "izin":case "pending":return 0xFFF59E0B;case "sakit":return 0xFF3B82F6;case "alfa":case "rejected":return 0xFFEF4444;default:return Ui.MUTED;}}
}
