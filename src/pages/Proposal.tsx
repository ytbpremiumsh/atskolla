import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Target, TrendingUp, Users, DollarSign,
  Shield, Layers, Rocket, BarChart3, Globe, Building2, Zap,
  CheckCircle2, AlertTriangle, Star, ChevronRight, Smartphone,
  QrCode, Bell, FileCheck, UserCheck, Wifi, Heart, ShieldCheck,
  Eye, Download, Award, ClipboardList
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { downloadAsWord, downloadAsPDF } from "@/lib/proposalContent";
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } })
};

const Section = ({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`py-12 sm:py-16 ${className}`}>
    <div className="max-w-5xl mx-auto px-4 sm:px-6">{children}</div>
  </section>
);

const SectionTitle = ({ bab, title, icon: Icon }: { bab: string; title: string; icon: any }) => (
  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
    className="mb-8 sm:mb-10">
    <div className="flex items-center gap-3 mb-2">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-xs font-bold text-primary uppercase tracking-widest">{bab}</span>
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
    <div className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-primary/40" />
  </motion.div>
);

const NAV = [
  { id: "bab1", label: "BAB I - Pendahuluan" },
  { id: "bab2", label: "BAB II - Strategi Usaha" },
  { id: "bab3", label: "BAB III - Produk" },
  { id: "bab4", label: "BAB IV - Organisasi" },
  { id: "bab5", label: "BAB V - Keuangan" },
  { id: "bab6", label: "BAB VI - Kesimpulan" },
  { id: "bab7", label: "BAB VII - Daftar Pustaka" },
  { id: "bab8", label: "BAB VIII - Lampiran" },
  { id: "kriteria", label: "Kriteria Penilaian" },
];

const BMC = {
  keyPartners: [
    "Sekolah dan yayasan pendidikan di seluruh wilayah Indonesia",
    "Dinas Pendidikan tingkat kabupaten, kota, dan provinsi",
    "Penyedia layanan WhatsApp API (Onesender) untuk pengiriman notifikasi otomatis",
    "Penyedia layanan cloud computing (Supabase) untuk penyimpanan dan pengelolaan data",
  ],
  keyActivities: [
    "Pengembangan dan pemeliharaan fitur platform secara berkelanjutan",
    "Integrasi teknologi barcode dan pengenalan wajah (face recognition) berbasis kecerdasan buatan",
    "Pelaksanaan strategi pemasaran digital serta kunjungan langsung ke institusi pendidikan",
    "Penyelenggaraan pelatihan dan pendampingan bagi sekolah mitra baru",
    "Pengelolaan infrastruktur server, keamanan data, dan layanan bantuan teknis",
  ],
  keyResources: [
    "Tim pengembang (developer) yang kompeten di bidang pengembangan web dan aplikasi mobile",
    "Infrastruktur server cloud dengan kapasitas skalabilitas tinggi",
    "Basis data terpusat yang memuat informasi siswa, tenaga pendidik, dan catatan kehadiran",
    "Sistem kecerdasan buatan untuk fitur pengenalan wajah",
    "Tim customer success yang terlatih untuk mendampingi pengguna",
  ],
  valueProposition: [
    "Pencatatan kehadiran secara digital dan real-time melalui pemindaian barcode serta pengenalan wajah",
    "Notifikasi otomatis kepada orang tua/wali murid melalui WhatsApp saat siswa tiba di sekolah",
    "Dashboard terpusat untuk memantau kehadiran seluruh siswa dalam satu tampilan",
    "Pembuatan laporan dan rekapitulasi kehadiran secara otomatis (harian, mingguan, bulanan)",
    "Efisiensi waktu tenaga pendidik hingga 80% dibandingkan pencatatan manual",
    "Peningkatan transparansi dan keamanan di lingkungan sekolah",
  ],
  customerRelationships: [
    "Pendampingan dan pelatihan secara cuma-cuma bagi sekolah mitra baru",
    "Layanan bantuan melalui live chat dan sistem tiket dukungan",
    "Program referral dan poin loyalitas bagi pengguna setia",
    "Komunitas pengguna antarsekolah untuk berbagi pengalaman dan praktik terbaik",
    "Pembaruan fitur secara berkala berdasarkan masukan dan kebutuhan pengguna",
  ],
  channels: [
    "Situs web resmi dan halaman pendaftaran daring",
    "Media sosial (Instagram, TikTok, dan YouTube)",
    "Kunjungan langsung ke sekolah untuk demonstrasi produk",
    "Pemasaran melalui WhatsApp dan grup komunitas pendidikan",
    "Webinar edukatif bertema digitalisasi administrasi sekolah",
    "Program afiliasi untuk memperluas jangkauan ke lebih banyak institusi pendidikan",
  ],
  customerSegments: [
    "Sekolah jenjang SD/MI, SMP/MTs, SMA/MA/SMK",
    "Sekolah swasta dan sekolah negeri",
    "Yayasan pendidikan yang mengelola beberapa cabang sekolah",
    "Lembaga bimbingan belajar dan kursus",
    "Pondok pesantren modern",
  ],
  costStructure: [
    "Biaya sewa server dan layanan cloud computing",
    "Gaji dan tunjangan tim pengembang, desainer, serta staf layanan pelanggan",
    "Biaya penggunaan layanan WhatsApp API untuk pengiriman notifikasi",
    "Biaya pemasaran dan promosi dalam rangka akuisisi pelanggan",
    "Biaya operasional kantor dan kebutuhan administrasi",
  ],
  revenueStreams: [
    "Pendapatan berlangganan bulanan paket SaaS (Basic, School, Premium)",
    "Jasa implementasi dan kustomisasi untuk institusi pendidikan berskala besar",
    "Layanan tambahan WhatsApp (add-on pesan broadcast)",
    "Layanan white-labeling bagi yayasan yang menghendaki penggunaan merek sendiri",
  ],
};

