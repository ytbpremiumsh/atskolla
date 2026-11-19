import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { QrCode, Landmark, Store, Info } from "lucide-react";
import { toast } from "@/lib/toast";
import { SCHOOL_PAYMENT_METHODS } from "@/lib/schoolPaymentMethods";
import { PAYMENT_CHANNELS } from "@/lib/paymentChannels";
const groups = [{id:"qris",name:"QRIS",icon:QrCode},{id:"va",name:"Transfer Bank (VA)",icon:Landmark},{id:"retail",name:"Gerai Retail",icon:Store}];
const money=(value:unknown)=>`Rp${Number(value).toLocaleString("id-ID")}`;
export function SchoolPaymentMethods(){
 const {profile,roles}=useAuth();
 const [enabled,setEnabled]=useState<string[]>([]);
 const [disabled,setDisabled]=useState<string[]>([]);
 const [costs,setCosts]=useState<any>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(false),[saving,setSaving]=useState(false);
 const allowed=roles.some(r=>["bendahara","school_admin","super_admin"].includes(r));
 useEffect(()=>{
  let live=true;setLoading(true);setError(false);
  if(!profile?.school_id){setLoading(false);return;}
  Promise.all([(supabase as any).rpc("school_payment_costs"),(supabase as any).from("school_payment_preferences").select("enabled_channels,disabled_methods").eq("school_id",profile.school_id).maybeSingle()]).then(([cost,prefs])=>{
   if(!live)return;
   if(cost.error||prefs.error){setError(true);toast.error("Pengaturan pembayaran belum dapat dimuat");}
   else {setCosts(cost.data);setEnabled(prefs.data?.enabled_channels??groups.map(g=>g.id));setDisabled(prefs.data?.disabled_methods??[]);}
   setLoading(false);
  }).catch(()=>{if(live){setError(true);setLoading(false);}});
  return()=>{live=false;};
 },[profile?.school_id]);
 async function save(channels:string[],excluded:string[]){
  if(!profile?.school_id||!allowed||saving)return;
  setSaving(true);
  try {
   const {error}=await(supabase as any).from("school_payment_preferences").upsert({school_id:profile.school_id,enabled_channels:channels,disabled_methods:excluded,updated_at:new Date().toISOString()});
   if(error)throw error;
   setEnabled(channels);setDisabled(excluded);toast.success("Pengaturan pembayaran disimpan");
  }catch{toast.error("Pengaturan belum tersimpan");}finally{setSaving(false);}
 }
 if(!allowed)return null;
 return <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
  <CardHeader className="border-b bg-muted/30"><CardTitle>Metode Pembayaran Sekolah</CardTitle><p className="text-sm text-muted-foreground">Pilih bank dan gerai yang ingin ditampilkan kepada wali murid.</p></CardHeader>
  <CardContent className="space-y-4 pt-5">
   {groups.map(group=>{const Icon=group.icon;const active=enabled.includes(group.id);return <section key={group.id} className={`rounded-xl border ${active?"border-primary/40 bg-primary/5":"border-border"}`}>
    <label className="flex cursor-pointer items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary shadow-sm"><Icon className="h-5 w-5"/></span><span className="flex-1 font-semibold">{group.name}</span><Checkbox aria-label={`Aktifkan ${group.name}`} disabled={loading||saving||error} checked={active} onCheckedChange={v=>void save(v?[...enabled,group.id]:enabled.filter(id=>id!==group.id),disabled)}/></label>
    {group.id==="qris"?<div className="px-4 pb-4 text-xs space-y-1"><p>Pembayaran sampai Rp100.000: <strong>dipotong Rp555</strong></p><p>Pembayaran di atas Rp100.000: <strong>dipotong 0,7%</strong></p></div>:<div className="grid gap-2 border-t p-3 sm:grid-cols-2">{SCHOOL_PAYMENT_METHODS.filter(m=>m.channel===group.id).map(method=>{
     const logo=PAYMENT_CHANNELS.find(c=>c.id===group.id)?.banks.find(b=>b.code===method.logoCode);
     const tariff=costs?.tariffs?.[method.id];const ready=Number.isSafeInteger(tariff);
     return <label key={method.id} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-3"><span className="flex h-8 w-14 shrink-0 items-center justify-center rounded bg-white p-1">{logo&&<img src={logo.logo} alt="" className="h-full w-full object-contain"/>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{method.label}</span><span className="block text-[11px] text-muted-foreground">{ready?`Potongan ${money(tariff)}`:"Belum tersedia dari penyedia layanan"}</span></span><Checkbox aria-label={`Tampilkan ${method.label}`} disabled={loading||saving||error||!active} checked={active&&!disabled.includes(method.id)} onCheckedChange={v=>void save(enabled,v?disabled.filter(id=>id!==method.id):[...new Set([...disabled,method.id])])}/></label>;
    })}</div>}
   </section>;})}
   <div className="flex gap-3 rounded-xl bg-muted/50 p-4 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><div className="space-y-1"><p className="font-semibold">Pembagian biaya</p><p>Biaya penyedia pembayaran dipotong dari dana yang diterima sekolah.</p><p className="text-xs text-muted-foreground">Tarif QRIS dihitung dari total pembayaran, termasuk biaya layanan. Tarif bank dan gerai ditetapkan Penyedia Layanan Gateway.</p></div></div>
   <p className="text-xs text-muted-foreground">Bank atau gerai nonaktif beserta logonya tidak ditampilkan di Parent. Perubahan berlaku untuk pembayaran baru; tautan lama tetap berlaku.</p>
   <p className="text-xs text-muted-foreground" role="status">{saving?"Menyimpan perubahan…":"Perubahan otomatis tersimpan."}</p>
  </CardContent></Card>;
}
