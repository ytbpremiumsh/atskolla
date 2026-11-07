package com.atskolla.parent;

import java.net.URI;

final class CheckoutPolicy {
    static boolean allowed(String value){try{URI uri=new URI(value);if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getUserInfo()!=null||(uri.getPort()!=-1&&uri.getPort()!=443))return false;String host=uri.getHost();if(host==null)return false;host=host.toLowerCase(java.util.Locale.ROOT);for(String domain:new String[]{"atskolla.com","doku.com","mayar.id","myr.id","ipaymu.com"})if(host.equals(domain)||host.endsWith("."+domain))return true;return false;}catch(Exception e){return false;}}
    static boolean confirmed(org.json.JSONObject row,String expectedId){return expectedId.equals(row.optString("id"))&&"paid".equals(row.optString("status"));}
}
