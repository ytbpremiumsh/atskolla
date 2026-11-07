package com.atskolla.parent;

import android.app.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.text.*;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static com.atskolla.parent.Ui.*;
import static com.atskolla.parent.ParentActivity.*;

/** Native counterpart of the web InstallmentChoiceDialog. Amounts come from installment_list. */
final class InstallmentChoiceModal {
    interface Continue { void accept(long amount); }
    interface Resume { void accept(JSONObject installment); }
    final Activity activity;
    final JSONObject invoice,summary;
    final Continue onContinue;
    final Resume onResume;
    final long total,paid,pending,remaining;
    boolean full;
    Dialog dialog;
    EditText amount;
    Button proceed;
    TextView validation;
    LinearLayout fullTile,partialTile,editor;
    InstallmentChoiceModal(Activity a,JSONObject invoice,JSONObject summary,Continue next,Resume resume){
        activity=a;this.invoice=invoice;this.summary=summary;onContinue=next;onResume=resume;
        JSONObject current=summary.optJSONObject("invoice");total=Math.max(0,Math.round(number(current==null?invoice:current,"total_amount")));
        remaining=Math.max(0,Math.round(number(summary,"remaining")));paid=Math.max(0,Math.round(number(summary,"paid_amount")));pending=Math.max(0,Math.round(number(summary,"pending_amount")));
    }
    Dialog show(){
        LinearLayout content=column(activity),progress=column(activity);pad(progress,12);progress.setBackground(surface(activity,0xFFE9EBFA,14));
        line(progress,"Sudah dibayar (valid)",rupiah(paid)+" / "+rupiah(total),INK);
        gap(progress,8);ProgressBar bar=new ProgressBar(activity,null,android.R.attr.progressBarStyleHorizontal);bar.setMax(10000);bar.setProgress(total>0?(int)Math.min(10000,paid*10000.0/total):0);bar.setProgressTintList(android.content.res.ColorStateList.valueOf(BLUE));bar.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(LINE));bar.setContentDescription("Progres pembayaran "+(total>0?Math.min(100,Math.round(paid*100.0/total)):0)+" persen");progress.addView(bar,new LinearLayout.LayoutParams(-1,dp(activity,8)));gap(progress,8);
        if(pending>0){line(progress,"Menunggu pembayaran",rupiah(pending),0xFFBD7610);gap(progress,5);}
        line(progress,"Sisa",remaining>0?rupiah(remaining):"Lunas",remaining>0?0xFFBD7610:0xFF06996D);content.addView(progress);gap(content,16);
        if(remaining>0){
            LinearLayout modes=row(activity);modes.setGravity(Gravity.TOP);
            fullTile=mode("Bayar Lunas","Bayar sisa penuh",rupiah(remaining),"check",()->select(true));
            partialTile=mode("Cicil","Bayar sebagian","Min Rp 10.000","clock",()->select(false));
            LinearLayout.LayoutParams left=new LinearLayout.LayoutParams(0,-1,1);left.rightMargin=dp(activity,8);modes.addView(fullTile,left);modes.addView(partialTile,new LinearLayout.LayoutParams(0,-1,1));content.addView(modes);gap(content,16);
            editor=column(activity);editor.addView(text(activity,"Nominal cicilan (Rp)",12,INK,true));gap(editor,7);
            amount=input(activity,"Maks "+rupiah(remaining),InputType.TYPE_CLASS_NUMBER);amount.setKeyListener(android.text.method.DigitsKeyListener.getInstance("0123456789."));amount.setRawInputType(InputType.TYPE_CLASS_NUMBER);amount.setTextSize(16);amount.setMinHeight(dp(activity,48));amount.setFilters(new InputFilter[]{new InputFilter.LengthFilter(20)});editor.addView(amount);gap(editor,5);
            // Compact quick amounts share one row; the 44dp touch target surrounds a 28dp chip.
            LinearLayout quick=column(activity),quickRow=null;LinkedHashSet<Long> values=new LinkedHashSet<>(Arrays.asList(100000L,250000L,500000L,remaining));int index=0;
            for(long value:values){if(value<=0||value>remaining)continue;if(index%4==0){quickRow=row(activity);quick.addView(quickRow);}final long v=value;Button b=button(activity,v==remaining?"Sisa":rupiah(v),false,()->{amount.setText(String.valueOf(v));amount.setSelection(amount.length());});b.setTextSize(10);b.setBackground(new android.graphics.drawable.InsetDrawable(surface(activity,0xFFF3F4FF,18),0,dp(activity,8),0,dp(activity,8)));b.setMinHeight(dp(activity,40));b.setPadding(dp(activity,4),dp(activity,3),dp(activity,4),dp(activity,3));LinearLayout.LayoutParams size=new LinearLayout.LayoutParams(0,dp(activity,44),1);size.rightMargin=dp(activity,4);quickRow.addView(b,size);index++;}
            editor.addView(quick);validation=text(activity,"",11,0xFFD63742,false);editor.addView(validation);content.addView(editor);gap(content,10);
            proceed=button(activity,"",true,()->{long value=nominal();if(!valid(value))return;dialog.dismiss();onContinue.accept(value);});proceed.setTextSize(12);content.addView(proceed,new LinearLayout.LayoutParams(-1,dp(activity,48)));
            amount.addTextChangedListener(new TextWatcher(){boolean formatting;public void beforeTextChanged(CharSequence s,int start,int count,int after){}public void onTextChanged(CharSequence s,int start,int before,int count){}public void afterTextChanged(Editable e){if(formatting)return;String raw=e.toString().replaceAll("[^0-9]","");try{String formatted=raw.isEmpty()?"":java.text.NumberFormat.getIntegerInstance(new Locale("id","ID")).format(Long.parseLong(raw));if(!formatted.equals(e.toString())){formatting=true;amount.setText(formatted);amount.setSelection(amount.length());formatting=false;}}catch(NumberFormatException ignored){}update();}});
            select(false);
        }
        JSONArray history=arr(summary,"installments");if(history.length()>0){gap(content,16);View divider=new View(activity);divider.setBackgroundColor(LINE);content.addView(divider,new LinearLayout.LayoutParams(-1,dp(activity,1)));gap(content,10);content.addView(text(activity,"RIWAYAT TRANSAKSI CICILAN",11,MUTED,true));gap(content,7);
            for(int i=0;i<history.length();i++){JSONObject item=history.optJSONObject(i);if(item==null)continue;LinearLayout card=column(activity);pad(card,10);card.setBackground(surface(activity,BG,14));LinearLayout top=row(activity),details=column(activity);details.addView(text(activity,rupiah(number(item,"amount")),13,INK,true));String stamp=s(item,"paid_at");if(stamp.isEmpty())stamp=s(item,"created_at");details.addView(text(activity,timestamp(stamp),10,MUTED,false));top.addView(details,new LinearLayout.LayoutParams(0,-2,1));String status=s(item,"status");boolean settled=status.equals("paid"),waiting=status.equals("pending");String label=settled?"✓ Lunas":waiting?"Menunggu":status.equals("expired")?"Kedaluwarsa":status.equals("failed")?"Gagal":status.equals("cancelled")?"Dibatalkan":status;top.addView(chip(activity,label,settled||waiting?Color.WHITE:MUTED,settled?0xFF10B98B:waiting?0xFFE9A024:LINE));card.addView(top);
                if(canResume(item)){gap(card,6);Button resume=button(activity,"Lanjutkan pembayaran",false,()->{dialog.dismiss();onResume.accept(item);});resume.setTextSize(11);card.addView(resume,new LinearLayout.LayoutParams(-1,dp(activity,44)));}
                content.addView(card);gap(content,7);
            }
        }
        dialog=new CardModal(activity).setTitle("Bayar Tagihan").setIcon("wallet").setCloseButton().setTallContent().setMessage(s(invoice,"period_label")+" • "+rupiah(total)).setView(content).show();return dialog;
    }
    private LinearLayout mode(String title,String subtitle,String value,String icon,Runnable action){LinearLayout tile=column(activity);pad(tile,11);tile.setMinimumHeight(dp(activity,100));LinearLayout titleRow=row(activity);titleRow.addView(new Glyph(activity,icon,BLUE),new LinearLayout.LayoutParams(dp(activity,17),dp(activity,17)));TextView name=text(activity,title,13,INK,true);name.setPadding(dp(activity,7),0,0,0);titleRow.addView(name,new LinearLayout.LayoutParams(0,-2,1));tile.addView(titleRow);gap(tile,5);tile.addView(text(activity,subtitle,10,MUTED,false));gap(tile,3);tile.addView(text(activity,value,12,INK,true));tile.setFocusable(true);tile.setContentDescription(title+", "+subtitle+", "+value);tile.setOnClickListener(v->action.run());return tile;}
    void select(boolean value){full=value;if(editor==null)return;editor.setVisibility(full?View.GONE:View.VISIBLE);style(fullTile,full,0xFF10A979);style(partialTile,!full,BLUE);update();}
    private void style(LinearLayout tile,boolean selected,int accent){GradientDrawable d=bg(activity,selected?(accent==BLUE?0xFFE9EBFF:0xFFEAF9F1):BG,14);d.setStroke(dp(activity,selected?2:1),selected?accent:LINE);tile.setBackground(d);tile.setSelected(selected);}
    long nominal(){if(full)return remaining;try{return Long.parseLong(amount.getText().toString().replaceAll("[^0-9]",""));}catch(Exception e){return 0;}}
    boolean valid(long value){return remaining>0&&value>=10000&&value<=remaining;}
    void update(){long value=nominal();proceed.setText("Lanjut Pilih Metode ("+rupiah(value)+")  →");proceed.setEnabled(valid(value));validation.setText(value>remaining?"Melebihi sisa tagihan":value>0&&value<10000?"Minimum Rp 10.000":"");validation.setVisibility(validation.length()>0?View.VISIBLE:View.GONE);}
    static boolean canResume(JSONObject item){if(!"pending".equals(s(item,"status"))||s(item,"mayar_payment_url").isEmpty())return false;String expiry=s(item,"expired_at");if(expiry.isEmpty())return true;try{return Instant.parse(expiry).isAfter(Instant.now());}catch(Exception e){try{return OffsetDateTime.parse(expiry).toInstant().isAfter(Instant.now());}catch(Exception ignored){return false;}}}
    private void line(LinearLayout parent,String label,String value,int color){LinearLayout row=row(activity);row.addView(text(activity,label,11,MUTED,false),new LinearLayout.LayoutParams(0,-2,1));TextView number=text(activity,value,12,color,true);number.setGravity(Gravity.END);row.addView(number,new LinearLayout.LayoutParams(0,-2,1.3f));parent.addView(row);}
    private static String timestamp(String raw){try{return Instant.parse(raw).atZone(ZoneId.of("Asia/Jakarta")).format(DateTimeFormatter.ofPattern("d MMM yyyy, HH.mm",new Locale("id","ID")));}catch(Exception e){try{return OffsetDateTime.parse(raw).atZoneSameInstant(ZoneId.of("Asia/Jakarta")).format(DateTimeFormatter.ofPattern("d MMM yyyy, HH.mm",new Locale("id","ID")));}catch(Exception ignored){return date(raw);}}}
}
