import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileSpreadsheet, Users, GraduationCap, Wallet, BookOpen,
  Receipt, Landmark, ArrowRight, ClipboardList,
} from "lucide-react";

interface ReportItem {
  label: string;
  desc: string;
  icon: any;
  path: string;
  tone: string;
}

const reports: ReportItem[] = [
  { label: "Rekap Absensi Siswa", desc: "Kehadiran per siswa & per kelas", icon: Users, path: "/laporan-absensi/siswa", tone: "primary" },
  { label: "Rekap Absensi Guru", desc: "Kehadiran guru per periode", icon: GraduationCap, path: "/laporan-absensi/guru", tone: "violet" },
  { label: "Rekap SPP", desc: "Pembayaran & tunggakan SPP", icon: Receipt, path: "/bendahara/transaksi", tone: "emerald" },
  { label: "Rekap Tunggakan", desc: "Daftar siswa dengan tunggakan aktif", icon: Wallet, path: "/bendahara/tunggakan", tone: "rose" },
  { label: "Buku Kas", desc: "Pemasukan & pengeluaran kas sekolah", icon: BookOpen, path: "/bendahara/buku-kas", tone: "sky" },
  { label: "Settlement / Pencairan", desc: "Riwayat pencairan dana SPP", icon: Landmark, path: "/bendahara/settlement", tone: "amber" },
  { label: "Laporan Keuangan Sekolah", desc: "Laba/rugi kas periode", icon: FileSpreadsheet, path: "/bendahara/keuangan-sekolah", tone: "indigo" },
  { label: "Jurnal Mengajar", desc: "Rekap jurnal & jam mengajar guru", icon: ClipboardList, path: "/mapel/laporan", tone: "violet" },
];

const tones: Record<string, string> = {
  primary: "from-primary/20 to-primary/5 text-primary",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-600",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
  sky: "from-sky-500/20 to-sky-500/5 text-sky-600",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-600",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-600",
  indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
};

export default function PrincipalLaporan() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Cepat"
        subtitle="Akses cepat ke seluruh laporan sekolah"
        icon={FileSpreadsheet}
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Daftar Laporan</CardTitle>
          <CardDescription>Klik salah satu untuk membuka modul laporan lengkap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((r) => (
              <button
                key={r.path}
                onClick={() => navigate(r.path)}
                className={`text-left p-4 rounded-2xl border border-border/50 bg-gradient-to-br ${tones[r.tone]} hover:shadow-md transition-all group`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center shadow-sm">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
                </div>
                <div className="text-sm font-semibold text-foreground">{r.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
