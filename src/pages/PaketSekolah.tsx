import { usePackageStatus } from "@/hooks/usePackageStatus";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { CreditCard, Package, CheckCircle2, Clock3, AlertCircle } from "lucide-react";

export default function PaketSekolah() {
  const pkg = usePackageStatus();
  const lastActivity = pkg.lastPaymentActivityAt ? new Date(pkg.lastPaymentActivityAt).getTime() : NaN;
  const elapsed = Number.isFinite(lastActivity) ? Math.max(0, Math.floor((Date.now() - lastActivity) / 86400000)) : null;
  return (
    <div className="space-y-4">
      <PageHeader title="Paket Sekolah" subtitle="Layanan gratis dengan penggunaan SPP Online ATSkolla." icon={Package} />
      <Card className="overflow-hidden rounded-2xl border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white"><CreditCard className="h-6 w-6" /></div>
            <div><h2 className="text-lg font-bold">ATSkolla Gratis</h2><p className="text-sm text-muted-foreground">Tanpa biaya langganan</p></div>
          </div>
          <Badge variant="outline" className={pkg.packageStatus === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
            {pkg.loading ? "Memuat status…" : pkg.packageStatus === "active" ? "Aktif" : "Menunggu Aktivasi"}
          </Badge>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {["Seluruh fitur tersedia sesuai status aktivasi", "Tanpa biaya langganan", "Menggunakan SPP dan tagihan online ATSkolla"].map(item => <li key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</li>)}
          </ul>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4 text-amber-600" />SPP Online wajib tetap aktif</div>
            <p className="mt-2 leading-relaxed text-muted-foreground">Masa toleransi tanpa aktivitas pembayaran adalah <strong className="text-foreground">{pkg.gracePeriodDays} hari</strong>. Penghitung waktu tetap berjalan sejak aktivitas pembayaran terakhir; membuka halaman atau mengubah pengaturan tidak mengulang masa toleransi.</p>
            {!pkg.loading && <p className="mt-2 font-medium">{elapsed === null ? "Belum ada aktivitas pembayaran yang tercatat." : `Aktivitas pembayaran terakhir: ${elapsed} hari lalu.`}</p>}
            <p className="mt-3 flex items-start gap-2 leading-relaxed text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />Jika tidak ada aktivitas pembayaran selama masa toleransi, status layanan menjadi Menunggu Aktivasi dan fitur absensi dinonaktifkan sementara. Gunakan kembali SPP Online melalui akun Bendahara untuk mengaktifkan layanan.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
