import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode, Monitor, Users, BarChart3, Bell, FileText, Shield, Smartphone,
  CheckCircle2, ArrowRight, Star, Zap, Clock, Globe, MessageSquare,
  GraduationCap, ChevronRight, Phone, Mail, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const WHY_CHOOSE = [
  { icon: QrCode, title: "Scan QR Instan", desc: "Absensi kurang dari 1 detik dengan scan barcode. Tidak perlu absensi manual lagi." },
  { icon: Monitor, title: "Dashboard Real-Time", desc: "Pantau kehadiran seluruh siswa secara live dari satu layar." },
  { icon: Bell, title: "Notifikasi WhatsApp", desc: "Wali murid otomatis ternotifikasi saat anak hadir di sekolah." },
  { icon: BarChart3, title: "Rekap Otomatis", desc: "Laporan harian, mingguan, bulanan otomatis siap export Excel & PDF." },
  { icon: Shield, title: "Face Recognition AI", desc: "Teknologi pengenalan wajah untuk keamanan dan kemudahan absensi." },
  { icon: Smartphone, title: "Responsif & Mudah", desc: "Akses dari HP, tablet, atau komputer tanpa install aplikasi." },
];

const SHOWCASE_IMAGES = [
  { src: "/images/presentation/ss-dashboard.webp", title: "Dashboard Analitik", desc: "Statistik kehadiran lengkap real-time" },
  { src: "/images/presentation/ss-monitoring.webp", title: "Live Monitoring", desc: "Pantau kehadiran secara langsung" },
  { src: "/images/presentation/ss-scan.webp", title: "Scan Multi-Metode", desc: "QR Code, Face Recognition, NIS Manual" },
  { src: "/images/presentation/ss-students.webp", title: "Database Siswa", desc: "Kelola data siswa lengkap" },
  { src: "/images/presentation/ss-whatsapp.webp", title: "WhatsApp Otomatis", desc: "Notifikasi kehadiran ke orang tua" },
  { src: "/images/presentation/ss-rekap.webp", title: "Rekap & Export", desc: "Format absensi nasional" },
];

const PRICING = [
  {
    name: "Basic",
    price: "Rp 99.000",
    period: "/bulan",
    features: ["10 Kelas", "200 Siswa", "Import/Export Excel", "Export Laporan PDF", "Upload Foto Siswa"],
    accent: "border-blue-500",
    badge: "",
  },
  {
    name: "School",
    price: "Rp 249.000",
    period: "/bulan",
    features: ["Unlimited Kelas", "Unlimited Siswa", "Semua fitur Basic", "WhatsApp Otomatis", "Multi Staff/Operator", "Custom Logo Sekolah"],
    accent: "border-indigo-500",
    badge: "Populer",
  },
  {
    name: "Premium",
    price: "Rp 399.000",
    period: "/bulan",
    features: ["Semua fitur School", "Face Recognition AI", "Multi Cabang", "Prioritas Support", "White-label Branding"],
    accent: "border-purple-500",
    badge: "Terlengkap",
  },
];

const TESTIMONIALS = [
  { name: "Bapak Hendra", role: "Kepala Sekolah SD Nusantara", text: "ATSkolla sangat membantu kami dalam mengelola kehadiran 500+ siswa setiap hari. Orang tua pun senang karena selalu mendapat info kehadiran anaknya.", rating: 5 },
  { name: "Ibu Sari", role: "Admin TK Harapan Bangsa", text: "Sebelumnya kami masih pakai buku absen manual. Sekarang dengan ATSkolla, semua jadi digital dan rapi. Sangat recommended!", rating: 5 },
  { name: "Bapak Ahmad", role: "Guru SMP Mutiara", text: "Fitur wali kelas sangat membantu saya memantau kehadiran siswa di kelas yang saya ampu. Dashboard-nya mudah dipahami.", rating: 5 },
];

