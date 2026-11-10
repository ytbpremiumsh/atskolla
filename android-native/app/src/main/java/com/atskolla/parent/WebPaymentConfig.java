package com.atskolla.parent;

import android.content.Context;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

/** Channel labels, logos and defaults are generated directly from the web source at build. */
final class WebPaymentConfig {
    final JSONObject data;final JSONArray channels;
    WebPaymentConfig(Context context) throws Exception {try(InputStream in=context.getAssets().open("payment-channels.json")){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] part=new byte[4096];int count;while((count=in.read(part))!=-1)bytes.write(part,0,count);data=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));channels=data.getJSONArray("channels");}}
    double qrisPercent(JSONObject server){double p=server.optDouble("qris_percent",data.optDouble("qrisPercent",.01));return Double.isFinite(p)&&p>=0?p:data.optDouble("qrisPercent",.01);}
    double qrisMinimum(){return data.optDouble("qrisMinimum",3000);}
    String qrisDisclosure(double amount,JSONObject server){return QrisFeeDisclosure.describe(amount,qrisPercent(server),qrisMinimum());}
    String qrisPolicy(double amount,JSONObject server){String s=qrisDisclosure(amount,server);return s.substring(0,s.lastIndexOf("\n"));}
    String qrisCalculation(double amount,JSONObject server){String s=qrisDisclosure(amount,server);return s.substring(s.lastIndexOf("\n")+1);}
    boolean enabled(JSONObject channel,JSONObject server){JSONArray list=server.optJSONArray("enabled_channels");if(list==null)return false;for(int i=0;i<list.length();i++)if(list.optString(i).equals(channel.optString("id"))){JSONArray methods=server.optJSONArray("methods");if(methods==null)return false;for(int m=0;m<methods.length();m++)if(methods.optJSONObject(m).optString("channel").equals(channel.optString("id")))return true;}return false;}
    double fee(JSONObject channel,double amount,JSONObject server){return server.optDouble("admin_fee",3000);}
}
