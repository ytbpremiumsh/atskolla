package com.atskolla.teacher;
import android.content.Context;import android.graphics.*;import android.view.View;import org.json.JSONObject;import java.util.*;import static com.atskolla.teacher.Json.*;
final class AttendanceChart extends View {
 final int[] counts=new int[4];final Paint paint=new Paint(3);final String[] labels={"Hadir","Sakit","Izin","Alfa"};
 AttendanceChart(Context c,List<JSONObject> logs){super(c);for(JSONObject log:logs){int i=ReportFiles.index(s(log,"status"));if(i>=0)counts[i]++;}setContentDescription("Grafik kehadiran: hadir "+counts[0]+", sakit "+counts[1]+", izin "+counts[2]+", alfa "+counts[3]);}
 @Override protected void onDraw(Canvas c){super.onDraw(c);float density=getResources().getDisplayMetrics().density;float w=getWidth()/4f,h=getHeight()-35*density;int max=Math.max(1,Arrays.stream(counts).max().orElse(1));paint.setTextSize(11*density);paint.setTextAlign(Paint.Align.CENTER);for(int i=0;i<4;i++){float x=w*i+w*.5f,top=h-Math.max(3*density,(h-22*density)*counts[i]/max);paint.setColor(new int[]{0xFF10B981,0xFF3B82F6,0xFFF59E0B,0xFFEF4444}[i]);c.drawRoundRect(x-w*.25f,top,x+w*.25f,h,6*density,6*density,paint);c.drawText(String.valueOf(counts[i]),x,top-5*density,paint);paint.setColor(Ui.MUTED);c.drawText(labels[i],x,h+20*density,paint);}}
}
