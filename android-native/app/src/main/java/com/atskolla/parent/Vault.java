package com.atskolla.parent;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** All tokens and cached student data are encrypted with a non-exportable device key. */
final class Vault {
    private final SharedPreferences prefs;
    private final String alias="atskolla-parent-native-v1";
    Vault(Context c) { prefs=c.getSharedPreferences("native-vault",Context.MODE_PRIVATE); }
    private SecretKey key() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(!ks.containsAlias(alias)) {
            KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            g.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            g.generateKey();
        }
        return ((KeyStore.SecretKeyEntry)ks.getEntry(alias,null)).getSecretKey();
    }
    synchronized void put(String name,String value) throws Exception {
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());
        String data=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
        prefs.edit().putString(name,data).apply();
    }
    synchronized String get(String name) {
        try {
            String raw=prefs.getString(name,"");if(raw.isEmpty())return "";
            String[] p=raw.split(":",2);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p[0],Base64.NO_WRAP)));
            return new String(c.doFinal(Base64.decode(p[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);
        } catch(Exception e) { prefs.edit().remove(name).apply();return ""; }
    }
    synchronized void clear(){prefs.edit().clear().apply();}
}
