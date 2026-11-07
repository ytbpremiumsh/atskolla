package com.atskolla.parent;

import android.webkit.WebView;
import org.json.*;

/** No real gateway, accounts or network calls are used by this checkout fixture. */
public final class PaymentPreviewActivity extends PaymentActivity {
    @Override protected ParentApi createApi(){return new ParentApi(this){int checks;
        @Override JSONObject call(String action,JSONObject args,String token){boolean paid="paid".equals(getIntent().getStringExtra("mode"))&&++checks>=2;return ParentActivity.j("invoices",new JSONArray().put(ParentActivity.j("id","test-checkout","status",paid?"paid":"pending","paid_at",java.time.Instant.now().toString())));}
    };}
    @Override protected void loadProvider(WebView view,String url){view.loadDataWithBaseURL("https://jokul.doku.com/","<html><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;padding:24px;background:#f4f5ff'><h2>Halaman pembayaran uji</h2><p>Sukses pada halaman ini tidak mengubah status tagihan.</p><p>Keputusan tetap menunggu server.</p></body></html>","text/html","UTF-8",null);}
}
