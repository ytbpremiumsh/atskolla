package com.atskolla.parent;
import org.junit.Test;
import static org.junit.Assert.*;
public class InvoiceNoticePolicyTest {
 @Test public void includesNewBillOnFirstBackgroundCheck(){assertTrue(InvoiceNoticePolicy.shouldNotify(true,"pending","2026-11-09T05:01:00Z","2026-11-09T05:00:00Z"));}
 @Test public void doesNotReplayHistoricalBills(){assertFalse(InvoiceNoticePolicy.shouldNotify(true,"pending","2026-11-08T05:01:00Z","2026-11-09T05:00:00Z"));assertFalse(InvoiceNoticePolicy.shouldNotify(true,"pending","",""));}
 @Test public void ignoresPaidBillsAndKeepsLaterNewIds(){assertFalse(InvoiceNoticePolicy.shouldNotify(false,"paid","",""));assertTrue(InvoiceNoticePolicy.shouldNotify(false,"unpaid","",""));}
 @Test public void removedFeaturesCannotBeReopenedFromSavedRoutes(){assertEquals("more",ParentMenu.screen("messages"));assertEquals("more",ParentMenu.screen("grades"));assertEquals("spp",ParentMenu.screen("spp"));for(String[] item:ParentMenu.ITEMS){assertNotEquals("messages",item[0]);assertNotEquals("grades",item[0]);}}
}
