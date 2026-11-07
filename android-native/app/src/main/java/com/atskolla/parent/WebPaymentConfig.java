package com.atskolla.parent;

import android.content.Context;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

/** Channel labels, logos and defaults are generated directly from the web source at build. */
final class WebPaymentConfig {
    final JSONObject data;final JSONArray channels;
    WebPaymentConfig(Context context) throws Exception {try(InputStream in=context.getAssets().open("payment-channels.json")){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] part=new byte[4096];int count;while((count=in.read(part))!=-1)bytes.write(part,0,count);data=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));channels=data.getJSONArray("channels");}}
    double fee(JSONObject channel,double amount,JSONObject server){String id=channel.optString("id");if(id.equals("qris")){double percent=server.optDouble("qris_percent",data.optDouble("qrisPercent",.01));if(!Double.isFinite(percent)||percent<0)percent=data.optDouble("qrisPercent",.01);return Math.max(data.optDouble("qrisMinimum",3000),Math.round(Math.max(0,amount)*percent));}JSONObject fees=server.optJSONObject("fees");return fees!=null&&fees.has(id)?fees.optDouble(id,channel.optDouble("fee")):channel.optDouble("fee");}
}
