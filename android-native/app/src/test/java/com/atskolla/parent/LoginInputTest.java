package com.atskolla.parent;
import org.junit.Test;
import static org.junit.Assert.*;
public class LoginInputTest {
 @Test public void keepsAllSixteenDigitsFromFormattedClipboard(){assertEquals("0000123456789012",LoginInput.digits("0000 1234 5678 9012"));assertEquals("0000123456789012",LoginInput.digits("0000\u00a01234\u202f5678\n9012"));}
 @Test public void preservesLeadingZeroes(){assertEquals("0000000000000001",LoginInput.digits("0000 0000 0000 0001"));}
 @Test public void normalizesIndonesianWhatsappFormats(){for(String p:new String[]{"081234567890","+62 812-3456-7890","81234567890"})assertEquals("6281234567890",LoginInput.phone(p));assertTrue(LoginInput.validPhone(LoginInput.phone("081234567890")));assertFalse(LoginInput.validPhone("1234567890"));}
}
