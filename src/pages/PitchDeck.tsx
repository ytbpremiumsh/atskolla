import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download, Presentation, Lightbulb, AlertTriangle, Rocket, Clock,
  TrendingUp, Shield, Package, CheckCircle2, Users, BarChart3,
  ChevronDown, ChevronUp, ArrowLeft, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const PITCH_SECTIONS = [
  {
    number: 1,
    title: "Introduction",
    icon: Presentation,
    color: "from-blue-500 to-indigo-600",
    content: "ATSkolla adalah platform absensi digital berbasis SaaS (Software-as-a-Service) untuk institusi pendidikan di Indonesia. Didirikan untuk menjawab permasalahan pencatatan kehadiran siswa yang masih manual di lebih dari 85% sekolah di Indonesia. ATSkolla mengintegrasikan teknologi Barcode Scanning, Face Recognition berbasis AI, dan Notifikasi WhatsApp otomatis dalam satu platform yang mudah digunakan.",
    highlights: [
      "Platform SaaS untuk sekolah SD/MI, SMP/MTs, SMA/MA/SMK, dan Pesantren",
      "Beroperasi di sektor EdTech (Education Technology)",
      "Model bisnis B2B dengan langganan bulanan mulai Rp 99.000",
      "Sudah terintegrasi dengan WhatsApp API untuk notifikasi real-time",
    ],
    image: "/images/presentation/ss-dashboard.webp",
  },
  {
    number: 2,
    title: "Problem",
    icon: AlertTriangle,
    color: "from-red-500 to-rose-600",
    content: "Sebagian besar sekolah di Indonesia masih menggunakan metode absensi manual yang memakan waktu 15-30 menit per kelas setiap hari. Data kehadiran rawan kesalahan, manipulasi, dan kehilangan. Orang tua tidak mendapat informasi real-time tentang kehadiran anak mereka — padahal 72% wali murid menginginkan notifikasi langsung (Kemdikbud, 2024).",
    highlights: [
      "Absensi manual memakan waktu 15-30 menit per kelas per hari",
      "Data rawan kesalahan, manipulasi, dan kehilangan",
      "72% wali murid ingin notifikasi real-time kehadiran anak",
      "Laporan absensi sulit direkap dan tidak terdigitalisasi",
      "Tidak ada transparansi antara sekolah dan orang tua",
    ],
    image: null,
  },
  {
    number: 3,
    title: "Solution",
    icon: Rocket,
    color: "from-emerald-500 to-teal-600",
    content: "ATSkolla menghadirkan solusi menyeluruh dengan teknologi scan barcode instan (<2 detik/siswa), Face Recognition berbasis AI untuk keamanan ekstra, dan notifikasi WhatsApp otomatis ke orang tua. Dashboard real-time memungkinkan kepala sekolah memantau kehadiran seluruh siswa dalam satu tampilan, dengan rekap otomatis harian/mingguan/bulanan.",
    highlights: [
      "Scan Barcode — proses kurang dari 2 detik per siswa",
      "Face Recognition AI — verifikasi identitas otomatis",
      "Notifikasi WhatsApp otomatis ke wali murid",
      "Dashboard real-time dengan statistik lengkap",
      "Rekap & export otomatis ke Excel dan PDF",
    ],
    image: "/images/presentation/ss-monitoring.webp",
  },
  {
    number: 4,
    title: "Why Now",
    icon: Clock,
    color: "from-amber-500 to-orange-600",
    content: "Transformasi digital pendidikan sedang menjadi prioritas nasional. Pemerintah mendorong digitalisasi administrasi sekolah melalui program Merdeka Belajar. Penetrasi smartphone dan internet di kalangan guru dan orang tua semakin tinggi. Pandemi telah mengakselerasi adopsi teknologi di sekolah, dan momentum ini harus dimanfaatkan sekarang sebelum pasar jenuh.",
    highlights: [
      "Program Merdeka Belajar mendorong digitalisasi sekolah",
      "Penetrasi smartphone & internet guru/ortu semakin tinggi",
      "Post-pandemi: sekolah sudah terbiasa dengan teknologi",
      "First-mover advantage di segmen absensi digital terintegrasi",
      "Kebutuhan transparansi dan keamanan siswa semakin meningkat",
    ],
    image: null,
  },
  {
    number: 5,
    title: "Market",
    icon: TrendingUp,
    color: "from-violet-500 to-purple-600",
    content: "Indonesia memiliki lebih dari 436.000 sekolah dengan 50 juta siswa di 34 provinsi. Sekitar 85% masih menggunakan absensi manual — ini adalah peluang pasar yang sangat besar. Target utama adalah sekolah swasta (200-1.000 siswa), sekolah negeri unggulan, pondok pesantren modern, dan yayasan pendidikan multi-cabang.",
    highlights: [
      "436.000+ sekolah di Indonesia, 85% masih manual",
      "50 juta siswa tersebar di 34 provinsi",
      "Target primer: sekolah swasta 200-1.000 siswa",
      "Target sekunder: sekolah negeri unggulan & pesantren modern",
      "Target tersier: yayasan pendidikan multi-cabang",
    ],
    image: null,
  },
  {
    number: 6,
    title: "Competition",
    icon: Shield,
    color: "from-cyan-500 to-blue-600",
    content: "Beberapa aplikasi absensi digital sudah ada di pasar, namun sebagian besar hanya menawarkan fitur dasar (scan barcode atau dashboard sederhana). ATSkolla unggul karena mengintegrasikan Barcode + Face Recognition + WhatsApp dalam satu platform dengan harga paling terjangkau (mulai Rp 99.000/bulan).",
    highlights: [
      "Kompetitor hanya menawarkan fitur parsial (barcode saja atau dashboard saja)",
      "ATSkolla = Barcode + Face Recognition + WhatsApp + Dashboard terpadu",
      "Harga paling kompetitif: mulai Rp 99.000/bulan",
      "UI/UX modern dan mudah digunakan oleh non-teknis",
      "Dukungan teknis 24/7 via live chat, tiket, dan WhatsApp",
    ],
    image: "/images/presentation/ss-scan.webp",
  },
  {
    number: 7,
    title: "Product",
    icon: Package,
    color: "from-indigo-500 to-blue-700",
    content: "ATSkolla adalah platform web-based yang dapat diakses dari browser manapun. Fitur utama meliputi: Scan Barcode & QR Code, Face Recognition AI, Notifikasi WhatsApp otomatis, Dashboard monitoring real-time, Manajemen kelas & siswa, Rekap absensi nasional, Export Excel & PDF.",
    highlights: [
      "Scan Barcode/QR Code — instan dan akurat",
      "Face Recognition AI — keamanan level tertinggi",
      "WhatsApp otomatis — notifikasi ke wali murid",
      "Dashboard real-time — statistik kehadiran komprehensif",
      "Export rekap format absensi nasional ke Excel/PDF",
    ],
    image: "/images/presentation/ss-classes.webp",
  },
  {
    number: 8,
    title: "Validation",
    icon: CheckCircle2,
    color: "from-green-500 to-emerald-600",
    content: "ATSkolla telah diuji coba dan divalidasi melalui beberapa tahap: pengembangan iteratif dengan feedback langsung dari guru dan staf sekolah, demo produk ke beberapa sekolah mitra, serta uji coba 14 hari gratis yang menunjukkan tingkat kepuasan tinggi. Sistem uptime 99.9% dengan waktu respons <500ms membuktikan kesiapan produk untuk skala nasional.",
    highlights: [
      "Uji coba 14 hari gratis — tingkat konversi tinggi",
      "Feedback iteratif dari guru dan staf sekolah",
      "Demo langsung ke sekolah mitra",
      "Uptime 99.9% dengan backup ganda",
      "Waktu respons <500ms — tidak ada antrian saat jam masuk",
    ],
    image: "/images/presentation/ss-rekap.webp",
  },
  {
    number: 9,
    title: "Team",
    icon: Users,
    color: "from-pink-500 to-rose-600",
    content: "Tim ATSkolla terdiri dari individu muda yang berdedikasi di bidang teknologi pendidikan. Kompetensi tim mencakup: pengembangan web (React, Node.js, Supabase), desain UI/UX, pemasaran digital, dan pelayanan pelanggan. Struktur organisasi: CEO/Founder (strategi bisnis), CTO (teknologi & keamanan), CMO (pemasaran), COO (operasional).",
    highlights: [
      "CEO/Founder — strategi bisnis & arah pengembangan",
      "CTO — pengembangan teknologi & keamanan sistem",
      "CMO — strategi pemasaran & penjualan",
      "COO — operasional harian & layanan pelanggan",
      "Expertise: React, Node.js, AI, UI/UX, Digital Marketing",
    ],
    image: null,
  },
  {
    number: 10,
    title: "Financial Projection",
    icon: BarChart3,
    color: "from-yellow-500 to-amber-600",
    content: "Proyeksi keuangan disusun berdasarkan target realistis: 50 sekolah di tahun pertama dan 200 sekolah di tahun kedua dengan komposisi 65% paket Premium. Modal awal Rp 15.000.000. Proyeksi laba bersih: Rp 132.350.000 (Tahun 1) dan Rp 751.350.000 (Tahun 2). Margin keuntungan 50-80% setelah tahun pertama.",
    highlights: [
      "Modal awal: Rp 15.000.000",
      "Target: 50 sekolah (Tahun 1), 200 sekolah (Tahun 2)",
      "Pendapatan: Rp 228,6 juta (Thn 1), Rp 913,6 juta (Thn 2)",
      "Laba bersih: Rp 132,35 juta (Thn 1), Rp 751,35 juta (Thn 2)",
      "3 paket: Basic Rp 99rb, School Rp 249rb, Premium Rp 399rb/bulan",
    ],
    image: null,
    financialTable: true,
  },
];