const Proposal = () => {
  const [activeNav, setActiveNav] = useState("bab1");
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Download functions now imported from proposalContent.ts

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <h1 className="text-sm font-bold text-foreground">Proposal Bisnis - ATSkolla</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />  Unduh
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={downloadAsPDF} className="gap-2 cursor-pointer">
                <Download className="h-4 w-4" />  Unduh PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsWord} className="gap-2 cursor-pointer">
                <Download className="h-4 w-4" />  Unduh Word (.doc)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* SIDEBAR */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Daftar Isi</p>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeNav === n.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {/* COVER */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16 sm:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
                  <BookOpen className="h-3.5 w-3.5" /> Proposal Rencana Bisnis
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight mb-4">
                  ATSkolla
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">

                  Sistem Absensi Digital Sekolah Berbasis Barcode dan Pengenalan wajah
                  dengan Notifikasi WhatsApp Secara Real-time
                </p>
                <div className="mt-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2 gradient-primary hover:opacity-90">
                        <Download className="h-4 w-4" />  Unduh Proposal Lengkap
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={downloadAsPDF} className="gap-2 cursor-pointer">
                        <Download className="h-4 w-4" />  Unduh PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadAsWord} className="gap-2 cursor-pointer">
                        <Download className="h-4 w-4" />  Unduh Word (.doc)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {["SaaS Platform", "Face Recognition AI", "WhatsApp API", "Real-time Dashboard"].map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* BAB I */}
          <Section id="bab1">
            <SectionTitle bab="BAB I" title="Pendahuluan" icon={BookOpen} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.1</span> Latar Belakang
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Pada saat ini, sebagian besar sekolah di Indonesia masih menerapkan metode konvensional
                  dalam pencatatan kehadiran siswa, yakni melalui buku absensi, lembar kertas, dan tanda
                  tangan manual. Metode tersebut memerlukan waktu yang cukup lama, yaitu sekitar 15 hingga
                  30 menit untuk setiap kelas dalam satu hari. Selain itu, metode manual sangat rentan
                  terhadap kesalahan pencatatan, kehilangan data, serta potensi manipulasi kehadiran oleh siswa.
                </p>
                <p>
                  Di sisi lain, para orang tua dan wali murid memiliki kekhawatiran yang cukup tinggi
                  terhadap kehadiran dan keselamatan anak mereka selama berada di lingkungan sekolah.
                  Berdasarkan data yang dirilis oleh Kementerian Pendidikan dan Kebudayaan pada tahun 2024,
                  lebih dari 72% wali murid menghendaki adanya sistem pemberitahuan secara langsung
                  (real-time) mengenai status kehadiran anak mereka. Namun demikian, sebagian besar sekolah
                  belum memiliki infrastruktur digital yang memadai untuk mewujudkan hal tersebut.
                </p>
                <p>
                  Bertolak dari permasalahan tersebut, ATSkolla hadir sebagai solusi yang bersifat menyeluruh
                  dan terintegrasi. ATSkolla merupakan platform digital yang memadukan teknologi pemindaian
                  barcode, pengenalan wajah (face recognition) berbasis kecerdasan buatan, notifikasi otomatis
                  melalui WhatsApp, serta dashboard pemantauan kehadiran secara langsung. Melalui ATSkolla,
                  proses pencatatan kehadiran yang sebelumnya dilakukan secara manual dapat bertransformasi
                  menjadi sistem yang sepenuhnya digital dan otomatis, sehingga meningkatkan efisiensi,
                  akurasi, dan transparansi dalam pengelolaan kehadiran siswa.
                </p>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.2</span> Deskripsi Usaha
              </h3>
              <Card className="border-0 shadow-sm bg-card/50">
                <CardContent className="p-5 space-y-3 text-sm text-muted-foreground">
                  <p>
                    ATSkolla merupakan platform berbasis Software-as-a-Service (SaaS) yang menyediakan
                    sistem pencatatan kehadiran digital dan pemantauan secara real-time bagi institusi
                    pendidikan di Indonesia. Platform ini bergerak di sektor EdTech (Education Technology)
                    dengan mengadopsi model bisnis berlangganan yang bersifat Business-to-Business (B2B).
                    Sasaran utama layanan ATSkolla meliputi sekolah pada berbagai jenjang pendidikan,
                    pondok pesantren, serta lembaga pendidikan lainnya yang memerlukan sistem pencatatan
                    kehadiran yang modern dan efisien.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: "Sektor", value: "EdTech (Education Technology)" },
                      { label: "Model Bisnis", value: "SaaS Berlangganan (B2B)" },
                      { label: "Produk Utama", value: "Platform Pencatatan Kehadiran Digital" },
                      { label: "Sasaran Pasar", value: "SD/MI, SMP/MTs, SMA/MA/SMK, Pesantren" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{item.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.3</span> Visi dan Misi Usaha
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-5 w-5 text-primary" />
                      <h4 className="font-bold text-foreground">Visi</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Menjadi platform pencatatan kehadiran digital terdepan yang digunakan secara luas
                      oleh institusi pendidikan di Indonesia, sehingga mampu mendorong modernisasi
                      administrasi sekolah, memberikan ketenangan bagi orang tua, serta meningkatkan
                      keamanan bagi siswa.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/30 to-accent/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="h-5 w-5 text-primary" />
                      <h4 className="font-bold text-foreground">Misi</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {[
                        "Menyediakan sistem pencatatan kehadiran digital yang mudah dioperasikan dengan harga terjangkau bagi seluruh jenjang pendidikan.",
                        "Mengimplementasikan teknologi mutakhir seperti kecerdasan buatan (AI) dan pemindaian barcode guna meningkatkan akurasi data kehadiran.",
                        "Membangun saluran komunikasi langsung antara pihak sekolah dan orang tua melalui notifikasi WhatsApp secara otomatis.",
                        "Mendukung proses digitalisasi administrasi sekolah secara menyeluruh dan berkelanjutan.",
                      ].map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.4</span> Analisis Pasar
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Indonesia memiliki lebih dari <strong className="text-foreground">436.000 sekolah</strong> dengan
                  jumlah siswa mencapai sekitar <strong className="text-foreground">50 juta</strong> yang tersebar di
                  34 provinsi. Dari jumlah tersebut, diperkirakan sekitar 85% sekolah masih menggunakan metode
                  pencatatan kehadiran secara manual. Kondisi ini menunjukkan bahwa peluang pasar untuk sistem
                  pencatatan kehadiran digital di Indonesia sangatlah besar dan masih terbuka lebar untuk digarap.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Building2, value: "436K+", label: "Total Sekolah", color: "text-emerald-500" },
                    { icon: Users, value: "50M+", label: "Total Siswa", color: "text-amber-500" },
                    { icon: Globe, value: "34", label: "Provinsi", color: "text-cyan-500" },
                    { icon: TrendingUp, value: "85%", label: "Masih Manual", color: "text-rose-500" },
                  ].map((stat, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                        <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-bold text-foreground">Segmentasi Sasaran Pasar</h4>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        { title: "Sasaran Utama", desc: "Sekolah swasta dengan jumlah siswa antara 200 hingga 1.000 orang yang telah mengalokasikan anggaran untuk digitalisasi. Segmen ini cenderung lebih cepat dalam mengadopsi teknologi baru." },
                        { title: "Sasaran Kedua", desc: "Sekolah negeri unggulan dan pondok pesantren modern yang menghendaki peningkatan keamanan serta transparansi dalam pengelolaan data kehadiran siswa." },
                        { title: "Sasaran Ketiga", desc: "Yayasan pendidikan yang mengelola beberapa cabang sekolah dan memerlukan sistem pemantauan terpusat yang dapat diakses dari satu tempat." },
                      ].map((seg) => (
                        <div key={seg.title} className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-primary mb-1">{seg.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{seg.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5}>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.5</span> Analisis Kompetitor
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-bold text-foreground rounded-tl-lg">Fitur</th>
                      <th className="text-center p-3 font-bold text-primary">ATSkolla</th>
                      <th className="text-center p-3 font-bold text-muted-foreground">Kompetitor A</th>
                      <th className="text-center p-3 font-bold text-muted-foreground rounded-tr-lg">Kompetitor B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Pemindaian Barcode", true, true, false],
                      ["Pengenalan Wajah (Face Recognition AI)", true, false, false],
                      ["Notifikasi WhatsApp Otomatis", true, false, true],
                      ["Dashboard Pemantauan Real-time", true, true, true],
                      ["Dukungan Multi-cabang / Grup Sekolah", true, false, false],
                      ["Harga Berlangganan Mulai Rp 99.000", true, false, true],
                      ["Layanan White-labeling", true, false, false],
                    ].map(([fitur, a, b, c], i) => (
                      <tr key={i} className="hover:bg-muted/20 transition">
                        <td className="p-3 text-muted-foreground">{fitur as string}</td>
                        <td className="p-3 text-center">{a ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">-</span>}</td>
                        <td className="p-3 text-center">{b ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">-</span>}</td>
                        <td className="p-3 text-center">{c ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Card className="border-0 shadow-sm mt-4">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-foreground mb-1">Keunggulan Kompetitif (Unique Selling Point)</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ATSkolla merupakan satu-satunya platform yang mengintegrasikan teknologi pemindaian barcode,
                    pengenalan wajah berbasis kecerdasan buatan, serta notifikasi WhatsApp otomatis dalam satu
                    sistem yang terpadu. Dengan harga berlangganan mulai dari Rp 99.000 per bulan, ATSkolla
                    menjadi solusi yang paling komprehensif sekaligus paling terjangkau di segmen pasar
                    EdTech Indonesia saat ini.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB II */}
          <Section id="bab2" className="bg-muted/20">
            <SectionTitle bab="BAB II" title="Strategi Usaha" icon={Target} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">2.1</span> Model Bisnis - Business Model Canvas
              </h3>

              {/* BMC VISUAL */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[800px] grid grid-cols-10 grid-rows-[auto_auto_auto] gap-[2px] bg-border rounded-xl overflow-hidden text-[10px] sm:text-xs">
                  <BmcBlock title="Key Partners" items={BMC.keyPartners} icon={Building2} className="col-span-2 row-span-2 bg-rose-50 dark:bg-rose-950/30" color="text-rose-600 dark:text-rose-400" />
                  <BmcBlock title="Key Activities" items={BMC.keyActivities} icon={Zap} className="col-span-2 bg-amber-50 dark:bg-amber-950/30" color="text-amber-600 dark:text-amber-400" />
                  <BmcBlock title="Value Propositions" items={BMC.valueProposition} icon={Heart} className="col-span-2 row-span-2 bg-primary/5" color="text-primary" />
                  <BmcBlock title="Customer Relationships" items={BMC.customerRelationships} icon={Users} className="col-span-2 bg-cyan-50 dark:bg-cyan-950/30" color="text-cyan-600 dark:text-cyan-400" />
                  <BmcBlock title="Customer Segments" items={BMC.customerSegments} icon={Target} className="col-span-2 row-span-2 bg-violet-50 dark:bg-violet-950/30" color="text-violet-600 dark:text-violet-400" />
                  <BmcBlock title="Key Resources" items={BMC.keyResources} icon={Layers} className="col-span-2 bg-emerald-50 dark:bg-emerald-950/30" color="text-emerald-600 dark:text-emerald-400" />
                  <BmcBlock title="Channels" items={BMC.channels} icon={Globe} className="col-span-2 bg-indigo-50 dark:bg-indigo-950/30" color="text-indigo-600 dark:text-indigo-400" />
                  <BmcBlock title="Cost Structure" items={BMC.costStructure} icon={DollarSign} className="col-span-5 bg-red-50 dark:bg-red-950/30" color="text-red-600 dark:text-red-400" />
                  <BmcBlock title="Revenue Streams" items={BMC.revenueStreams} icon={TrendingUp} className="col-span-5 bg-green-50 dark:bg-green-950/30" color="text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="text-foreground">Keterkaitan Antar-Elemen BMC:</strong> Model bisnis
                      ATSkolla dirancang dengan pendekatan sistematis di mana setiap elemen saling mendukung
                      dan berkaitan. Mitra utama (Key Partners) yang terdiri dari sekolah, yayasan pendidikan,
                      dan penyedia layanan API WhatsApp menyediakan jaringan distribusi dan infrastruktur
                      teknologi yang diperlukan. Aktivitas utama (Key Activities) mencakup pengembangan platform,
                      integrasi teknologi, serta pelaksanaan strategi pemasaran. Keseluruhan aktivitas tersebut
                      menghasilkan proposisi nilai (Value Proposition) berupa sistem pencatatan kehadiran digital
                      yang komprehensif, akurat, dan mudah digunakan. Proposisi nilai ini disampaikan kepada
                      pelanggan melalui berbagai kanal (Channels) seperti situs web, media sosial, dan
                      kunjungan langsung ke institusi pendidikan.
                    </p>
                    <p>
                      <strong className="text-foreground">Arus Pendapatan (Revenue Streams):</strong> Pendapatan
                      utama bersumber dari tiga pilihan paket berlangganan bulanan: Basic (Rp 99.000), School
                      (Rp 249.000), dan Premium (Rp 399.000). Pendapatan tambahan dari jasa enterprise meliputi
                      setup & konfigurasi sekolah baru, pelatihan & onboarding intensif, dan kustomisasi yayasan
                      multi-cabang. Layanan add-on mencakup kuota tambahan WhatsApp broadcast, kartu pelajar
                      digital (cetak QR), dan white-label branding bagi yayasan.
                    </p>
                    <p>
                      <strong className="text-foreground">Struktur Biaya (Cost Structure):</strong> Biaya
                      operasional terdiri dari server cloud Supabase Pro (≈ Rp 400.000/bulan), WhatsApp API MPWA
                      (≈ Rp 150.000/bulan/device), kompensasi tim freelance (developer dan CS part-time), serta
                      biaya pemasaran digital. Total pengeluaran tahun pertama diproyeksikan hanya Rp 46,7 juta,
                      sehingga margin keuntungan dapat mencapai 40-70% sejak tahun pertama.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">2.2</span> Rencana Pemasaran
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Strategi Akuisisi Pelanggan",
                    icon: Target,
                    items: [
                      "Menyediakan masa uji coba gratis selama 14 hari bagi sekolah yang baru mendaftarkan diri, sehingga pihak sekolah dapat mengevaluasi manfaat platform tanpa risiko finansial.",
                      "Melaksanakan demonstrasi produk secara langsung melalui kunjungan ke sekolah-sekolah yang menjadi sasaran pemasaran.",
                      "Menyelenggarakan webinar edukatif dengan tema \"Digitalisasi Sistem Kehadiran di Era Modern\" guna meningkatkan kesadaran pasar.",
                      "Menjalin kerja sama strategis dengan Dinas Pendidikan di berbagai daerah agar ATSkolla dapat direkomendasikan kepada sekolah-sekolah di wilayah tersebut.",
                    ],
                  },
                  {
                    title: "Strategi Branding dan Promosi",
                    icon: Star,
                    items: [
                      "Mengembangkan konten edukatif yang informatif dan menarik di platform media sosial seperti Instagram, TikTok, dan YouTube.",
                      "Menampilkan testimoni dan pengalaman positif dari sekolah-sekolah yang telah menggunakan ATSkolla sebagai bukti sosial (social proof).",
                      "Menjalankan program referral di mana setiap pengguna yang berhasil merekomendasikan sekolah lain akan memperoleh poin yang dapat ditukarkan dengan reward tertentu.",
                      "Membuka program afiliasi bagi komunitas pendidikan dan individu yang berkeinginan turut serta mempromosikan ATSkolla.",
                    ],
                  },
                ].map((strat) => (
                  <Card key={strat.title} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <strat.icon className="h-5 w-5 text-primary" />
                        <h4 className="font-bold text-foreground text-sm">{strat.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {strat.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* BAB III */}
          <Section id="bab3">
            <SectionTitle bab="BAB III" title="Produk atau Jasa" icon={Layers} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">3.1</span> Deskripsi Produk
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                ATSkolla menawarkan sejumlah fitur unggulan yang saling terintegrasi dan melengkapi
                satu sama lain. Setiap fitur dirancang agar mudah dioperasikan oleh tenaga pendidik,
                staf sekolah, maupun orang tua tanpa memerlukan keahlian teknis khusus.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { icon: QrCode, title: "Pemindaian Barcode", desc: "Siswa cukup menunjukkan kartu pelajar digital, kemudian petugas melakukan pemindaian. Proses pencatatan kehadiran berlangsung kurang dari 2 detik per siswa, sehingga meniadakan antrian saat jam masuk sekolah." },
                  { icon: UserCheck, title: "Pengenalan Wajah (Pengenalan wajah AI)", desc: "Bagi sekolah yang menghendaki tingkat keamanan yang lebih tinggi, tersedia fitur pengenalan wajah otomatis yang mampu memverifikasi identitas siswa secara akurat tanpa memerlukan kartu fisik." },
                  { icon: Bell, title: "Notifikasi WhatsApp Otomatis", desc: "Setiap kali siswa melakukan pemindaian kehadiran, orang tua atau wali murid akan menerima pemberitahuan secara langsung melalui WhatsApp secara otomatis." },
                  { icon: BarChart3, title: "Dashboard Pemantauan Real-time", desc: "Kepala sekolah dan tenaga pendidik dapat memantau kehadiran seluruh siswa dalam satu tampilan yang informatif. Data selalu diperbarui secara langsung tanpa perlu menunggu rekapitulasi manual." },
                  { icon: FileCheck, title: "Laporan dan Rekapitulasi Otomatis", desc: "Sistem secara otomatis menghasilkan rekapitulasi kehadiran (harian, mingguan, dan bulanan) yang siap dicetak atau diekspor ke dalam format Excel kapan saja diperlukan." },
                  { icon: ShieldCheck, title: "Keamanan Data", desc: "Seluruh data siswa dan catatan kehadiran diamankan dengan teknologi enkripsi tingkat tinggi. Hanya pihak yang berwenang yang dapat mengakses informasi tersebut." },
                ].map((f, i) => (
                  <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <f.icon className="h-8 w-8 text-primary mb-3" />
                      <h4 className="text-sm font-bold text-foreground mb-1">{f.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">3.2</span> Proses Pemberian Layanan
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Proses pemberian layanan ATSkolla kepada institusi pendidikan dilaksanakan
                melalui tahapan-tahapan berikut:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { step: "1", title: "Registrasi", desc: "Pihak sekolah mendaftarkan akun dan menginput data siswa ke dalam sistem ATSkolla." },
                  { step: "2", title: "Konfigurasi", desc: "Tim ATSkolla membantu pihak sekolah dalam mengatur barcode atau sistem pengenalan wajah untuk setiap siswa." },
                  { step: "3", title: "Operasional", desc: "Setiap hari, siswa melakukan pemindaian kehadiran dan data secara otomatis tercatat ke dalam dashboard." },
                  { step: "4", title: "Notifikasi", desc: "Orang tua atau wali murid menerima pemberitahuan secara otomatis melalui WhatsApp setiap kali siswa mencatat kehadiran." },
                  { step: "5", title: "Pemantauan", desc: "Pihak sekolah dapat memantau data kehadiran serta mengunduh laporan kapan saja dan dari mana saja." },
                ].map((s, i) => (
                  <div key={i} className="flex-1 relative">
                    <Card className="border-0 shadow-sm h-full">
                      <CardContent className="p-4 text-center">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mx-auto mb-2">
                          {s.step}
                        </div>
                        <h4 className="text-xs font-bold text-foreground mb-1">{s.title}</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">3.3</span> Kualitas dan Pengendalian Kualitas
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                ATSkolla menerapkan standar kualitas yang ketat guna memastikan pengalaman
                pengguna yang optimal. Berikut adalah standar kualitas yang senantiasa dijaga:
              </p>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: ShieldCheck, title: "Ketersediaan Sistem (Uptime) 99,9%", desc: "Infrastruktur cloud yang digunakan dilengkapi dengan sistem backup ganda, sehingga layanan dapat diakses secara berkelanjutan tanpa gangguan yang berarti." },
                      { icon: Wifi, title: "Waktu Respons Kurang dari 500 Milidetik", desc: "Proses pemindaian dan pengiriman data berlangsung sangat cepat, sehingga tidak menimbulkan antrian saat jam masuk maupun pulang sekolah." },
                      { icon: Shield, title: "Enkripsi Data Tingkat Tinggi", desc: "Seluruh informasi siswa dilindungi dengan teknologi enkripsi yang memenuhi standar keamanan. Hanya pihak yang berwenang yang dapat mengakses data tersebut." },
                      { icon: Smartphone, title: "Layanan Dukungan Teknis 24/7", desc: "Tim dukungan teknis siap memberikan bantuan kapan saja melalui berbagai kanal komunikasi, termasuk live chat, tiket dukungan, dan WhatsApp." },
                    ].map((q, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <q.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{q.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{q.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB IV */}
          <Section id="bab4" className="bg-muted/20">
            <SectionTitle bab="BAB IV" title="Manajemen dan Organisasi" icon={Users} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">4.1</span> Struktur Organisasi
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Struktur organisasi ATSkolla dirancang secara efisien dan fungsional. Pada posisi
                puncak terdapat CEO/Founder yang bertanggung jawab atas perumusan strategi bisnis
                dan penentuan arah pengembangan produk. Di bawahnya terdapat tiga divisi utama
                yang masing-masing memiliki peran dan tanggung jawab yang spesifik:
              </p>
              <div className="flex flex-col items-center">
                <OrgCard title="CEO / Founder" name="[Nama Founder]" desc="Perumusan strategi bisnis dan penentuan arah pengembangan produk" color="bg-primary" />
                <div className="h-6 w-px bg-border" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
                  <OrgCard title="CTO" name="[Nama CTO]" desc="Pengembangan teknologi, pengelolaan server, dan keamanan sistem" color="bg-cyan-500" />
                  <OrgCard title="CMO" name="[Nama CMO]" desc="Perumusan dan pelaksanaan strategi pemasaran serta penjualan" color="bg-amber-500" />
                  <OrgCard title="COO" name="[Nama COO]" desc="Pengelolaan operasional harian, layanan pelanggan, dan pelatihan" color="bg-emerald-500" />
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">4.2</span> Tim Manajemen
              </h3>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Tim ATSkolla terdiri dari individu-individu muda yang memiliki dedikasi tinggi di
                    bidang teknologi dan pendidikan. Setiap anggota tim memiliki kompetensi yang saling
                    melengkapi, sehingga mampu menghadirkan produk dan layanan berkualitas tinggi bagi
                    institusi pendidikan di Indonesia. Berikut adalah komposisi tim beserta bidang
                    keahlian masing-masing:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { role: "Full-Stack Developer", count: "2 orang", skill: "Kompeten di bidang React, Node.js, dan Supabase untuk pengembangan dan pemeliharaan platform." },
                      { role: "UI/UX Designer", count: "1 orang", skill: "Merancang antarmuka pengguna yang intuitif, estetis, dan mudah dioperasikan." },
                      { role: "Sales dan Marketing", count: "2 orang", skill: "Melaksanakan strategi pemasaran digital serta kunjungan langsung ke institusi pendidikan." },
                      { role: "Customer Success", count: "1 orang", skill: "Mendampingi sekolah mitra baru mulai dari pelatihan awal hingga mampu mengoperasikan platform secara mandiri." },
                    ].map((member) => (
                      <div key={member.role} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-bold text-foreground">{member.role}</p>
                        <p className="text-xs text-primary font-medium">{member.count}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{member.skill}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB V */}
          <Section id="bab5">
            <SectionTitle bab="BAB V" title="Analisis Keuangan" icon={DollarSign} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">5.1</span> Proyeksi Pendapatan dan Pengeluaran (2 Tahun)
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Proyeksi disusun berdasarkan target realistis: <strong className="text-foreground">50 sekolah</strong> di tahun pertama
                dan <strong className="text-foreground">200 sekolah</strong> di tahun kedua, dengan komposisi 65% paket Premium.
                Biaya operasional dihitung berdasarkan harga aktual layanan yang digunakan.
              </p>

              <h4 className="text-sm font-bold text-foreground mb-2 mt-4">A. PENDAPATAN</h4>

              {/* Komposisi Sekolah */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-bold text-foreground rounded-tl-lg">Komposisi Sekolah</th>
                      <th className="text-center p-2 font-bold text-foreground">Tahun 1 (50 Sekolah)</th>
                      <th className="text-center p-2 font-bold text-foreground rounded-tr-lg">Tahun 2 (200 Sekolah)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/20"><td className="p-2 text-muted-foreground">Paket Basic (15%)</td><td className="p-2 text-center text-foreground">8 sekolah</td><td className="p-2 text-center text-foreground">30 sekolah</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2 text-muted-foreground">Paket School (20%)</td><td className="p-2 text-center text-foreground">10 sekolah</td><td className="p-2 text-center text-foreground">40 sekolah</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2 text-muted-foreground">Paket Premium (65%)</td><td className="p-2 text-center text-foreground font-semibold">32 sekolah</td><td className="p-2 text-center text-foreground font-semibold">130 sekolah</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Pendapatan */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2.5 font-bold text-foreground rounded-tl-lg">Keterangan</th>
                      <th className="text-left p-2.5 font-bold text-foreground">Rincian</th>
                      <th className="text-right p-2.5 font-bold text-foreground">Tahun 1</th>
                      <th className="text-right p-2.5 font-bold text-foreground rounded-tr-lg">Tahun 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-primary/5"><td colSpan={4} className="p-2.5 font-bold text-foreground">Pendapatan Langganan SaaS</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">Paket Basic (Rp 99.000/bln)</td><td className="p-2.5 text-muted-foreground">8 sekolah × 12 bulan</td><td className="p-2.5 text-right text-foreground">Rp 9.504.000</td><td className="p-2.5 text-right text-foreground">Rp 35.640.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">Paket School (Rp 249.000/bln)</td><td className="p-2.5 text-muted-foreground">10 sekolah × 12 bulan</td><td className="p-2.5 text-right text-foreground">Rp 29.880.000</td><td className="p-2.5 text-right text-foreground">Rp 119.520.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">Paket Premium (Rp 399.000/bln)</td><td className="p-2.5 text-muted-foreground">32 sekolah × 12 bulan</td><td className="p-2.5 text-right text-foreground">Rp 153.216.000</td><td className="p-2.5 text-right text-foreground">Rp 622.440.000</td></tr>
                    <tr className="font-bold"><td className="p-2.5 text-foreground" colSpan={2}>Subtotal Langganan SaaS</td><td className="p-2.5 text-right text-foreground">Rp 192.600.000</td><td className="p-2.5 text-right text-foreground">Rp 777.600.000</td></tr>

                    <tr className="bg-primary/5"><td colSpan={4} className="p-2.5 font-bold text-foreground">Pendapatan Jasa Enterprise</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">Pelatihan & onboarding intensif</td><td className="p-2.5 text-muted-foreground">Rp 1.000.000/sesi</td><td className="p-2.5 text-right text-foreground">Rp 15.000.000</td><td className="p-2.5 text-right text-foreground">Rp 50.000.000</td></tr>
                    <tr className="font-bold"><td className="p-2.5 text-foreground" colSpan={2}>Subtotal Jasa Enterprise</td><td className="p-2.5 text-right text-foreground">Rp 15.000.000</td><td className="p-2.5 text-right text-foreground">Rp 50.000.000</td></tr>

                    <tr className="bg-primary/5"><td colSpan={4} className="p-2.5 font-bold text-foreground">Pendapatan Layanan Add-on</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">Kuota tambahan WA broadcast</td><td className="p-2.5 text-muted-foreground">Rp 50.000/1.000 pesan</td><td className="p-2.5 text-right text-foreground">Rp 5.000.000</td><td className="p-2.5 text-right text-foreground">Rp 20.000.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">Cetak Kartu Pelajar</td><td className="p-2.5 text-muted-foreground">Rp 7.000/kartu</td><td className="p-2.5 text-right text-foreground">Rp 14.000.000</td><td className="p-2.5 text-right text-foreground">Rp 56.000.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground pl-5">White-label branding yayasan</td><td className="p-2.5 text-muted-foreground">Rp 2 jt/yayasan/tahun</td><td className="p-2.5 text-right text-foreground">Rp 2.000.000</td><td className="p-2.5 text-right text-foreground">Rp 10.000.000</td></tr>
                    <tr className="font-bold"><td className="p-2.5 text-foreground" colSpan={2}>Subtotal Layanan Add-on</td><td className="p-2.5 text-right text-foreground">Rp 21.000.000</td><td className="p-2.5 text-right text-foreground">Rp 86.000.000</td></tr>

                    <tr><td colSpan={4} className="h-1" /></tr>
                    <tr className="font-bold bg-emerald-50 dark:bg-emerald-950/20"><td className="p-2.5 text-emerald-700 dark:text-emerald-400" colSpan={2}>TOTAL PENDAPATAN</td><td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400">Rp 228.600.000</td><td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400">Rp 913.600.000</td></tr>
                  </tbody>
                </table>
              </div>
              <h4 className="text-sm font-bold text-foreground mb-2">B. PENGELUARAN</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2.5 font-bold text-foreground rounded-tl-lg">Keterangan</th>
                      <th className="text-left p-2.5 font-bold text-foreground">Rincian</th>
                      <th className="text-right p-2.5 font-bold text-foreground">Tahun 1</th>
                      <th className="text-right p-2.5 font-bold text-foreground rounded-tr-lg">Tahun 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground">Biaya Server & Cloud</td><td className="p-2.5 text-muted-foreground">Rp 500.000/bulan</td><td className="p-2.5 text-right text-foreground">Rp 6.000.000</td><td className="p-2.5 text-right text-foreground">Rp 6.000.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground">Domain</td><td className="p-2.5 text-muted-foreground">Domain .com per tahun</td><td className="p-2.5 text-right text-foreground">Rp 250.000</td><td className="p-2.5 text-right text-foreground">Rp 250.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground">Kompensasi Tim (4 Orang)</td><td className="p-2.5 text-muted-foreground">Rp 1.500.000/org/bln → Rp 2.500.000</td><td className="p-2.5 text-right text-foreground">Rp 72.000.000</td><td className="p-2.5 text-right text-foreground">Rp 120.000.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground">Biaya Pemasaran Digital</td><td className="p-2.5 text-muted-foreground">Iklan sosmed, konten, kunjungan</td><td className="p-2.5 text-right text-foreground">Rp 12.000.000</td><td className="p-2.5 text-right text-foreground">Rp 24.000.000</td></tr>
                    <tr className="hover:bg-muted/20"><td className="p-2.5 text-muted-foreground">Biaya Operasional Lainnya</td><td className="p-2.5 text-muted-foreground">WA API, pulsa, transportasi, tools</td><td className="p-2.5 text-right text-foreground">Rp 6.000.000</td><td className="p-2.5 text-right text-foreground">Rp 12.000.000</td></tr>
                    <tr><td colSpan={4} className="h-1" /></tr>
                    <tr className="font-bold bg-red-50 dark:bg-red-950/20"><td className="p-2.5 text-red-700 dark:text-red-400" colSpan={2}>TOTAL PENGELUARAN</td><td className="p-2.5 text-right text-red-700 dark:text-red-400">Rp 96.250.000</td><td className="p-2.5 text-right text-red-700 dark:text-red-400">Rp 162.250.000</td></tr>
                    <tr><td colSpan={4} className="h-1" /></tr>
                    <tr className="font-bold bg-emerald-50 dark:bg-emerald-950/20"><td className="p-2.5 text-emerald-700 dark:text-emerald-400" colSpan={2}>LABA BERSIH</td><td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400">Rp 132.350.000</td><td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400">Rp 751.350.000</td></tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">5.2</span> Perencanaan Modal
              </h3>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Modal awal yang dibutuhkan untuk memulai operasional bisnis adalah sebesar
                    <strong className="text-foreground"> Rp 15.000.000</strong>. Dana tersebut akan
                    dialokasikan ke beberapa pos kebutuhan utama sebagai berikut:
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "Pengembangan Platform & Tools", pct: 17, amount: "Rp 2.500.000", desc: "Biaya tools development, library berbayar, dan testing." },
                      { label: "Pemasaran Awal & Akuisisi", pct: 33, amount: "Rp 5.000.000", desc: "Iklan digital, cetak brosur, dan kunjungan sekolah 3 bulan pertama." },
                      { label: "Infrastruktur & Domain (6 bulan)", pct: 23, amount: "Rp 3.500.000", desc: "Server cloud Rp 500.000/bln × 6 + domain Rp 250.000 + WA API." },
                      { label: "Operasional & Dana Cadangan", pct: 27, amount: "Rp 4.000.000", desc: "Kebutuhan operasional harian, transportasi, dan dana darurat." },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.amount} ({item.pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">5.3</span> Analisis Risiko
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Setiap kegiatan usaha tidak terlepas dari potensi risiko. Oleh karena itu, diperlukan
                identifikasi risiko sedini mungkin beserta strategi mitigasi yang tepat. Berikut adalah
                risiko-risiko yang mungkin dihadapi beserta rencana penanganannya:
              </p>
              <div className="space-y-3">
                {[
                  {
                    risk: "Lambatnya adopsi teknologi oleh pihak sekolah",
                    level: "Sedang",
                    mitigation: "Menyediakan uji coba gratis selama 14 hari agar pihak sekolah dapat mengevaluasi manfaat platform tanpa risiko finansial. Selain itu, tim akan melaksanakan demonstrasi langsung dan memberikan pendampingan penuh selama proses transisi.",
                  },
                  {
                    risk: "Gangguan teknis atau downtime pada server",
                    level: "Rendah",
                    mitigation: "Menggunakan infrastruktur cloud dengan kemampuan auto-scaling dan backup harian. Selain itu, terdapat tim yang memantau performa server selama 24 jam penuh, sehingga setiap gangguan dapat segera ditangani.",
                  },
                  {
                    risk: "Kemunculan kompetitor baru dengan produk serupa",
                    level: "Sedang",
                    mitigation: "Melakukan inovasi berkelanjutan dengan penambahan fitur-fitur baru yang belum dimiliki oleh kompetitor, menjaga daya saing harga, serta memperkuat keunikan produk sebagai diferensiasi.",
                  },
                  {
                    risk: "Ketergantungan pada penyedia layanan WhatsApp API",
                    level: "Rendah",
                    mitigation: "Menyiapkan kanal komunikasi alternatif seperti SMS, email, dan push notification sebagai jalur cadangan. Dengan demikian, apabila terjadi gangguan pada satu kanal, notifikasi tetap dapat terkirim melalui kanal lainnya.",
                  },
                ].map((r, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <AlertTriangle className={`h-4 w-4 ${r.level === "Rendah" ? "text-emerald-500" : "text-amber-500"}`} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{r.risk}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.level === "Rendah" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>{r.level}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                        <strong>Strategi Mitigasi:</strong> {r.mitigation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* BAB VI */}
          <Section id="bab6" className="bg-muted/20">
            <SectionTitle bab="BAB VI" title="Kesimpulan" icon={CheckCircle2} />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    ATSkolla merupakan solusi pencatatan kehadiran digital yang dikembangkan untuk menjawab
                    permasalahan nyata yang dihadapi oleh institusi pendidikan di Indonesia. Dengan
                    mengintegrasikan teknologi pemindaian barcode, pengenalan wajah berbasis kecerdasan
                    buatan, notifikasi WhatsApp otomatis, dan dashboard pemantauan secara langsung, ATSkolla
                    menawarkan sistem yang komprehensif, akurat, dan mudah digunakan oleh berbagai jenjang
                    pendidikan.
                  </p>
                  <p>
                    Melihat potensi pasar yang sangat besar -- lebih dari 436.000 sekolah dengan 85% di
                    antaranya masih menggunakan metode manual -- serta didukung oleh model bisnis SaaS yang
                    telah terbukti keberlanjutannya dan keunggulan produk yang nyata dibandingkan kompetitor,
                    terdapat keyakinan kuat bahwa ATSkolla memiliki prospek untuk menjadi salah satu pemain
                    utama di industri EdTech Indonesia.
                  </p>
                  <p>
                    Harapan yang ingin diwujudkan melalui ATSkolla bukan sekadar menyediakan alat pencatatan
                    kehadiran, melainkan turut berkontribusi dalam transformasi digital di dunia pendidikan
                    Indonesia. Sekolah menjadi lebih efisien dalam pengelolaan administrasi, orang tua
                    memperoleh ketenangan karena senantiasa mendapatkan informasi terkini mengenai kehadiran
                    anak mereka, dan siswa memperoleh perlindungan yang lebih baik melalui sistem pencatatan
                    yang terdigitalisasi.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB VII */}
          <Section id="bab7">
            <SectionTitle bab="BAB VII" title="Daftar Pustaka" icon={BookOpen} />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-2 text-xs text-muted-foreground">
                  {[
                    "Kementerian Pendidikan dan Kebudayaan. (2024). Data Referensi Pendidikan. https://referensi.data.kemdikbud.go.id",
                    "Badan Pusat Statistik. (2024). Statistik Pendidikan Indonesia.",
                    "Osterwalder, A., dan Pigneur, Y. (2010). Business Model Generation. John Wiley and Sons.",
                    "McKinsey and Company. (2023). The State of EdTech in Southeast Asia.",
                    "Onesender. (2024). WhatsApp API Documentation. https://onesender.net",
                  ].map((ref, i) => (
                    <p key={i} className="pl-6 -indent-6">[{i + 1}] {ref}</p>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB VIII */}
          <Section id="bab8" className="bg-muted/20">
            <SectionTitle bab="BAB VIII" title="Lampiran" icon={FileCheck} />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>Berikut adalah dokumen-dokumen pendukung yang dapat disertakan untuk melengkapi proposal ini:</p>
                  <ul className="space-y-2">
                    {[
                      "Tangkapan layar (screenshot) tampilan dashboard ATSkolla.",
                      "Contoh kartu pelajar digital yang dilengkapi dengan barcode.",
                      "Contoh notifikasi WhatsApp yang diterima oleh orang tua/wali murid.",
                      "Sertifikat dan penghargaan yang dimiliki oleh tim.",
                      "Surat kerja sama atau Memorandum of Understanding (MoU) dengan sekolah mitra.",
                      "Dokumentasi kegiatan demonstrasi dan pelatihan di sekolah mitra.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary font-bold text-xs">{i + 1}.</span>
                        <span className="text-xs">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* KRITERIA PENILAIAN */}
          <Section id="kriteria">
            <SectionTitle bab="LAMPIRAN" title="Kriteria Penilaian" icon={Award} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                1. Kriteria Penilaian Karya Proposal dan Business Model Canvas
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-bold text-foreground w-12">No</TableHead>
                      <TableHead className="font-bold text-foreground" colSpan={2}>Kriteria</TableHead>
                      <TableHead className="font-bold text-foreground text-center w-24">Bobot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell rowSpan={2} className="font-bold text-foreground align-top">1</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={2}>Kreativitas</TableCell>
                      <TableCell className="text-muted-foreground">Gagasan (Unik dan Bermanfaat)</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Keunggulan produk/jasa</TableCell>
                      <TableCell className="text-center font-semibold">15%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell rowSpan={2} className="font-bold text-foreground align-top">2</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={2}>Potensi Program</TableCell>
                      <TableCell className="text-muted-foreground">Kelayakan Usaha</TableCell>
                      <TableCell className="text-center font-semibold">25%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Potensi Perolehan Profit</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-foreground">3</TableCell>
                      <TableCell className="font-semibold text-foreground">Kelayakan Anggaran</TableCell>
                      <TableCell className="text-muted-foreground">Penyusunan Anggaran Biaya</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={3} className="font-bold text-foreground text-right">Total</TableCell>
                      <TableCell className="text-center font-bold text-primary text-lg">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="pb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                2. Kriteria Perilaku Presentasi
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-bold text-foreground w-12">No</TableHead>
                      <TableHead className="font-bold text-foreground" colSpan={2}>Kriteria</TableHead>
                      <TableHead className="font-bold text-foreground text-center w-24">Bobot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell rowSpan={3} className="font-bold text-foreground align-top">1</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={3}>Kreativitas</TableCell>
                      <TableCell className="text-muted-foreground">Gagasan Usaha (analisis peluang pasar, dukungan sumber daya yang dimiliki)</TableCell>
                      <TableCell className="text-center font-semibold">15%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Keunggulan Produk (berbasis IPTEK, unik, dan bermanfaat)</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Rancangan Usaha</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell rowSpan={2} className="font-bold text-foreground align-top">2</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={2}>Potensi Program</TableCell>
                      <TableCell className="text-muted-foreground">Potensi Pelaksanaan dan Perolehan Profit</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Potensi Keberlanjutan Usaha</TableCell>
                      <TableCell className="text-center font-semibold">15%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-foreground">3</TableCell>
                      <TableCell className="font-semibold text-foreground">Penjadwalan Kegiatan dan Personalia</TableCell>
                      <TableCell className="text-muted-foreground">Lengkap, Jelas, Waktu, dan Personalianya Sesuai</TableCell>
                      <TableCell className="text-center font-semibold">5%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-foreground">4</TableCell>
                      <TableCell className="font-semibold text-foreground">Penyusunan Anggaran Biaya</TableCell>
                      <TableCell className="text-muted-foreground">Lengkap, Rinci, Wajar, dan Jelas Peruntukannya</TableCell>
                      <TableCell className="text-center font-semibold">5%</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={3} className="font-bold text-foreground text-right">Total</TableCell>
                      <TableCell className="text-center font-bold text-primary text-lg">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </Section>
        </main>
      </div>
    </div>
  );
};

const BmcBlock = ({ title, items, icon: Icon, className, color }: {
  title: string; items: string[]; icon: any; className: string; color: string;
}) => (
  <div className={`p-3 sm:p-4 ${className}`}>
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <h4 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${color}`}>{title}</h4>
    </div>
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-[9px] sm:text-[10px] text-muted-foreground leading-snug flex items-start gap-1">
          <span className={`mt-1 h-1 w-1 rounded-full shrink-0 ${color.replace("text-", "bg-")}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const OrgCard = ({ title, name, desc, color }: { title: string; name: string; desc: string; color: string }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4 text-center">
      <div className={`h-10 w-10 rounded-full ${color} text-white text-xs font-bold flex items-center justify-center mx-auto mb-2`}>
        {title.split(" ")[0].charAt(0)}
      </div>
      <p className="text-xs font-bold text-foreground">{title}</p>
      <p className="text-[10px] text-primary font-medium">{name}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
    </CardContent>
  </Card>
);

export default Proposal;
