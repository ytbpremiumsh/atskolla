import { School, GraduationCap, ClipboardCheck, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Step = {
  title: string;
  description: string;
  image?: string;
  bullets?: string[];
  tips?: string[];
};

export type RoleGuide = {
  id: "school" | "teacher" | "wali-kelas" | "bendahara" | "parent";
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  accent: string;
  cover: string;
  /** Mobile mockup screenshot (already includes phone frame). Shared across all steps for this role. */
  mobileMockup: string;
  intro: string;
  highlights: string[];
  steps: Step[];
};

export const GUIDES: RoleGuide[] = [
  {
    id: "school",
    label: "Admin Sekolah",
    shortLabel: "Sekolah",
    icon: School,
    color: "from-indigo-500 to-blue-600",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
    cover: "/panduan/school-dashboard.jpg",
    mobileMockup: "/panduan/mobile-school.jpg",
    intro:
      "Panduan lengkap untuk Admin Sekolah / Operator dalam mengelola data sekolah, siswa, kelas, absensi, dan laporan dari A sampai Z.",
    highlights: [
      "8 menu utama",
      "Monitoring real-time",
      "Live Monitor Publik",
      "Export laporan Excel",
    ],
    steps: [
      {
        title: "1. Dashboard Utama",
        description:
          "Setelah login, Anda akan masuk ke Dashboard Sekolah. Halaman ini menampilkan ringkasan kehadiran hari ini, total siswa, kelas, dan jadwal live. Cocok sebagai control panel harian.",
        image: "/panduan/school-dashboard.jpg",
        bullets: [
          "Banner biru atas: persentase kehadiran + tombol shortcut Scan Absensi.",
          "Kartu statistik: Total Kelas, Siswa Terdaftar, Hadir Hari Ini, Belum/Alfa.",
          "Grafik harian / mingguan / bulanan untuk analisa kehadiran.",
          "Widget 'Sedang Berlangsung' menampilkan jadwal kelas live.",
          "Pengumuman Sekolah aktif tampil otomatis di bawah.",
        ],
      },
      {
        title: "2. Monitoring Real-time",
        description:
          "Menu Monitoring menampilkan absensi yang masuk secara real-time. Cocok ditampilkan di TV sekolah lewat tombol 'Live Monitor Publik'.",
        image: "/panduan/school-monitoring.jpg",
        bullets: [
          "Status: Hadir, Izin, Sakit, Alfa, Belum (status netral untuk yang belum absen).",
          "Progress bar kehadiran realtime per kelas.",
          "Live Feed siswa yang datang dan pulang dengan jam tepat.",
          "Filter per kelas untuk fokus pengawasan.",
          "Tombol 'Live Monitor Publik' membuka tampilan TV tanpa login.",
        ],
      },
      {
        title: "2b. Live Monitor Publik (Datang & Pulang)",
        description:
          "Tampilan layar publik yang bisa diakses tanpa login — cocok ditampilkan di TV gerbang sekolah. Tersedia 2 mode: monitor Kedatangan (status Hadir/Izin/Sakit/Alfa/Belum) dan monitor Kepulangan (siapa yang sudah pulang per kelas).",
        image: "/panduan/public-monitor-datang.jpg",
        bullets: [
          "Akses link Live Monitor langsung dari menu Monitoring → tombol 'Live Monitor Publik'.",
          "Tersedia 2 mode: Monitor Kedatangan & Monitor Kepulangan.",
          "Counter besar: Total, Hadir, Izin, Sakit, Alfa, Belum.",
          "Auto-refresh setiap 5 detik — tidak perlu reload manual.",
          "Tombol Fullscreen untuk tampilan TV.",
        ],
      },
      {
        title: "2c. Monitor Kepulangan per Kelas",
        description:
          "Halaman publik khusus pemantauan kepulangan siswa dikelompokkan per kelas dengan progress bar real-time.",
        image: "/panduan/public-monitor-pulang.jpg",
        bullets: [
          "Tab horizontal per kelas — geser untuk pilih kelas.",
          "Kartu siswa dengan foto + status 'Menunggu' / 'Sudah Pulang'.",
          "Auto-rotate antar kelas tiap 8 detik (bisa di-pause).",
          "Progress bar kepulangan per kelas.",
        ],
      },
      {
        title: "3. Scan Absensi",
        description:
          "Buka menu Scan Absensi untuk melakukan absensi via Barcode/QR atau Pengenalan wajah. Bisa juga input NIS manual jika kamera bermasalah.",
        image: "/panduan/school-scan.jpg",
        bullets: [
          "Klik 'Aktifkan Kamera' lalu arahkan ke QR Code siswa.",
          "Mode QR/Barcode auto-confirm setelah 3 detik deteksi stabil.",
          "Mode Face Recognition: interval 10 detik per wajah.",
          "Input NIS Manual untuk fallback jika kamera tidak tersedia.",
          "Suara konfirmasi (TTS) otomatis menyebut nama siswa.",
        ],
      },
      {
        title: "4. Kelola Kelas",
        description:
          "Menu Kelas digunakan untuk membuat dan mengatur daftar kelas. Tiap kelas otomatis menampilkan rekap absensi harian dan total siswa.",
        image: "/panduan/school-classes.jpg",
        bullets: [
          "Klik 'Tambah Kelas' untuk membuat kelas baru.",
          "Edit nama kelas — sinkron otomatis ke siswa & wali kelas.",
          "Klik kartu kelas untuk lihat detail siswa dan absensi hari ini.",
          "Kapasitas kelas mengikuti tier subscription Anda.",
        ],
      },
      {
        title: "5. Data Siswa",
        description:
          "Kelola data siswa termasuk QR Code, foto wajah untuk Pengenalan wajah, NIS, gender, dan kontak wali murid.",
        image: "/panduan/school-students.jpg",
        bullets: [
          "Tombol 'Tambah Siswa' untuk input manual satu per satu.",
          "Tombol 'Import' untuk upload Excel massal (template tersedia).",
          "'Naik Kelas' untuk pindahkan siswa antar kelas (single/bulk).",
          "'Download QR' untuk cetak kartu QR siswa per kelas.",
          "Klik nama siswa untuk lihat detail kehadiran lengkap.",
        ],
      },
      {
        title: "5b. Identitas & Barcode Per Siswa",
        description:
          "Klik nama siswa pada halaman Data Siswa untuk membuka halaman detail Identitas Lengkap & Barcode Siswa. Halaman ini menampilkan profil siswa, statistik kehadiran (Hadir/Izin/Sakit/Alfa), data wali / orang tua, dan QR Barcode unik siswa yang siap dicetak menjadi kartu identitas.",
        image: "/panduan/school-identitas-barcode.jpg",
        bullets: [
          "Header profil: Foto, Nama, Kelas, NIS, dan status absensi hari ini.",
          "Kartu statistik 4 kolom: total Hadir, Izin, Sakit, dan Alfa.",
          "Panel 'Identitas Lengkap': Nama, Kelas, NIS, Tanggal Terdaftar.",
          "Panel 'Data Wali / Orang Tua': Nama Wali & No. HP Wali.",
          "Panel 'Barcode Siswa': QR Code unik per siswa + tombol 'Download QR Code'.",
          "Tombol pensil di header untuk edit data siswa langsung dari halaman ini.",
        ],
      },
      {
        title: "6. Pengumuman Sekolah",
        description:
          "Kirim pengumuman ke seluruh staf, guru, dan wali kelas. Bisa diberi label Informasi, Penting, atau Mendesak.",
        image: "/panduan/school-announcements.jpg",
        bullets: [
          "Klik 'Buat Baru' untuk membuat pengumuman dengan rich text editor.",
          "Atur target: Staf, Guru, atau Wali Kelas (multi-select).",
          "Tandai pengumuman penting agar tampil di top dashboard.",
          "Pengumuman dikirim juga sebagai notifikasi in-app.",
        ],
      },
      {
        title: "7. Laporan & Rekap (History)",
        description:
          "Menu History menampilkan analitik dan rekap kehadiran lengkap. Bisa export ke Excel format siap laporan.",
        image: "/panduan/school-history.jpg",
        bullets: [
          "Pilih rentang tanggal: 30, 60, atau 90 hari.",
          "Tab 'Rekap Kehadiran' (Datang) dan 'Rekap Kepulangan' terpisah.",
          "Filter per kelas untuk drill-down detail.",
          "Klik 'Export Excel' untuk unduh laporan lengkap dengan tanda tangan.",
          "Status Datang & Pulang dipisah ketat — tidak tercampur.",
        ],
      },
      {
        title: "8. Pengaturan Sekolah",
        description:
          "Atur identitas sekolah (nama, NPSN, alamat, logo), zona waktu (WIB/WITA/WIT), dan jam absensi default.",
        bullets: [
          "Logo sekolah otomatis sinkron ke sidebar, kartu ID, dan notifikasi WA.",
          "Zona waktu menentukan jam cut-off absensi.",
          "Atur jam masuk & jam pulang default untuk validasi otomatis.",
        ],
      },
    ],
  },
  {
    id: "teacher",
    label: "Guru / Staff",
    shortLabel: "Guru",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cover: "/panduan/teacher-dashboard-uswatun.jpg",
    mobileMockup: "/panduan/mobile-teacher.jpg",
    intro:
      "Panduan untuk Guru Mata Pelajaran dalam mengakses jadwal mengajar, mencatat kehadiran per mapel, dan melihat rekap absensi.",
    highlights: [
      "Jadwal mengajar harian",
      "Rekap absensi per mapel",
      "Analitik distribusi",
      "Live Schedule",
    ],
    steps: [
      {
        title: "1. Dashboard Guru",
        description:
          "Halaman utama guru menampilkan ringkasan jadwal hari ini, mata pelajaran yang sedang berlangsung, dan pengumuman sekolah dari admin.",
        image: "/panduan/teacher-dashboard-uswatun.jpg",
        bullets: [
          "Kartu: Jadwal Hari Ini, Sedang Berlangsung, Mata Pelajaran, Total Kelas.",
          "Widget 'Pengumuman Sekolah' tampil otomatis di tengah.",
          "Section 'Jadwal Hari Ini' menampilkan semua sesi mengajar hari ini lengkap dengan ruangan & kelas.",
          "Tombol 'Lihat Absensi' di tiap jadwal untuk langsung mencatat kehadiran sesi.",
        ],
      },
      {
        title: "2. Jadwal Mengajar",
        description:
          "Menu Jadwal Mengajar berisi seluruh jadwal mata pelajaran per hari, lengkap dengan ruangan, kelas, dan total sesi mingguan.",
        image: "/panduan/teacher-schedule-real.jpg",
        bullets: [
          "Filter per hari atau cari berdasarkan nama guru/mapel/kelas.",
          "Tab 'Jadwal' (per hari) dan 'Mata Pelajaran' (per mapel) terpisah.",
          "Statistik: Total Jadwal, Guru Terjadwal, Mata Pelajaran, Kelas Terjadwal.",
          "Warna titik di tiap mapel untuk visual identifikasi cepat.",
        ],
      },
      {
        title: "3. Rekap Absensi Mapel",
        description:
          "Lihat rekap kehadiran siswa per mata pelajaran yang Anda ampu, dalam format grid harian (1-31).",
        image: "/panduan/teacher-rekap-mapel.jpg",
        bullets: [
          "Pilih kombinasi Mapel + Kelas (misal 'TKJ 1 - PAI').",
          "Filter Bulan & Tahun untuk navigasi periode.",
          "Legend warna: H=Hadir (hijau), S=Sakit (ungu), I=Izin (kuning), A=Alfa (merah).",
          "Tombol 'Export Excel' untuk laporan ke wali kelas/admin.",
        ],
      },
      {
        title: "4. Analytic Mapel",
        description:
          "Halaman analisa per mata pelajaran dengan grafik distribusi & tren kehadiran siswa.",
        bullets: [
          "Donut chart distribusi: Hadir / Izin / Sakit / Alfa.",
          "Bar chart tren harian per mapel.",
          "Ringkasan per siswa: jumlah hadir, alfa, persentase.",
        ],
      },
      {
        title: "5. Jadwal Live (Public)",
        description:
          "Lihat jadwal pelajaran yang sedang berlangsung secara realtime, dengan progress bar kelas. Bisa diakses tanpa login.",
        image: "/panduan/live-schedule.jpg",
        bullets: [
          "Highlight 'LIVE' untuk kelas yang sedang berlangsung.",
          "Progress bar menunjukkan sisa waktu pelajaran.",
          "Filter berdasarkan guru atau kelas.",
          "Cocok ditampilkan di TV ruang guru.",
        ],
      },
    ],
  },
  {
    id: "wali-kelas",
    label: "Wali Kelas",
    shortLabel: "Wali Kelas",
    icon: ClipboardCheck,
    color: "from-violet-500 to-purple-600",
    accent: "bg-violet-50 text-violet-700 border-violet-200",
    cover: "/panduan/wali-kelas-dashboard-uswatun.jpg",
    mobileMockup: "/panduan/mobile-wali-kelas.png",
    intro:
      "Panduan untuk Wali Kelas (contoh: Ibu Uswatun Khasanah, S.Pd) dalam memantau siswa kelasnya, leaderboard antar kelas, absensi manual, dan pengajuan izin.",
    highlights: [
      "Dashboard wali kelas",
      "Leaderboard antar kelas",
      "Absensi manual H/S/I/A",
      "Approve izin & sakit",
    ],
    steps: [
      {
        title: "1. Dashboard Wali Kelas",
        description:
          "Setelah ditugaskan oleh Admin Sekolah, Anda akan melihat dashboard berisi statistik kelas yang Anda ampu (bisa lebih dari 1 kelas).",
        image: "/panduan/wali-kelas-dashboard-uswatun.jpg",
        bullets: [
          "Kartu statistik: Total Siswa, Hadir, Izin, Sakit, Alfa, Belum.",
          "Progress Absensi Hari Ini dengan persentase realtime.",
          "Daftar siswa lengkap dengan status & jam absensi terkini.",
          "Search bar untuk cari siswa cepat.",
          "Toggle tab: Dashboard / Peringkat Kelas.",
        ],
      },
      {
        title: "2. Peringkat Kelas (Leaderboard)",
        description:
          "Bandingkan kelas Anda dengan kelas lain di sekolah dalam hal persentase kehadiran 30 hari terakhir.",
        image: "/panduan/wali-kelas-leaderboard.jpg",
        bullets: [
          "'Posisi Kelas Anda' menampilkan ranking & persentase.",
          "Bar chart 'Perbandingan Kehadiran Semua Kelas' — kelas Anda berwarna biru.",
          "Realtime — update otomatis saat ada absensi baru.",
          "Memotivasi peningkatan disiplin antar kelas.",
        ],
      },
      {
        title: "3. Absensi Manual Kelas",
        description:
          "Catat kehadiran siswa kelas Anda secara manual untuk semua status (Hadir, Izin, Sakit, Alfa). Status Alfa STRICTLY manual. Tabel menampilkan kolom H/S/I/A di kanan tiap nama untuk one-click input.",
        image: "/panduan/wali-kelas-attendance-table.jpg",
        bullets: [
          "Pilih kelas (dropdown TKJ 2/TKJ 3) dan tanggal.",
          "Tombol H/S/I/A di kolom kanan tiap siswa untuk tandai status.",
          "Counter '2/4 terisi' menunjukkan progres input.",
          "Tombol 'Simpan' aktif setelah ada perubahan.",
          "Notifikasi WhatsApp ke wali murid otomatis terkirim setelah simpan.",
        ],
      },
      {
        title: "4. Siswa Kelas Saya",
        description:
          "Lihat dan kelola data siswa di kelas yang Anda ampu, termasuk kontak wali murid dan persentase kehadiran.",
        image: "/panduan/wali-kelas-students.jpg",
        bullets: [
          "Statistik: Total Siswa, Laki-laki, Perempuan, Nama Kelas.",
          "Daftar siswa dengan persentase kehadiran (warna: hijau=baik, kuning=perhatian).",
          "Klik nama siswa untuk lihat detail kehadiran & data wali.",
          "Search bar untuk cari siswa atau nama wali murid.",
        ],
      },
      {
        title: "5. Rekap Absensi Kelas",
        description:
          "Lihat riwayat absensi kelas Anda dalam format grid harian. Tab Datang & Pulang terpisah.",
        image: "/panduan/wali-kelas-rekap.jpg",
        bullets: [
          "Filter Bulan, Tahun, Kelas.",
          "Tab 'Rekap Kehadiran' (Datang) vs 'Rekap Kepulangan'.",
          "Grid bulatan warna per tanggal (1-31).",
          "Tombol 'Export Excel' untuk laporan ke kepala sekolah.",
        ],
      },
      {
        title: "6. Analytic Wali Kelas",
        description:
          "Analisa mendalam kehadiran wali kelas Anda dalam bentuk donut chart, tren harian, dan ringkasan per siswa.",
        image: "/panduan/wali-kelas-analytic.jpg",
        bullets: [
          "Filter rentang: 7 hari / 14 hari / 30 hari / custom.",
          "Donut: Distribusi Status (Hadir/Izin/Sakit/Alfa) dengan persentase.",
          "Bar chart 'Tren Harian' menampilkan stack komposisi.",
          "'Ringkasan Per Siswa' menunjukkan siswa dengan absensi tertinggi/terendah.",
        ],
      },
      {
        title: "7. Pengajuan Izin / Sakit",
        description:
          "Setujui atau tolak pengajuan izin & sakit dari wali murid kelas Anda.",
        image: "/panduan/wali-kelas-leave.jpg",
        bullets: [
          "Statistik: Menunggu, Disetujui, Ditolak.",
          "Tab filter: Menunggu / Disetujui / Ditolak / Semua.",
          "Klik kartu pengajuan untuk lihat detail + lampiran surat.",
          "Tombol Setujui/Tolak — wali murid otomatis menerima notifikasi WA.",
        ],
      },
    ],
  },
  {
    id: "bendahara",
    label: "Bendahara",
    shortLabel: "Bendahara",
    icon: Wallet,
    color: "from-emerald-600 to-teal-700",
    accent: "bg-teal-50 text-teal-700 border-teal-200",
    cover: "/panduan/bendahara-dashboard.jpg",
    mobileMockup: "/panduan/mobile-bendahara.jpg",
    intro:
      "Panduan untuk Bendahara Sekolah dalam mengelola tarif SPP, generate tagihan, mencatat pembayaran, dan melakukan pencairan saldo.",
    highlights: [
      "Tarif SPP per kelas",
      "Generate tagihan massal",
      "Pembayaran online auto",
      "Pencairan & laporan",
    ],
    steps: [
      {
        title: "1. Dashboard Bendahara",
        description:
          "Halaman utama menampilkan ringkasan keuangan SPP: saldo live, tagihan bulan ini, lunas, dan tunggakan dengan grafik tren pembayaran bulanan dan distribusi per kelas.",
        image: "/panduan/bendahara-dashboard.jpg",
        bullets: [
          "Kartu: Total Tagihan Bulan Ini, Sudah Dibayar, Tunggakan, Saldo Cair.",
          "Grafik tren pembayaran 6 bulan terakhir.",
          "Notifikasi pembayaran masuk realtime via webhook payment gateway.",
          "Quick action: Generate Tagihan, Catat Pembayaran, Pencairan.",
        ],
      },
      {
        title: "2. Master Data Siswa",
        description:
          "Lihat seluruh data siswa beserta status SPP-nya (lunas/tunggakan/belum tagih).",
        bullets: [
          "Filter per kelas atau status pembayaran.",
          "Klik siswa untuk lihat history pembayaran SPP per bulan.",
          "Total tunggakan per siswa ditampilkan dengan badge merah.",
        ],
      },
      {
        title: "3. Tarif SPP",
        description:
          "Atur tarif SPP per kelas/jenjang. Bisa berbeda per tingkatan kelas (misal SD 100rb, SMP 150rb). Tabel menampilkan Tahun Ajaran, Kelas, Nominal, Jatuh Tempo, dan toggle Aktif.",
        image: "/panduan/bendahara-tarif.jpg",
        bullets: [
          "Tombol 'Tambah Tarif' untuk membuat tarif baru per kelas.",
          "Edit tarif kapan saja — perubahan berlaku untuk tagihan berikutnya.",
          "Tarif lama di tagihan yang sudah di-generate tidak ikut berubah.",
        ],
      },
      {
        title: "4. Generate Tagihan SPP",
        description:
          "Buat tagihan SPP massal untuk semua siswa per bulan dengan satu klik. Pilih mode 'Satu Bulan' atau 'Rentang Bulan', tentukan periode dan kelas tujuan, lalu klik 'Generate Sekarang'.",
        image: "/panduan/bendahara-generate.jpg",
        bullets: [
          "Pilih bulan & tahun tagihan.",
          "Pilih kelas (semua atau spesifik).",
          "Klik 'Generate' — tagihan dibuat untuk semua siswa di kelas terpilih.",
          "Notifikasi WA 'Tagihan SPP' dengan banner branded otomatis terkirim ke semua wali murid.",
          "Link pembayaran online otomatis di-generate per tagihan.",
        ],
      },
      {
        title: "5. Pembayaran SPP",
        description:
          "Catat pembayaran manual (tunai) atau lihat pembayaran online yang masuk otomatis. Tampilan dikelompokkan per kelas dengan tombol 'Kirim WA' massal per rombel.",
        image: "/panduan/bendahara-pembayaran.jpg",
        bullets: [
          "Tab: Belum Bayar / Sudah Bayar / Semua.",
          "Filter per bulan, kelas, atau cari nama siswa.",
          "'Catat Pembayaran Manual' untuk input pembayaran tunai/transfer manual.",
          "Pembayaran online auto-approve — tidak perlu konfirmasi manual.",
          "Bukti pembayaran (kwitansi PDF) bisa di-download per transaksi.",
        ],
      },
      {
        title: "6. Import Tagihan",
        description:
          "Import tagihan SPP massal via Excel — berguna untuk migrasi data dari sistem lama.",
        bullets: [
          "Download template Excel yang disediakan.",
          "Isi: NIS, Bulan, Tahun, Nominal, Status.",
          "Upload file — sistem akan validasi & buat tagihan otomatis.",
        ],
      },
      {
        title: "7. Saldo & Riwayat",
        description:
          "Lihat saldo yang siap dicairkan dan riwayat semua transaksi masuk.",
        bullets: [
          "Saldo tersedia untuk pencairan ditampilkan paling atas.",
          "Riwayat transaksi: nama siswa, bulan, nominal, fee gateway, net.",
          "Filter periode untuk laporan keuangan bulanan.",
        ],
      },
      {
        title: "8. Pencairan & Settlement",
        description:
          "Ajukan pencairan saldo ke rekening sekolah. Settlement otomatis diproses oleh sistem payment gateway.",
        bullets: [
          "Tombol 'Ajukan Pencairan' — pilih nominal & rekening tujuan.",
          "Status: Pending / Diproses / Selesai / Gagal.",
          "Jadwal settlement standar: H+1 hingga H+3 hari kerja.",
        ],
      },
      {
        title: "9. Laporan & Export",
        description:
          "Lihat ringkasan tahunan tagihan vs pembayaran dalam bentuk grafik bar bulanan, statistik per kelas, dan export ke Excel untuk audit atau laporan ke kepala sekolah & yayasan.",
        image: "/panduan/bendahara-laporan.jpg",
        bullets: [
          "Pilih jenis laporan: Per Siswa / Per Kelas / Per Bulan / Konsolidasi.",
          "Filter periode (bulanan/triwulan/tahunan).",
          "Format Excel siap cetak dengan kop sekolah & tanda tangan.",
        ],
      },
    ],
  },
  {
    id: "parent",
    label: "Wali Murid",
    shortLabel: "Wali Murid",
    icon: Users,
    color: "from-pink-500 to-rose-600",
    accent: "bg-pink-50 text-pink-700 border-pink-200",
    cover: "/panduan/parent-login.jpg",
    mobileMockup: "/panduan/mobile-parent.jpg",
    intro:
      "Panduan untuk Wali Murid dalam memantau kehadiran ananda melalui Portal Wali Murid (login via WhatsApp OTP) dan melakukan pembayaran SPP online.",
    highlights: [
      "Login via WhatsApp OTP",
      "Pantau kehadiran ananda",
      "Bayar SPP online",
      "Ajukan izin / sakit",
    ],
    steps: [
      {
        title: "1. Login Portal Wali Murid",
        description:
          "Buka halaman Portal Wali Murid lalu masukkan nomor WhatsApp yang terdaftar di sekolah ananda. Tidak perlu kata sandi.",
        image: "/panduan/parent-login.jpg",
        bullets: [
          "Pastikan nomor WA sudah didaftarkan oleh sekolah/wali kelas.",
          "Klik 'Kirim Kode OTP' — kode 6 digit dikirim via WhatsApp.",
          "Cooldown 60 detik antar permintaan OTP.",
          "Masukkan OTP — login otomatis tanpa password.",
          "Jika 1 nomor terdaftar untuk beberapa anak, akan muncul pilihan anak.",
        ],
      },
      {
        title: "2. Dashboard Wali Murid",
        description:
          "Setelah login, Anda akan melihat ringkasan kehadiran ananda hari ini, jadwal pelajaran, dan notifikasi terbaru.",
        image: "/panduan/parent-dashboard.jpg",
        bullets: [
          "Status kehadiran terkini: Hadir/Izin/Sakit/Alfa/Belum.",
          "Jam datang & jam pulang ananda hari ini.",
          "Statistik kehadiran bulan berjalan (persentase).",
          "Notifikasi otomatis saat ananda datang & pulang sekolah.",
          "Jadwal pelajaran ananda hari ini.",
        ],
      },
      {
        title: "3. Riwayat Kehadiran",
        description:
          "Pantau riwayat kehadiran ananda dalam bentuk daftar harian — tanggal, jam datang, dan status (Hadir/Izin/Sakit/Alfa).",
        image: "/panduan/parent-absensi.jpg",
        bullets: [
          "Daftar riwayat absensi 30 hari terakhir.",
          "Tampilkan tanggal, jam datang, dan metode (manual/QR/face).",
          "Badge status berwarna: Hadir (hijau), Izin (kuning), Sakit (biru), Alfa (merah).",
          "Update otomatis saat ananda absen di sekolah.",
        ],
      },
      {
        title: "4. Tagihan SPP",
        description:
          "Jika sekolah mengaktifkan modul SPP, Anda dapat melihat tagihan dan melakukan pembayaran online via QRIS/transfer bank.",
        image: "/panduan/parent-spp.jpg",
        bullets: [
          "Banner 'Total Tunggakan' menampilkan akumulasi tagihan belum dibayar.",
          "Daftar Tagihan Aktif per bulan: nominal, jatuh tempo, status.",
          "Klik 'Bayar Sekarang' untuk pembayaran online (QRIS/Bank/E-Wallet).",
          "Notifikasi WA 'Pembayaran SPP Berhasil' dengan banner branded otomatis terkirim setelah lunas.",
          "Download kwitansi PDF setelah pembayaran berhasil.",
        ],
      },
      {
        title: "5. Pengajuan Izin / Sakit",
        description:
          "Ajukan izin atau sakit untuk ananda langsung dari portal tanpa perlu datang ke sekolah.",
        image: "/panduan/parent-izin.jpg",
        bullets: [
          "Pilih jenis (Izin/Sakit) dan tanggal pengajuan.",
          "Tulis alasan singkat di kolom Alasan.",
          "Upload surat keterangan dokter (opsional, foto/PDF maks 5MB).",
          "Klik 'Kirim Pengajuan' — wali kelas menerima notifikasi.",
          "Riwayat Pengajuan menampilkan status: Pending / Disetujui / Ditolak.",
        ],
      },
    ],
  },
];
