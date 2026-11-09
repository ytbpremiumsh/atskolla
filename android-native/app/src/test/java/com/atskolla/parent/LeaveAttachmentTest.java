package com.atskolla.parent;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class LeaveAttachmentTest {
 @Test public void detectsFilesWithoutProviderMime()throws Exception{
  assertEquals("application/pdf",LeaveAttachment.mime("%PDF-1.7".getBytes(StandardCharsets.US_ASCII)));
  assertEquals("image/jpeg",LeaveAttachment.mime(new byte[]{(byte)255,(byte)216,(byte)255,0}));
  assertEquals("image/png",LeaveAttachment.mime(new byte[]{(byte)137,80,78,71,13,10,26,10}));
  assertEquals("image/webp",LeaveAttachment.mime("RIFF0000WEBP".getBytes(StandardCharsets.US_ASCII)));
 }
 @Test(expected=IOException.class) public void rejectsDisguisedFile()throws Exception{LeaveAttachment.mime("not a pdf".getBytes(StandardCharsets.US_ASCII));}
 @Test(expected=IOException.class) public void boundsStreamWithoutTrustingReportedSize()throws Exception{LeaveAttachment.read(new ByteArrayInputStream(new byte[LeaveAttachment.LIMIT+1]));}
 @Test(expected=IOException.class) public void rejectsEmptyFile()throws Exception{LeaveAttachment.read(new ByteArrayInputStream(new byte[0]));}
 @Test public void preservesCalendarDays(){assertEquals(0,ScheduleDays.fromIsoDay(1));assertEquals("Senin",ScheduleDays.NAMES[0]);assertEquals(6,ScheduleDays.fromIsoDay(7));assertEquals("Minggu",ScheduleDays.NAMES[6]);}
}
