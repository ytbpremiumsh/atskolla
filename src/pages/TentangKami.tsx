import { BrandLogo } from "@/components/brand/BrandLogo";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ShieldCheck, HeartHandshake, Zap, Sparkles,
  Building2, GraduationCap, MapPin, Target, Compass, CheckCircle2,
} from "lucide-react";

const ATSKOLLA_LOGO_URL = "https://www.atskolla.com/images/logo-atskolla.png";

const VALUES = [
  { icon: ShieldCheck, title: "Terpercaya", desc: "Akses disesuaikan dengan sekolah dan peran pengguna agar informasi digunakan sesuai kebutuhan." },
  { icon: HeartHandshake, title: "Berpihak pada Sekolah", desc: "Penggunaan tanpa biaya langganan sekolah mengikuti ketentuan SPP Online yang dijelaskan sebelum pendaftaran." },
  { icon: Zap, title: "Cepat & Mudah", desc: "Panduan persiapan membantu sekolah melengkapi data dan akun secara bertahap." },
  { icon: Sparkles, title: "Terus Berkembang", desc: "Fitur baru dirilis rutin berdasarkan masukan sekolah di seluruh Indonesia." },
];

const STATS = [
 {icon:Building2,value:"Sekolah",label:"Administrasi terpusat"},
 {icon:GraduationCap,value:"Siswa",label:"Informasi sesuai kebutuhan"},
 {icon:MapPin,value:"Online",label:"Akses web dan Android"},
];
const MILESTONES = [
 {year:"01",title:"Persiapan data",desc:"Lengkapi profil sekolah, siswa, kelas, dan akun petugas."},
 {year:"02",title:"Kegiatan sekolah",desc:"Atur jadwal dan catat kehadiran sesuai kebutuhan sekolah."},
 {year:"03",title:"Pembayaran",desc:"Bendahara menyiapkan rekening dan mengelola tagihan online."},
 {year:"04",title:"Informasi bersama",desc:"Wali memantau informasi anak melalui portal yang terhubung."},
];

