package com.atskolla.parent;
import android.content.Context;
import org.json.JSONArray;
import java.util.LinkedHashSet;

final class ParentPushDedup {
 static boolean claim(Context c,String event)throws Exception{
  if(event==null||event.isEmpty())return false;
  synchronized(Vault.LOCK){Vault vault=new Vault(c);LinkedHashSet<String> seen=new LinkedHashSet<>();try{JSONArray a=new JSONArray(vault.get("push_events_seen"));for(int i=0;i<a.length();i++)seen.add(a.getString(i));}catch(Exception ignored){}
   if(seen.contains(event))return false;seen.add(event);while(seen.size()>1024)seen.remove(seen.iterator().next());vault.put("push_events_seen",new JSONArray(seen).toString());return true;
  }
 }
}
