package com.atskolla.parent;

import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;

/** Method-independent arrival/departure identity, with no fabricated absence events. */
final class AttendanceEvents {
    static String direction(JSONObject row){
        if(!"hadir".equalsIgnoreCase(row.optString("status")))return "";
        switch(row.optString("attendance_type").toLowerCase(java.util.Locale.ROOT)){
            case "masuk":case "datang":case "check_in":return "Datang";
            case "pulang":case "check_out":return "Pulang";
            default:return "";
        }
    }
    static Instant instant(JSONObject row){try{
        String time=row.optString("time");if(time.length()==5)time+=":00";
        return LocalDateTime.of(LocalDate.parse(row.optString("date")),LocalTime.parse(time)).atZone(ZoneId.of("Asia/Jakarta")).toInstant();
    }catch(Exception e){return null;}}
    static String key(String student,JSONObject row){return student+"|"+row.optString("date")+"|"+row.optString("time")+"|"+direction(row);}
    static boolean fresh(JSONObject row,Instant since,Instant now){Instant event=instant(row);return !direction(row).isEmpty()&&event!=null&&!event.isBefore(since)&&!event.isAfter(now.plusSeconds(300));}
}
