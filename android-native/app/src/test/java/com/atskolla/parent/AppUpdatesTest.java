package com.atskolla.parent;
import org.junit.Test;
import static org.junit.Assert.*;

public class AppUpdatesTest {
 @Test public void restrictsUpdateDownloadsToOfficialHttpsHosts(){
  assertTrue(AppUpdates.trustedUrl("https://www.atskolla.com/app-updates/parent.apk"));
  assertTrue(AppUpdates.trustedUrl("https://github.com/ytbpremiumsh/atskolla/releases/download/v2.11.0/parent.apk"));
  assertFalse(AppUpdates.trustedUrl("http://www.atskolla.com/update.apk"));
  assertFalse(AppUpdates.trustedUrl("https://www.atskolla.com.evil.test/update.apk"));
  assertFalse(AppUpdates.trustedUrl("https://www.atskolla.com@evil.test/update.apk"));
  assertFalse(AppUpdates.trustedUrl("file:///tmp/update.apk"));
  assertFalse(AppUpdates.trustedUrl("https://www.atskolla.com:8080/update.apk"));
 }
}