const FORMAT_RULES = [
  "Pitch Deck maksimal 12 slide beserta dengan cover.",
  "Format materi presentasi hasil karya sendiri.",
  "Isi slide dapat berupa: teks, film, animasi gambar, suara.",
  "Outline Pitch Deck harus sesuai dengan bagian-bagian yang disebutkan.",
  "Masing-masing peserta diberi waktu maksimal 40 menit (mencakup presentasi dan sesi tanya jawab).",
];

const FinancialTable = () => (
  <div className="overflow-x-auto mt-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <th className="p-3 text-left rounded-tl-lg">Keterangan</th>
          <th className="p-3 text-right">Tahun 1</th>
          <th className="p-3 text-right rounded-tr-lg">Tahun 2</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-blue-50 dark:bg-blue-950/30 font-semibold">
          <td className="p-3" colSpan={3}>Pendapatan</td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="p-3 pl-6">Langganan SaaS</td>
          <td className="p-3 text-right">Rp 192.600.000</td>
          <td className="p-3 text-right">Rp 777.600.000</td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="p-3 pl-6">Jasa Enterprise</td>
          <td className="p-3 text-right">Rp 15.000.000</td>
          <td className="p-3 text-right">Rp 50.000.000</td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="p-3 pl-6">Layanan Add-on</td>
          <td className="p-3 text-right">Rp 21.000.000</td>
          <td className="p-3 text-right">Rp 86.000.000</td>
        </tr>
        <tr className="bg-green-50 dark:bg-green-950/30 font-bold text-green-700 dark:text-green-400">
          <td className="p-3">TOTAL PENDAPATAN</td>
          <td className="p-3 text-right">Rp 228.600.000</td>
          <td className="p-3 text-right">Rp 913.600.000</td>
        </tr>
        <tr className="bg-red-50 dark:bg-red-950/30 font-semibold">
          <td className="p-3" colSpan={3}>Pengeluaran</td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="p-3 pl-6">Server & Cloud + Domain</td>
          <td className="p-3 text-right">Rp 6.250.000</td>
          <td className="p-3 text-right">Rp 6.250.000</td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="p-3 pl-6">Kompensasi Tim (4 orang)</td>
          <td className="p-3 text-right">Rp 72.000.000</td>
          <td className="p-3 text-right">Rp 120.000.000</td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="p-3 pl-6">Pemasaran & Operasional</td>
          <td className="p-3 text-right">Rp 18.000.000</td>
          <td className="p-3 text-right">Rp 36.000.000</td>
        </tr>
        <tr className="bg-red-50 dark:bg-red-950/30 font-bold text-red-700 dark:text-red-400">
          <td className="p-3">TOTAL PENGELUARAN</td>
          <td className="p-3 text-right">Rp 96.250.000</td>
          <td className="p-3 text-right">Rp 162.250.000</td>
        </tr>
        <tr className="bg-emerald-100 dark:bg-emerald-950/40 font-bold text-emerald-700 dark:text-emerald-400 text-base">
          <td className="p-3 rounded-bl-lg">LABA BERSIH</td>
          <td className="p-3 text-right">Rp 132.350.000</td>
          <td className="p-3 text-right rounded-br-lg">Rp 751.350.000</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const PitchDeck = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPPT = async () => {
    setDownloading(true);
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const pres = new pptxgen();
      pres.layout = "LAYOUT_WIDE";
      pres.author = "ATSkolla";
      pres.title = "ATSkolla - Pitch Deck";

      // Color palette
      const PRIMARY = "2563EB";
      const DARK = "1E293B";
      const WHITE = "FFFFFF";
      const LIGHT_BG = "F1F5F9";
      const ACCENT_COLORS = [
        "3B82F6", "EF4444", "10B981", "F59E0B", "8B5CF6",
        "06B6D4", "4F46E5", "22C55E", "EC4899", "EAB308",
      ];

      // Slide 1: Cover
      const coverSlide = pres.addSlide();
      coverSlide.background = { fill: DARK };
      coverSlide.addShape(pres.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: "100%",
        fill: { type: "solid", color: "1E3A5F" },
      });
      coverSlide.addShape(pres.ShapeType.rect, {
        x: 0, y: 4.8, w: "100%", h: 0.08,
        fill: { type: "solid", color: PRIMARY },
      });
      coverSlide.addText("ATSkolla", {
        x: 0.8, y: 1.5, w: 11, h: 1.2,
        fontSize: 54, fontFace: "Arial", bold: true,
        color: WHITE, align: "left",
      });
      coverSlide.addText("Sistem Absensi Digital Sekolah", {
        x: 0.8, y: 2.7, w: 11, h: 0.7,
        fontSize: 24, fontFace: "Arial",
        color: "94A3B8", align: "left",
      });
      coverSlide.addText("Berbasis Barcode, Face Recognition & WhatsApp Notification", {
        x: 0.8, y: 3.3, w: 11, h: 0.5,
        fontSize: 16, fontFace: "Arial",
        color: "64748B", align: "left",
      });
      coverSlide.addText("PITCH DECK 2026", {
        x: 0.8, y: 5.2, w: 5, h: 0.4,
        fontSize: 12, fontFace: "Arial", bold: true,
        color: PRIMARY,
      });

      // Content slides
      PITCH_SECTIONS.forEach((section, idx) => {
        const slide = pres.addSlide();
        const accentColor = ACCENT_COLORS[idx];
        slide.background = { fill: WHITE };

        // Top accent bar
        slide.addShape(pres.ShapeType.rect, {
          x: 0, y: 0, w: "100%", h: 0.06,
          fill: { type: "solid", color: accentColor },
        });

        // Section number badge
        slide.addShape(pres.ShapeType.rect, {
          x: 0.6, y: 0.5, w: 0.6, h: 0.6, rectRadius: 0.1,
          fill: { type: "solid", color: accentColor },
        });
        slide.addText(`${section.number}`, {
          x: 0.6, y: 0.5, w: 0.6, h: 0.6,
          fontSize: 20, fontFace: "Arial", bold: true,
          color: WHITE, align: "center", valign: "middle",
        });

        // Title
        slide.addText(section.title, {
          x: 1.4, y: 0.5, w: 8, h: 0.6,
          fontSize: 28, fontFace: "Arial", bold: true,
          color: DARK,
        });

        // Content text
        slide.addText(section.content, {
          x: 0.6, y: 1.4, w: section.image ? 6.5 : 11.5, h: 1.6,
          fontSize: 13, fontFace: "Arial",
          color: "475569", lineSpacingMultiple: 1.3,
          valign: "top",
        });

        // Highlights
        if (section.highlights) {
          section.highlights.forEach((h, hi) => {
            slide.addText(`▸ ${h}`, {
              x: 0.8, y: 3.2 + hi * 0.45, w: section.image ? 6.3 : 11.3, h: 0.4,
              fontSize: 12, fontFace: "Arial",
              color: "334155",
              valign: "top",
            });
          });
        }

        // Financial table for last slide
        if (section.financialTable) {
          const tableRows: any[][] = [
            [
              { text: "Keterangan", options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 11 } },
              { text: "Tahun 1", options: { bold: true, color: WHITE, fill: { color: PRIMARY }, align: "right", fontSize: 11 } },
              { text: "Tahun 2", options: { bold: true, color: WHITE, fill: { color: PRIMARY }, align: "right", fontSize: 11 } },
            ],
            [{ text: "Langganan SaaS", options: { fontSize: 10 } }, { text: "Rp 192.600.000", options: { align: "right", fontSize: 10 } }, { text: "Rp 777.600.000", options: { align: "right", fontSize: 10 } }],
            [{ text: "Jasa Enterprise", options: { fontSize: 10 } }, { text: "Rp 15.000.000", options: { align: "right", fontSize: 10 } }, { text: "Rp 50.000.000", options: { align: "right", fontSize: 10 } }],
            [{ text: "TOTAL PENDAPATAN", options: { bold: true, color: "16A34A", fontSize: 10 } }, { text: "Rp 228.600.000", options: { bold: true, align: "right", color: "16A34A", fontSize: 10 } }, { text: "Rp 913.600.000", options: { bold: true, align: "right", color: "16A34A", fontSize: 10 } }],
            [{ text: "TOTAL PENGELUARAN", options: { bold: true, color: "DC2626", fontSize: 10 } }, { text: "Rp 96.250.000", options: { bold: true, align: "right", color: "DC2626", fontSize: 10 } }, { text: "Rp 162.250.000", options: { bold: true, align: "right", color: "DC2626", fontSize: 10 } }],
            [{ text: "LABA BERSIH", options: { bold: true, color: "059669", fontSize: 11, fill: { color: "ECFDF5" } } }, { text: "Rp 132.350.000", options: { bold: true, align: "right", color: "059669", fontSize: 11, fill: { color: "ECFDF5" } } }, { text: "Rp 751.350.000", options: { bold: true, align: "right", color: "059669", fontSize: 11, fill: { color: "ECFDF5" } } }],
          ];
          slide.addTable(tableRows, {
            x: 0.6, y: 3.0, w: 11.5,
            border: { type: "solid", pt: 0.5, color: "CBD5E1" },
            colW: [5, 3.25, 3.25],
          });
        }

        // Footer
        slide.addText(`ATSkolla Pitch Deck — Slide ${idx + 2}`, {
          x: 0.6, y: 7.0, w: 6, h: 0.3,
          fontSize: 9, fontFace: "Arial", color: "94A3B8",
        });
      });

      // Closing slide
      const closingSlide = pres.addSlide();
      closingSlide.background = { fill: DARK };
      closingSlide.addShape(pres.ShapeType.rect, {
        x: 0, y: 3.2, w: "100%", h: 0.06,
        fill: { type: "solid", color: PRIMARY },
      });
      closingSlide.addText("Terima Kasih", {
        x: 0, y: 1.5, w: "100%", h: 1,
        fontSize: 48, fontFace: "Arial", bold: true,
        color: WHITE, align: "center",
      });
      closingSlide.addText("ATSkolla — Absensi Digital Sekolah Masa Depan", {
        x: 0, y: 2.5, w: "100%", h: 0.6,
        fontSize: 18, fontFace: "Arial",
        color: "94A3B8", align: "center",
      });
      closingSlide.addText("www.atskolla.com", {
        x: 0, y: 5.0, w: "100%", h: 0.4,
        fontSize: 14, fontFace: "Arial",
        color: PRIMARY, align: "center",
      });

      await pres.writeFile({ fileName: "ATSkolla_PitchDeck.pptx" });
      toast.success("Pitch Deck berhasil didownload!");
    } catch (error) {
      console.error("PPT download error:", error);
      toast.error("Gagal mendownload Pitch Deck");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <Button onClick={handleDownloadPPT} disabled={downloading} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Download className="w-4 h-4" />
              {downloading ? "Membuat PPT..." : "Download PPT"}
            </Button>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pb-4">
            <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 mb-4">Pitch Deck 2026</Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">ATSkolla</h1>
            <p className="text-lg text-blue-200/80 max-w-2xl mx-auto">

              Sistem Absensi Digital Sekolah Berbasis Barcode, Pengenalan wajah & WhatsApp Notification
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Format Rules */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-600 text-white"><FileText className="w-5 h-5" /></div>
                <h2 className="text-xl font-bold text-foreground">Format Pembuatan Pitch Deck</h2>
              </div>
              <ul className="space-y-2">
                {FORMAT_RULES.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="font-bold text-blue-600 min-w-[20px]">{i + 1}.</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pitch Sections */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            Penjelasan Bagian-Bagian Pitch Deck
          </h2>

          {PITCH_SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === idx;

            return (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={idx}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/60">
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : idx)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${section.color} text-white shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{section.number}</Badge>
                          <h3 className="text-lg font-bold text-foreground">{section.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{section.content}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <CardContent className="px-5 pb-5 pt-0 border-t">
                      <div className={`grid ${section.image ? "md:grid-cols-2" : "grid-cols-1"} gap-6 mt-4`}>
                        <div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{section.content}</p>
                          {section.highlights && (
                            <ul className="space-y-2">
                              {section.highlights.map((h, hi) => (
                                <li key={hi} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                  <span className="text-foreground">{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {section.financialTable && <FinancialTable />}
                        </div>
                        {section.image && (
                          <div className="rounded-xl overflow-hidden border shadow-md">
                            <img src={section.image} alt={section.title} className="w-full h-auto object-cover" loading="lazy" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Download */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Siap Presentasi?</h3>
              <p className="text-blue-100 mb-6">Unduh Pitch Deck dalam format PowerPoint (.pptx)</p>
              <Button size="lg" variant="secondary" className="gap-2" onClick={handleDownloadPPT} disabled={downloading}>
                <Download className="w-5 h-5" />
                {downloading ? "Membuat file..." : "Download Pitch Deck (.pptx)"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PitchDeck;
