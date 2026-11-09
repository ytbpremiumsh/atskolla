package com.atskolla.parent;

import java.io.*;
import java.nio.charset.StandardCharsets;

final class LeaveAttachment {
    static final int LIMIT=5*1024*1024;
    static byte[] read(InputStream input) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] chunk=new byte[8192];int n;
        while((n=input.read(chunk))!=-1){if(out.size()+n>LIMIT)throw new IOException("Lampiran maksimal 5 MB");out.write(chunk,0,n);}
        byte[] data=out.toByteArray();mime(data);return data;
    }
    static String mime(byte[] b) throws IOException {
        if(b.length>=5&&new String(b,0,5,StandardCharsets.US_ASCII).equals("%PDF-"))return "application/pdf";
        if(b.length>=3&&(b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255)return "image/jpeg";
        if(b.length>=8&&(b[0]&255)==137&&b[1]==80&&b[2]==78&&b[3]==71&&b[4]==13&&b[5]==10&&b[6]==26&&b[7]==10)return "image/png";
        if(b.length>=12&&new String(b,0,4,StandardCharsets.US_ASCII).equals("RIFF")&&new String(b,8,4,StandardCharsets.US_ASCII).equals("WEBP"))return "image/webp";
        throw new IOException("Pilih berkas PDF, JPG, PNG, atau WebP yang valid");
    }
    private LeaveAttachment(){}
}
