package com.atskolla.parent;
import java.time.Instant;
import java.util.Arrays;

final class InvoiceNoticePolicy {
    static boolean shouldNotify(boolean firstCheck,String status,String createdAt,String enabledAt){
        if(!Arrays.asList("pending","unpaid","expired","failed","partial").contains(status))return false;
        if(!firstCheck)return true;
        try{return !Instant.parse(createdAt).isBefore(Instant.parse(enabledAt));}catch(Exception e){return false;}
    }
    private InvoiceNoticePolicy(){}
}
