import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
export default function SuperAdminOperations(){
 const q=useQuery({queryKey:['operations-health'],queryFn:async()=>{const {data,error}=await supabase.rpc('operations_health');if(error)throw error;return data as any;},refetchInterval:60000});
 const h=q.data,r=h?.reconciliation;
 const stale=!r?.last_run||Date.now()-new Date(r.last_run).getTime()>5*60000;
 const alerts=h?[!r.active&&'Rekonsiliasi otomatis tidak aktif.',stale&&'Rekonsiliasi tidak memiliki catatan eksekusi terbaru.',r.failed_24h>0&&'Ada kegagalan rekonsiliasi dalam 24 jam terakhir.',r.overdue>0&&'Ada transaksi melewati jadwal pemeriksaan.',r.review>0&&'Ada transaksi yang memerlukan pemeriksaan manual.',h.notifications.failed_24h>0&&'Ada pengiriman WhatsApp gagal.',(!h.backup.last_export||Date.now()-new Date(h.backup.last_export).getTime()>7*86400000)&&'Ekspor aplikasi belum tercatat atau lebih lama dari 7 hari.']:[];
 return <div className="space-y-4"><div className="flex justify-between"><h1 className="text-xl font-bold">Pemantauan operasional</h1><Button onClick={()=>q.refetch()} disabled={q.isFetching}>Perbarui</Button></div><p className="text-sm text-muted-foreground">Status pembayaran, notifikasi, dan salinan data aplikasi. Pemeriksaan ini tidak mengubah transaksi.</p>
 {q.isPending&&<p>Memeriksa status…</p>}{q.isError&&<div role="alert" className="rounded-xl border border-destructive p-4">Status belum tersedia. Pastikan migrasi operasional telah dipasang dan Anda menggunakan akun super admin. Data tidak dianggap sehat ketika pemeriksaan gagal.</div>}
 {h&&<><div role="status" className="rounded-xl border p-4">{alerts.filter(Boolean).length?alerts.filter(Boolean).map(a=><p key={String(a)} className="text-amber-700">{a}</p>):'Tidak ada peringatan pada pemeriksaan terakhir.'}</div><div className="grid gap-4 md:grid-cols-3">{[
 ['Rekonsiliasi DOKU',`Jadwal ${r.active?'aktif':'tidak aktif'}`,`Terakhir: ${r.last_run?new Date(r.last_run).toLocaleString('id-ID'):'belum tersedia'}`,`${r.pending} pending, ${r.overdue} terlambat, ${r.review} perlu review`],
 ['WhatsApp',`${h.notifications.failed_24h} gagal dalam 24 jam terakhir`,'Periksa log komunikasi untuk tindak lanjut.',''],
 ['Salinan data aplikasi',`Ekspor: ${h.backup.last_export?new Date(h.backup.last_export).toLocaleString('id-ID'):'belum tercatat'}`,`Google Drive: ${h.backup.last_gdrive?new Date(h.backup.last_gdrive).toLocaleString('id-ID'):'belum tercatat'}`,'Bukan verifikasi pemulihan atau backup penuh penyedia.']
 ].map(([title,...lines])=><Card key={title}><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{lines.filter(Boolean).map(l=><p key={l}>{l}</p>)}</CardContent></Card>)}</div><p className="text-xs text-muted-foreground">Diperiksa {new Date(h.checked_at).toLocaleString('id-ID')}. Peringatan tampil di dashboard ini, tidak dikirim otomatis ke WhatsApp/email.</p></>}
 </div>
}
