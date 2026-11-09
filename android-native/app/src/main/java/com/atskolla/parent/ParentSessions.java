package com.atskolla.parent;

import android.content.Context;
import org.json.JSONObject;

/** Re-authenticates only with a card explicitly remembered after successful card login. */
final class ParentSessions {
    private static final Object RENEW_LOCK=new Object();
    static String renew(Context context,ParentApi api,String expected) throws Exception {
        synchronized(RENEW_LOCK){
            Vault vault=new Vault(context);String current=vault.get("token");
            if(current.isEmpty())return ""; // Explicit logout must never be reversed by an old request.
            if(!current.equals(expected))return current;
            String card=vault.get("remembered_card");if(card.isEmpty())return "";
            JSONObject response=api.call("login_card",new JSONObject().put("card_number",card),"");
            String next=response.optString("token");if(next.isEmpty())throw new java.io.IOException("Sesi baru tidak tersedia");
            synchronized(Vault.LOCK){
                current=vault.get("token");if(!current.equals(expected))return current;
                vault.put("token",next);
                ParentPush.sync(context);
            }
            return next;
        }
    }
}
