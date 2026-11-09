package com.atskolla.parent;
import org.junit.Test;
import static org.junit.Assert.*;
public class QrisFeeDisclosureTest {
 @Test public void minimumAndThreshold(){String s=QrisFeeDisclosure.describe(100000,.01,3000);assertTrue(s.contains("1%"));assertTrue(s.contains("Rp 300.000"));assertTrue(s.contains("Berlaku biaya minimum Rp 3.000"));}
 @Test public void aboveThreshold(){String s=QrisFeeDisclosure.describe(1000000,.01,3000);assertTrue(s.contains("Biaya layanan Rp 10.000"));}
 @Test public void usesServerRate(){String s=QrisFeeDisclosure.describe(1000000,.007,3000);assertTrue(s.contains("0,7%"));assertTrue(s.contains("Biaya layanan Rp 7.000"));}
}