export default function TentangKami() {
  useEffect(() => {
    document.title = "Tentang Kami — ATSkolla";
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const desc = "Kenali ATSkolla, layanan pengelolaan absensi, SPP, jadwal, dan informasi sekolah.";
    setMeta("description", desc);
    setMeta("og:title", "Tentang Kami — ATSkolla", "property");
    setMeta("og:description", desc, "property");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#0b1020] antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <BrandLogo src={ATSKOLLA_LOGO_URL} alt="ATSkolla" className="h-9 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <Link to="/" className="text-[#0b1020] hover:text-[#5B6CF9]">Beranda</Link>
            <Link to="/tentang" className="text-[#5B6CF9]">Tentang Kami</Link>
            <Link to="/kontak" className="text-[#0b1020] hover:text-[#5B6CF9]">Kontak</Link>
          </nav>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 bg-[#5B6CF9] hover:bg-[#5B6CF9]/90 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg shadow-[#5B6CF9]/25"
          >
            Mulai Gratis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(11,16,32,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,16,32,.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at top, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at top, black 40%, transparent 80%)",
          }}
        />
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-[#5B6CF9] rounded-full blur-[140px] opacity-[0.12] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#5B6CF9]/30 bg-[#5B6CF9]/10">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#5B6CF9]" />
            <span className="text-[11px] font-semibold tracking-[0.18em] text-[#5B6CF9] uppercase">Tentang Kami</span>
          </div>
          <h1 className="mt-5 font-display text-4xl md:text-5xl lg:text-6xl font-bold text-[#0b1020] tracking-tight leading-[1.05]">
            Kami membangun <span className="text-[#5B6CF9]">sekolah digital</span> untuk Indonesia.
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#0b1020]/65 max-w-2xl mx-auto leading-relaxed">
            ATSkolla membantu sekolah mengelola kehadiran, pembayaran, jadwal, dan informasi wali murid dalam satu layanan.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 lg:py-20 bg-[#f5f7fb]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0b1020] tracking-tight leading-[1.1]">
              Cerita di balik <span className="text-[#5B6CF9]">ATSkolla</span>.
            </h2>
            <p className="mt-5 text-[#0b1020]/70 leading-relaxed">
              Administrasi sekolah melibatkan banyak catatan: kehadiran harian, tagihan, jadwal, dan komunikasi dengan orang tua. ATSkolla menyediakan tempat untuk merapikan informasi tersebut agar lebih mudah diperiksa.
            </p>
            <p className="mt-4 text-[#0b1020]/70 leading-relaxed">
              Kepala sekolah, bendahara, guru, dan wali murid memperoleh akses sesuai tugasnya. Penggunaan tanpa biaya langganan sekolah mengikuti ketentuan penggunaan SPP Online secara aktif.
            </p>
            <p className="mt-4 text-[#0b1020]/70 leading-relaxed">
              Layanan dirancang untuk membantu berbagai jenjang pendidikan. Sekolah dapat menyesuaikan data, akun petugas, metode pembayaran, dan kegiatan sesuai kebutuhan.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-5 text-center">
                <div className="mx-auto h-10 w-10 rounded-xl bg-[#5B6CF9]/10 border border-[#5B6CF9]/25 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-[#5B6CF9]" />
                </div>
                <div className="mt-3 font-display text-2xl font-bold text-[#0b1020]">{s.value}</div>
                <div className="text-xs text-[#0b1020]/55 mt-1">{s.label}</div>
              </div>
            ))}
            <div className="col-span-3 rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#5B6CF9]/10 border border-[#5B6CF9]/25 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-[#5B6CF9]" />
                </div>
                <div>
                  <div className="font-display font-semibold text-[#0b1020]">Misi Kami</div>
                  <p className="mt-1 text-sm text-[#0b1020]/65 leading-relaxed">
                    Menghadirkan platform digital yang mudah, terjangkau, dan berdampak nyata bagi seluruh sekolah di Indonesia.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-span-3 rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#5B6CF9]/10 border border-[#5B6CF9]/25 flex items-center justify-center shrink-0">
                  <Compass className="h-5 w-5 text-[#5B6CF9]" />
                </div>
                <div>
                  <div className="font-display font-semibold text-[#0b1020]">Visi Kami</div>
                  <p className="mt-1 text-sm text-[#0b1020]/65 leading-relaxed">
                    Menjadi ekosistem digital utama sekolah Indonesia — menyatukan akademik, keuangan, dan komunikasi dalam satu platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0b1020] tracking-tight leading-[1.1]">
              Nilai yang <span className="text-[#5B6CF9]">kami pegang</span>.
            </h2>
            <p className="mt-4 text-[#0b1020]/65 leading-relaxed">
              Setiap keputusan produk dan layanan kami berpijak pada empat nilai berikut.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white border border-slate-200 p-6 hover:border-[#5B6CF9]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="h-11 w-11 rounded-xl bg-[#5B6CF9]/10 border border-[#5B6CF9]/25 flex items-center justify-center">
                  <v.icon className="h-5 w-5 text-[#5B6CF9]" />
                </div>
                <div className="mt-4 font-display font-semibold text-[#0b1020]">{v.title}</div>
                <p className="mt-1.5 text-sm text-[#0b1020]/60 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-16 lg:py-20 bg-[#f5f7fb]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0b1020] tracking-tight leading-[1.1]">
              Mulai menggunakan <span className="text-[#5B6CF9]">ATSkolla</span>.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MILESTONES.map((m) => (
              <div key={m.year} className="rounded-2xl bg-white border border-slate-200 p-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5B6CF9]/10 text-[#5B6CF9] text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {m.year}
                </div>
                <div className="mt-3 font-display font-semibold text-[#0b1020]">{m.title}</div>
                <p className="mt-1.5 text-sm text-[#0b1020]/60 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#5B6CF9] rounded-full blur-[160px] opacity-15 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-[#0b1020] tracking-tight leading-[1.05]">
            Siap bergabung bersama <span className="text-[#5B6CF9]">ratusan sekolah</span> lainnya?
          </h2>
          <p className="mt-5 text-[#0b1020]/65 max-w-xl mx-auto">
            Kenali fitur dan panduan ATSkolla, lalu siapkan penggunaannya sesuai kebutuhan sekolah.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-4 bg-[#5B6CF9] hover:bg-[#5B6CF9]/90 text-white font-semibold rounded-xl shadow-lg shadow-[#5B6CF9]/25 font-display"
            >
              Mulai Gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/kontak"
              className="inline-flex items-center gap-2 px-7 py-4 bg-transparent hover:bg-slate-100 text-[#0b1020] border border-slate-200 font-semibold rounded-xl font-display"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo src={ATSKOLLA_LOGO_URL} alt="ATSkolla" className="h-8 w-auto object-contain" />
            <span className="text-xs text-[#0b1020]/50">© {new Date().getFullYear()} ATSkolla</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#0b1020]/60">
            <a href="/artikel">Artikel & Panduan</a>
            <Link to="/" className="hover:text-[#5B6CF9]">Beranda</Link>
            <Link to="/faq" className="hover:text-[#5B6CF9]">FAQ</Link>
            <Link to="/syarat-ketentuan" className="hover:text-[#5B6CF9]">Syarat</Link>
            <Link to="/kontak" className="hover:text-[#5B6CF9]">Kontak</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
