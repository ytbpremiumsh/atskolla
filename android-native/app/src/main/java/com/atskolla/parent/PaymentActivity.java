package com.atskolla.parent;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.util.concurrent.*;
import static com.atskolla.parent.Ui.*;

/** Embedded provider checkout only. No parent credentials or native JavaScript bridge. */
public class PaymentActivity extends Activity {
    private final Handler main=new Handler(Looper.getMainLooper());private final ExecutorService io=Executors.newSingleThreadExecutor();
    protected ParentApi api;protected Vault vault;private WebView web;private TextView status;private JSONObject student,invoice;private String childId,invoiceId,installmentId,auth;private volatile boolean checking;private boolean resumed,completed;
    private final Runnable poll=new Runnable(){public void run(){if(!resumed||completed)return;check();main.postDelayed(this,5000);}};
    protected ParentApi createApi(){return new ParentApi(this);}
    @Override public void onCreate(Bundle state){super.onCreate(state);api=createApi();vault=new Vault(this);auth=vault.get("token");
        try{student=new JSONObject(getIntent().getStringExtra("student"));invoice=new JSONObject(getIntent().getStringExtra("invoice"));childId=student.getString("id");invoiceId=invoice.getString("id");installmentId=getIntent().getStringExtra("installment_id");if(installmentId==null)installmentId="";}catch(Exception e){finish();return;}
        String url=getIntent().getStringExtra("url");if(auth.isEmpty()||!CheckoutPolicy.allowed(url)){finish();return;}
        LinearLayout page=column(this);page.setBackgroundColor(BG);page.setOnApplyWindowInsetsListener((v,in)->{v.setPadding(in.getSystemWindowInsetLeft(),in.getSystemWindowInsetTop(),in.getSystemWindowInsetRight(),in.getSystemWindowInsetBottom());return in.consumeSystemWindowInsets();});pad(page,12);
        LinearLayout header=row(this);LinearLayout titles=column(this);titles.addView(text(this,"Pembayaran sekolah",19,INK,true));titles.addView(text(this,student.optString("name")+" • "+invoice.optString("period_label"),12,MUTED,false));header.addView(titles,new LinearLayout.LayoutParams(0,-2,1));header.addView(button(this,"Tutup",false,this::requestClose));page.addView(header);gap(page,12);
        status=text(this,"Menunggu konfirmasi pembayaran dari server…",12,BLUE,true);status.setBackground(bg(this,0xFFEEF0FE,12));pad(status,12);page.addView(status);gap(page,10);
        ProgressBar loading=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);loading.setMax(100);page.addView(loading,new LinearLayout.LayoutParams(-1,dp(this,3)));
        web=new WebView(this);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebChromeClient(new WebChromeClient(){@Override public void onProgressChanged(WebView v,int progress){loading.setProgress(progress);loading.setVisibility(progress==100?View.GONE:View.VISIBLE);}});
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){String host=r.getUrl().getHost(),path=r.getUrl().getPath();if(host!=null&&(host.equals("atskolla.com")||host.equals("www.atskolla.com"))&&path!=null&&path.startsWith("/parent")){status.setText("Memverifikasi pembayaran ke server…");check();return true;}if(CheckoutPolicy.allowed(r.getUrl().toString()))return false;status.setText("Tautan di luar layanan pembayaran tidak dibuka. Pilih QRIS atau transfer pada halaman ini.");return true;}@Override public void onReceivedSslError(WebView v,SslErrorHandler handler,android.net.http.SslError error){handler.cancel();status.setText("Koneksi penyedia tidak aman. Pembayaran dihentikan.");}@Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError error){if(r.isForMainFrame())status.setText("Halaman belum termuat. Periksa internet, lalu ketuk Muat ulang.");}});
        page.addView(web,new LinearLayout.LayoutParams(-1,0,1));gap(page,10);LinearLayout actions=row(this);Button reload=button(this,"Muat ulang",false,()->web.reload()),verify=button(this,"Cek status",true,this::check);LinearLayout.LayoutParams half=new LinearLayout.LayoutParams(0,dp(this,48),1);half.rightMargin=dp(this,8);actions.addView(reload,half);actions.addView(verify,new LinearLayout.LayoutParams(0,dp(this,48),1));page.addView(actions);setContentView(page);page.requestApplyInsets();
        if(state==null||web.restoreState(state)==null)loadProvider(web,url);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::requestClose);
    }
    protected void loadProvider(WebView view,String url){view.loadUrl(url);}
    private void check(){if(checking||completed||isFinishing())return;checking=true;final String expected=installmentId.isEmpty()?invoiceId:installmentId;io.execute(()->{try{
        String token=vault.get("token");if(token.isEmpty())throw new java.io.IOException("Sesi berakhir. Masuk kembali untuk memeriksa status.");
        String action=installmentId.isEmpty()?"spp_list":"installment_list";JSONObject result=api.call(action,ParentActivity.j("student_id",childId,"invoice_id",invoiceId),token);JSONArray rows=result.optJSONArray(installmentId.isEmpty()?"invoices":"installments");JSONObject paid=null;if(rows!=null)for(int i=0;i<rows.length();i++)if(CheckoutPolicy.confirmed(rows.getJSONObject(i),expected))paid=rows.getJSONObject(i);
        JSONObject verified=paid;main.post(()->{checking=false;if(isDestroyed()||!resumed||completed)return;if(!token.equals(vault.get("token")))return;if(verified!=null){completed=true;main.removeCallbacks(poll);try{PaymentNotifications.publish(this,student,invoice,verified,(installmentId.isEmpty()?"invoice:":"installment:")+expected,token);}catch(Exception ignored){}setResult(RESULT_OK,new Intent().putExtra("invoice_id",invoiceId).putExtra("student_id",childId));Toast.makeText(this,"Pembayaran berhasil dikonfirmasi",Toast.LENGTH_LONG).show();finish();}else status.setText("Belum ada konfirmasi sukses. Status diperiksa otomatis.");});
        }catch(Exception e){main.post(()->{checking=false;if(!isDestroyed())status.setText("Konfirmasi belum tersedia. Akan dicoba ulang; jangan membayar dua kali.");});}});}
    private void requestClose(){new CardModal(this).setTitle("Tutup pembayaran?").setMessage("Transaksi yang sudah dibayar tetap diproses server. Anda dapat melihat status terbaru pada Tagihan.").setNegativeButton("Lanjut pembayaran",null).setPositiveButton("Kembali ke tagihan",(d,w)->finish()).show();}
    @Override public void onBackPressed(){requestClose();}
    @Override protected void onResume(){super.onResume();resumed=true;main.removeCallbacks(poll);main.post(poll);if(web!=null)web.onResume();}
    @Override protected void onPause(){resumed=false;main.removeCallbacks(poll);if(web!=null)web.onPause();super.onPause();}
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);if(web!=null)web.saveState(out);}
    @Override protected void onDestroy(){main.removeCallbacksAndMessages(null);io.shutdownNow();if(web!=null){web.stopLoading();web.removeAllViews();web.destroy();}super.onDestroy();}
}
