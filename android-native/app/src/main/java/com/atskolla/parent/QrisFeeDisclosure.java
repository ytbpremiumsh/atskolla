package com.atskolla.parent;

import java.text.NumberFormat;
import java.util.Locale;

final class QrisFeeDisclosure {
    private static String money(double value){return "Rp " + NumberFormat.getIntegerInstance(new Locale("id","ID")).format(value);}
    static String describe(double amount,double rate,double minimum){
        double base=Math.max(0,amount), calculated=Math.round(base*rate), actual=Math.max(minimum,calculated);
        String percent=java.math.BigDecimal.valueOf(rate).multiply(java.math.BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString().replace('.',',')+"%";
        String text="Biaya layanan QRIS: "+percent+" dari nominal pembayaran, minimal "+money(minimum)+".\n";
        if(rate>0)text+="Ambang nominal: "+money(minimum/rate)+". Di atas ambang, biaya mengikuti persentase (dibulatkan ke rupiah).\n";
        text+=percent+" × "+money(base)+" = "+money(calculated)+". ";
        return text+(calculated<minimum?"Berlaku biaya minimum ":"Biaya layanan ")+money(actual)+".";
    }
}
