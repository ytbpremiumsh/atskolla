import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, BookOpen, Monitor, Smartphone, Loader2 } from "lucide-react";
import atskollaLogo from "@/assets/Logo_atskolla.png";
import { fetchPanduanGuides, type PanduanGuide } from "@/lib/panduanFetch";

type ViewMode = "desktop" | "mobile";

export default function PanduanDetail() {
  const { role } = useParams<{ role: string }>();
  const [guides, setGuides] = useState<PanduanGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

  useEffect(() => {
    fetchPanduanGuides()
      .then(setGuides)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#5B6CF9]" />
      </div>
    );
  }

  const guide = guides.find((g) => g.id === role);
  if (!guide) return <Navigate to="/panduan" replace />;
  const mobileEnabled = guide.mobileMockupEnabled !== false;
  const effectiveView: ViewMode = mobileEnabled ? viewMode : "desktop";
  const Icon = guide.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/panduan" className="flex items-center gap-2.5 group">
            <ArrowLeft className="h-4 w-4 text-slate-500 group-hover:text-[#5B6CF9] transition-colors" />
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center">
              <img src={atskollaLogo} alt="ATSkolla" className="h-5 w-5 object-contain" />
            </div>
            <span className="font-bold text-slate-900 hidden sm:inline">ATSkolla</span>
            <span className="text-sm text-slate-400 hidden sm:inline">/ Panduan</span>
          </Link>
          <Link to="/admin" className="text-sm font-semibold text-[#5B6CF9] hover:text-[#4c5ded] transition-colors">Masuk →</Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${guide.color} opacity-10`} />
        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
            <div className={`h-16 w-16 rounded-3xl bg-gradient-to-br ${guide.color} flex items-center justify-center shadow-xl shrink-0`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700 mb-2">
                <BookOpen className="h-3 w-3" /> {guide.steps.length} langkah panduan
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">Panduan {guide.label}</h1>
              <p className="text-slate-600 leading-relaxed">{guide.intro}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {mobileEnabled && (
        <section className="max-w-4xl mx-auto px-4 -mt-2">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-slate-200 shadow-sm">
              <button onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${viewMode === "desktop" ? "bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white shadow" : "text-slate-500 hover:text-slate-800"}`}
                aria-pressed={viewMode === "desktop"}>
                <Monitor className="h-4 w-4" /> Desktop
              </button>
              <button onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${viewMode === "mobile" ? "bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white shadow" : "text-slate-500 hover:text-slate-800"}`}
                aria-pressed={viewMode === "mobile"}>
                <Smartphone className="h-4 w-4" /> Mobile
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
            {viewMode === "desktop" ? "Tampilan saat dibuka di laptop / komputer" : "Tampilan saat dibuka di HP Android / iOS"}
          </p>
        </section>
      )}

      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {guide.steps.map((step, idx) => (
            <motion.article key={idx} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4 }}
              className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed mb-4">{step.description}</p>

              {step.bullets && (
                <ul className="space-y-2 mb-4">
                  {step.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-[#5B6CF9] shrink-0" /> <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {step.tips && step.tips.length > 0 && (
                <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Tips</div>
                  <ul className="space-y-1.5">
                    {step.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                        <span className="text-amber-500 mt-0.5">•</span> <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.image && (
                <AnimatePresence mode="wait">
                  {effectiveView === "desktop" ? (
                    <motion.div key="desktop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                      <img src={step.image} alt={`${step.title} — Tampilan Desktop`} loading="lazy" decoding="async" className="w-full h-auto rounded-2xl" />
                    </motion.div>
                  ) : (
                    <motion.div key="mobile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                      className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white border border-slate-200 p-6 md:p-8 flex flex-col items-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700 mb-4 shadow-sm">
                        <Smartphone className="h-3 w-3 text-[#5B6CF9]" /> Tampilan Mobile (Android / iOS)
                      </div>
                      {(step.mobileImage || guide.mobileMockup) ? (
                        <img src={step.mobileImage || guide.mobileMockup} alt={`${step.title} — Tampilan Mobile`} loading="lazy" decoding="async"
                          className="w-auto max-w-[280px] md:max-w-[320px] h-auto drop-shadow-2xl" />
                      ) : (
                        <p className="text-sm text-slate-400 py-12">Mockup mobile belum diatur.</p>
                      )}
                      <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">Mockup ilustrasi tampilan menu ini di aplikasi mobile.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.article>
          ))}
        </div>

        <div className="mt-12">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Panduan Lainnya</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {guides.filter((g) => g.id !== guide.id).map((g) => {
              const GIcon = g.icon;
              return (
                <Link key={g.id} to={`/panduan/${g.id}`}
                  className="group flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#5B6CF9] hover:shadow-md transition-all">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center shrink-0`}>
                    <GIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{g.shortLabel}</div>
                    <div className="text-[11px] text-slate-500">{g.steps.length} langkah</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10 text-center bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] rounded-3xl p-8 text-white shadow-2xl">
          <h3 className="text-2xl font-bold mb-2">Siap Mencoba?</h3>
          <p className="text-white/80 mb-5">Mulai gunakan ATSkolla untuk mengelola sekolah Anda secara digital.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/admin" className="px-6 py-3 rounded-xl bg-white text-[#5B6CF9] font-bold hover:bg-slate-100 transition-colors">Masuk Aplikasi</Link>
            <Link to="/register" className="px-6 py-3 rounded-xl border border-white/30 text-white font-bold hover:bg-white/10 transition-colors">Daftar Gratis</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} ATSkolla — Platform Digital Sekolah
      </footer>
    </div>
  );
}