const Penawaran = () => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setContent({});
    setLoading(false);
  }, []);


  const c = (key: string, fallback: string) => content[key] || fallback;
  const showBanner = c("promo_banner_active", "true") === "true";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Promo Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white text-center py-3 px-4">
          <p className="text-sm font-semibold flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            {c("promo_banner_text", "PROMO SPESIAL: Diskon 20% untuk pendaftaran bulan ini!")}
            <Sparkles className="h-4 w-4" />
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 mb-6 text-sm px-4 py-1.5">
                Platform #1 Absensi Sekolah Digital
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                {c("hero_title", "Solusi Absensi Digital Terbaik untuk Sekolah Anda")}
              </h1>
              <p className="text-lg md:text-xl text-blue-100/80 mb-8 leading-relaxed">
                {c("hero_subtitle", "ATSkolla menghadirkan sistem absensi modern berbasis QR Code, Face Recognition, dan notifikasi WhatsApp otomatis.")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={c("hero_cta_link", "/register")}>
                  <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-lg px-8 py-6 rounded-xl shadow-xl shadow-indigo-500/30">
                    {c("hero_cta_text", "Mulai Gratis Sekarang")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/fitur">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl">
                    Lihat Presentasi
                  </Button>
                </Link>
              </div>
              <div className="flex gap-8 mt-10">
                {[
                  { val: "500+", label: "Sekolah" },
                  { val: "50.000+", label: "Siswa" },
                  { val: "99.9%", label: "Uptime" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold text-white">{s.val}</p>
                    <p className="text-xs text-blue-200/70">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="hidden md:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-3xl blur-xl" />
                <img
                  src="/images/presentation/ss-dashboard.webp"
                  alt="ATSkolla Dashboard"
                  className="relative rounded-2xl shadow-2xl border border-white/10"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 mb-4">Keunggulan</Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              {c("section_why_title", "Mengapa Sekolah Memilih ATSkolla?")}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Didesain khusus untuk kebutuhan sekolah Indonesia dengan teknologi terkini
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {WHY_CHOOSE.map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="group bg-white rounded-2xl p-8 border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Showcase */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4">Tampilan</Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Lihat Langsung Tampilannya
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Interface yang intuitif dan mudah digunakan oleh siapa saja
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {SHOWCASE_IMAGES.map((img, i) => (
              <motion.div
                key={img.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
              >
                <div className="aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={img.src}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900">{img.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{img.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-indigo-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-4">Harga</Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              {c("section_pricing_title", "Paket Harga Terjangkau")}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {c("section_pricing_subtitle", "Pilih paket yang sesuai dengan kebutuhan sekolah Anda")}
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className={`relative bg-white rounded-2xl p-8 border-2 ${plan.accent} shadow-lg hover:shadow-xl transition-all duration-300 ${plan.badge === "Populer" ? "scale-105 md:scale-110" : ""}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-0 px-4 py-1">
                    {plan.badge}
                  </Badge>
                )}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-indigo-600">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl py-6">
                    Pilih {plan.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-8">
            Semua paket termasuk <strong>Paket Free</strong> tanpa batas waktu — 2 kelas, 20 siswa
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <Badge className="bg-green-100 text-green-700 border-green-200 mb-4">Testimoni</Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Dipercaya oleh Sekolah di Seluruh Indonesia
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-5 w-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic">"{t.text}"</p>
                <div>
                  <p className="font-bold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6">
              Siap Modernisasi Absensi Sekolah Anda?
            </h2>
            <p className="text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto">
              Bergabung dengan ratusan sekolah yang sudah beralih ke sistem absensi digital. Mulai gratis, upgrade kapan saja.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <Link to="/register">
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-blue-50 text-lg px-10 py-6 rounded-xl font-bold shadow-xl">
                  Daftar Gratis Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href={`https://wa.me/${c("contact_whatsapp", "6281234567890")}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-6 rounded-xl">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Hubungi Kami
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-6 justify-center text-sm text-blue-200/70">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp: {c("contact_whatsapp", "6281234567890")}
              </span>
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {c("contact_email", "info@atskolla.com")}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} ATSkolla — Absensi Digital Sekolah. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Penawaran;
