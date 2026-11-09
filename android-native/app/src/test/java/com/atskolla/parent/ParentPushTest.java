package com.atskolla.parent;
import org.junit.Test;
import static org.junit.Assert.*;
public class ParentPushTest {
 @Test public void sessionBindingMatchesServerSha256()throws Exception{
  assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",ParentPush.fingerprint("abc"));
  assertNotEquals(ParentPush.fingerprint("old-session"),ParentPush.fingerprint("new-session"));
 }
}
