import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity, Bell, BookOpen, CalendarDays, ClipboardCheck, CreditCard,
  FileSpreadsheet, GraduationCap, LayoutGrid, MessageCircle, ScanFace,
  ScanLine, Send, Users, UserCheck, Wallet, type LucideIcon,
} from "lucide-react";

type Feature = { icon: LucideIcon; title: string; description: string };
type Category = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  features: Feature[];
};

// Only include implemented workflows. This catalogue is not an activation or entitlement check.
const CATEGORIES: Category[] = [
  {
    title: "Absensi & Kehadiran",
    description: "Pencatatan dan pemantauan aktivitas sekolah.",
    icon: ClipboardCheck,
    accent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    features: [
      { icon: ScanLine, title: "Scan QR & kartu RFID", description: "Catat kehadiran menggunakan QR, barcode, atau kartu RFID yang terdaftar." },
      { icon: ScanFace, title: "Pengenalan wajah", description: "Metode absensi wajah melalui layanan pengenalan yang terhubung." },
      { icon: UserCheck, title: "Absensi guru & staff", description: "Catat kehadiran datang dan pulang guru serta staff sekolah." },
      { icon: ClipboardCheck, title: "Absensi manual", description: "Pencatatan hadir, sakit, izin, dan alfa sesuai hak akses petugas." },
      { icon: Activity, title: "Monitoring kehadiran", description: "Pantau status dan riwayat kehadiran siswa pada dashboard." },
    ],
  },
  {
    title: "Data & Akademik",
    description: "Data sekolah dan kegiatan belajar dalam satu tempat.",
    icon: GraduationCap,
    accent: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    features: [
      { icon: Users, title: "Data siswa & kelas", description: "Kelola identitas, foto, kartu pelajar, serta import dan export data siswa." },
      { icon: UserCheck, title: "Guru, staff & wali kelas", description: "Atur data pengguna, peran akun, dan penugasan wali kelas." },
      { icon: BookOpen, title: "Jadwal & absensi mapel", description: "Lihat jadwal mengajar, jadwal live, dan catat kehadiran per mata pelajaran." },
      { icon: CalendarDays, title: "Kalender & hari libur", description: "Kelola agenda akademik, tanggal libur, dan mode libur sekolah." },
    ],
  },
  {
    title: "Komunikasi & Wali Murid",
    description: "Hubungkan sekolah dengan orang tua siswa.",
    icon: MessageCircle,
    accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    features: [
      { icon: Users, title: "Portal wali murid", description: "Akses melalui WhatsApp atau nomor kartu untuk melihat informasi ananda." },
      { icon: MessageCircle, title: "Integrasi WhatsApp", description: "Kirim informasi absensi dan tagihan sesuai konfigurasi integrasi sekolah." },
      { icon: Bell, title: "Pengumuman sekolah", description: "Bagikan informasi sekolah melalui dashboard dan portal wali murid." },
      { icon: Send, title: "Pengajuan izin & sakit", description: "Terima pengajuan wali murid beserta lampiran dan proses peninjauannya." },
    ],
  },
  {
    title: "Keuangan & Laporan",
    description: "Pengelolaan pembayaran dan rekap administrasi.",
    icon: Wallet,
    accent: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    features: [
      { icon: Wallet, title: "SPP & tagihan sekolah", description: "Kelola tagihan, tunggakan, dan status pembayaran siswa." },
      { icon: CreditCard, title: "Pembayaran online", description: "Metode QRIS, virtual account bank, dan retail melalui gateway yang dikonfigurasi." },
      { icon: CreditCard, title: "Cicilan tagihan", description: "Pembayaran bertahap untuk tagihan yang diizinkan, lengkap dengan riwayat transaksi." },
      { icon: FileSpreadsheet, title: "Rekap & export laporan", description: "Lihat rekap dan analitik kehadiran, lalu export laporan ke Excel atau PDF." },
    ],
  },
];

export default function AllFeatures() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutGrid}
        title="Fitur ATSkolla"
        subtitle="Ringkasan fitur sekolah, dikelompokkan agar lebih mudah ditemukan."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Satu platform untuk kehadiran, akademik, komunikasi, dan administrasi sekolah.
        </p>
        <span className="shrink-0 self-start rounded-full bg-background px-3 py-1 text-xs font-medium text-primary sm:self-auto">
          {CATEGORIES.length} kategori
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CATEGORIES.map((category) => (
          <Card key={category.title} className="overflow-hidden rounded-2xl border-border/70 shadow-none">
            <div className="flex items-start gap-3 border-b border-border/60 bg-muted/25 p-4 sm:px-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.accent}`}>
                <category.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-6 tracking-tight">{category.title}</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{category.description}</p>
              </div>
            </div>
            <CardContent className="px-4 py-1 sm:px-5">
              <ul className="divide-y divide-border/50">
                {category.features.map((feature) => (
                  <li key={feature.title} className="flex items-start gap-3 py-3.5">
                    <feature.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium leading-5">{feature.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Menu yang dapat digunakan mengikuti peran akun. Layanan terhubung seperti WhatsApp,
        pengenalan wajah, dan pembayaran memerlukan konfigurasi sekolah yang sesuai.
      </p>
    </div>
  );
}
