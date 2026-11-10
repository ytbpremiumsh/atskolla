import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QrCode, Landmark, Store, Info } from "lucide-react";
import { toast } from "@/lib/toast";
const methods = [
 {id:"qris",name:"QRIS",icon:QrCode,description:"Bayar lewat e-wallet atau mobile banking"},
 {id:"va",name:"Virtual Account Bank",icon:Landmark,description:"Transfer melalui nomor rekening pembayaran"},
 {id:"retail",name:"Retail",icon:Store,description:"Bayar di Alfamart atau Indomaret"},
];
const money = (value: unknown) => `Rp${Number(value).toLocaleString("id-ID")}`;
const names: Record<string,string> = {VIRTUAL_ACCOUNT_BCA:"BCA",VIRTUAL_ACCOUNT_BANK_MANDIRI:"Mandiri",VIRTUAL_ACCOUNT_BNI:"BNI",VIRTUAL_ACCOUNT_BRI:"BRI",VIRTUAL_ACCOUNT_BANK_CIMB:"CIMB Niaga",ONLINE_TO_OFFLINE_ALFA:"Alfamart",ONLINE_TO_OFFLINE_INDOMARET:"Indomaret"};
export function SchoolPaymentMethods(){
 const {profile,roles}=useAuth();const [enabled,setEnabled]=useState<string[]>([]);const [costs,setCosts]=useState<any>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [saving,setSaving]=useState(false);
 const allowed=roles.some(r=>["bendahara","school_admin","super_admin"].includes(r));
 useEffect(()=>{let live=true; (supabase as any).rpc("school_payment_costs").then(({data,error}:any)=>{if(live&&!error)setCosts(data);});setLoading(true);setError(false);if(!profile?.school_id)return; (supabase as any).from("school_payment_preferences").select("enabled_channels").eq("school_id",profile.school_id).maybeSingle().then(({data,error}:any)=>{if(!live)return;if(error){setError(true);toast.error("Pengaturan pembayaran belum dapat dimuat");}else setEnabled(data?.enabled_channels??methods.map(m=>m.id));setLoading(false);});return()=>{live=false;};},[profile?.school_id]);
 async function save(){if(!profile?.school_id||!allowed)return;setSaving(true);const {error}=await(supabase as any).from("school_payment_preferences").upsert({school_id:profile.school_id,enabled_channels:enabled,updated_at:new Date().toISOString()});setSaving(false);if(error)toast.error("Pengaturan belum tersimpan");else toast.success("Metode pembayaran sekolah disimpan");}
 if(!allowed)return null;
 return <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
  <CardHeader className="border-b bg-muted/30"><CardTitle>Metode Pembayaran Sekolah</CardTitle><p className="text-sm text-muted-foreground">Aktifkan metode pembayaran untuk wali murid.</p></CardHeader>
  <CardContent className="space-y-4 pt-5">
   {methods.map(m=>{const Icon=m.icon;const selected=enabled.includes(m.id);const tariffs=Object.entries(costs?.tariffs||{}).filter(([id])=>m.id==="va"?id.startsWith("VIRTUAL_ACCOUNT_"):id.startsWith("ONLINE_TO_OFFLINE_"));return <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selected?"border-primary/40 bg-primary/5":"border-border"}`}>
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm"><Icon className="h-6 w-6" aria-hidden="true"/></span>
    <span className="min-w-0 flex-1"><span className="block font-semibold">{m.name}</span><span className="block text-xs text-muted-foreground">{m.description}</span>
     <span className="mt-2 block text-xs">{m.id==="qris"?"Potongan: Rp555 hingga Rp100.000; 0,7% di atas Rp100.000.":tariffs.length?tariffs.map(([id,fee])=>`${names[id]||id}: ${money(fee)}`).join(" · "):"Tarif belum ditetapkan. Belum tersedia untuk wali murid."}</span>
    </span><Checkbox className="mt-1 shrink-0" disabled={loading||saving||error} checked={selected} onCheckedChange={v=>setEnabled(current=>v?[...new Set([...current,m.id])]:current.filter(x=>x!==m.id))}/>
   </label>;})}
   <div className="flex gap-3 rounded-xl bg-muted/50 p-4 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><div className="space-y-1"><p className="font-semibold">Pembagian biaya</p><p>Biaya penyedia pembayaran dipotong dari dana yang diterima sekolah.</p><p className="text-xs text-muted-foreground">Tarif QRIS dihitung dari total pembayaran, termasuk biaya layanan. Tarif bank dan gerai ditetapkan Super Admin.</p></div></div>
   <p className="text-xs text-muted-foreground">Perubahan berlaku untuk pembayaran baru. Tautan pembayaran lama tetap berlaku.</p>
   <Button disabled={loading||saving||error} onClick={save}>{saving?"Menyimpan…":"Simpan metode pembayaran"}</Button>
  </CardContent></Card>;
}
