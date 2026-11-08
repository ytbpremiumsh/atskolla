import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp, Upload, ArrowLeft, ImagePlus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { iconForRole, type PanduanGuide, type PanduanRow, type PanduanStep } from "@/lib/panduanFetch";

const COLOR_PRESETS = [
  "from-indigo-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-emerald-600 to-teal-700",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-cyan-600",
];

type EditorGuide = Omit<PanduanGuide, "icon"> & { dbId: string; sortOrder: number; dirty: boolean };

function rowToEditor(r: PanduanRow): EditorGuide {
  return {
    dbId: r.id,
    id: r.role_id,
    label: r.label,
    shortLabel: r.short_label,
    intro: r.intro || "",
    cover: r.cover || "",
    mobileMockup: r.mobile_mockup || "",
    mobileMockupEnabled: r.mobile_mockup_enabled !== false,
    color: r.color,
    highlights: Array.isArray(r.highlights) ? (r.highlights as string[]) : [],
    steps: Array.isArray(r.steps) ? (r.steps as PanduanStep[]) : [],
    sortOrder: r.sort_order,
    dirty: false,
  };
}

async function uploadAsset(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("panduan-assets").upload(path, file, { upsert: false });
  if (error) {
    toast.error("Upload gagal: " + error.message);
    return null;
  }
  const { data } = supabase.storage.from("panduan-assets").getPublicUrl(path);
  return data.publicUrl;
}

export default function SuperAdminPanduan() {
  const [guides, setGuides] = useState<EditorGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("panduan_content")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) {
        toast.error("Gagal memuat: " + error.message);
        return;
      }
      const list = (data as unknown as PanduanRow[]).map(rowToEditor);
      setGuides(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    } finally {
      setLoading(false);
    }
  }

  const active = guides.find((g) => g.id === activeId) || null;

  function patchActive(patch: Partial<EditorGuide>) {
    if (!active) return;
    setGuides((prev) =>
      prev.map((g) => (g.id === active.id ? { ...g, ...patch, dirty: true } : g))
    );
  }

  function patchStep(idx: number, patch: Partial<PanduanStep>) {
    if (!active) return;
    const steps = active.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    patchActive({ steps });
  }

  function addStep() {
    if (!active) return;
    patchActive({
      steps: [...active.steps, { title: "Langkah Baru", description: "", bullets: [] }],
    });
    setExpandedSteps((s) => new Set([...s, active.steps.length]));
  }

  function removeStep(idx: number) {
    if (!active) return;
    if (!confirm("Hapus langkah ini?")) return;
    patchActive({ steps: active.steps.filter((_, i) => i !== idx) });
  }

  function moveStep(idx: number, dir: -1 | 1) {
    if (!active) return;
    const target = idx + dir;
    if (target < 0 || target >= active.steps.length) return;
    const steps = [...active.steps];
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    patchActive({ steps });
  }

  async function saveActive() {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase
      .from("panduan_content")
      .update({
        label: active.label,
        short_label: active.shortLabel,
        intro: active.intro,
        cover: active.cover || null,
        mobile_mockup: active.mobileMockup || null,
        mobile_mockup_enabled: active.mobileMockupEnabled,
        color: active.color,
        highlights: active.highlights,
        steps: active.steps,
      })
      .eq("id", active.dbId);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success("Panduan tersimpan");
    setGuides((prev) => prev.map((g) => (g.id === active.id ? { ...g, dirty: false } : g)));
  }

  const Icon = active ? iconForRole(active.id) : BookOpen;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#5B6CF9]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#5B6CF9]" /> Editor Panduan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Edit teks, langkah-langkah, dan gambar mockup desktop / mobile untuk semua peran.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/panduan" target="_blank" rel="noreferrer">
            <ArrowLeft className="h-4 w-4 mr-1.5 rotate-180" /> Lihat Halaman Publik
          </a>
        </Button>
      </div>

      {/* Tabs role */}
      <div className="flex gap-2 flex-wrap">
        {guides.map((g) => {
          const GIcon = iconForRole(g.id);
          const isActive = g.id === activeId;
          return (
            <button
              key={g.id}
              onClick={() => setActiveId(g.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? `bg-gradient-to-r ${g.color} text-white shadow-lg`
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#5B6CF9]"
              }`}
            >
              <GIcon className="h-4 w-4" />
              {g.shortLabel}
              {g.dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>

      {!active ? null : (
        <>
          {/* Identitas */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${active.color} flex items-center justify-center shrink-0`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Identitas Panduan</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nama Lengkap Peran</Label>
                <Input value={active.label} onChange={(e) => patchActive({ label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Label Pendek (untuk tab)</Label>
                <Input value={active.shortLabel} onChange={(e) => patchActive({ shortLabel: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Intro / Deskripsi Singkat</Label>
              <Textarea rows={3} value={active.intro} onChange={(e) => patchActive({ intro: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Warna Tema (Tailwind gradient)</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => patchActive({ color: c })}
                    className={`h-9 px-3 rounded-lg bg-gradient-to-r ${c} text-white text-xs font-bold shadow ${
                      active.color === c ? "ring-2 ring-offset-2 ring-[#5B6CF9]" : ""
                    }`}
                  >
                    {c.replace(/from-|to-/g, "").split(" ").join(" → ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Highlights (1 baris = 1 poin, maks 4)</Label>
              <Textarea
                rows={4}
                value={active.highlights.join("\n")}
                onChange={(e) =>
                  patchActive({ highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6) })
                }
              />
            </div>
          </Card>

          {/* Cover & Mockup */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gambar Cover & Mockup Mobile</h2>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <Switch
                  checked={active.mobileMockupEnabled}
                  onCheckedChange={(v) => patchActive({ mobileMockupEnabled: v })}
                />
                Tampilkan mockup mobile di halaman publik
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <ImagePicker
                label="Gambar Cover (Desktop)"
                hint="Gambar utama yang muncul di kartu peran."
                url={active.cover}
                folder={`cover/${active.id}`}
                onChange={(url) => patchActive({ cover: url })}
              />
              <ImagePicker
                label="Mockup Mobile (Android/iOS)"
                hint="Gambar full mockup HP. Ditampilkan saat user pilih mode Mobile."
                url={active.mobileMockup}
                folder={`mobile/${active.id}`}
                onChange={(url) => patchActive({ mobileMockup: url })}
              />
            </div>
          </Card>

          {/* Steps */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Langkah Panduan ({active.steps.length})
              </h2>
              <Button size="sm" onClick={addStep} variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Tambah Langkah
              </Button>
            </div>

            <div className="space-y-3">
              {active.steps.map((step, idx) => {
                const open = expandedSteps.has(idx);
                return (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <button
                        onClick={() =>
                          setExpandedSteps((prev) => {
                            const n = new Set(prev);
                            n.has(idx) ? n.delete(idx) : n.add(idx);
                            return n;
                          })
                        }
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="h-7 w-7 rounded-lg bg-[#5B6CF9]/10 text-[#5B6CF9] flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{step.title || "(tanpa judul)"}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => moveStep(idx, 1)} disabled={idx === active.steps.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeStep(idx)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {open && (
                      <div className="p-4 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="space-y-1.5">
                          <Label>Judul Langkah</Label>
                          <Input value={step.title} onChange={(e) => patchStep(idx, { title: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Deskripsi</Label>
                          <Textarea rows={3} value={step.description} onChange={(e) => patchStep(idx, { description: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Bullets / Poin (1 baris = 1 poin)</Label>
                          <Textarea
                            rows={4}
                            value={(step.bullets || []).join("\n")}
                            onChange={(e) =>
                              patchStep(idx, {
                                bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Tips (opsional, 1 baris = 1 tip)</Label>
                          <Textarea
                            rows={3}
                            value={(step.tips || []).join("\n")}
                            onChange={(e) =>
                              patchStep(idx, {
                                tips: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <ImagePicker
                            label="Screenshot Desktop (langkah ini)"
                            hint="Tampil di mode Desktop. Kosongkan jika tidak ada."
                            url={step.image || ""}
                            folder={`step/${active.id}`}
                            onChange={(url) => patchStep(idx, { image: url })}
                            allowClear
                          />
                          <ImagePicker
                            label="Mockup Mobile (langkah ini)"
                            hint="Khusus langkah ini. Jika kosong, akan pakai mockup mobile default peran."
                            url={step.mobileImage || ""}
                            folder={`step-mobile/${active.id}`}
                            onChange={(url) => patchStep(idx, { mobileImage: url })}
                            allowClear
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Save bar */}
          <div className="sticky bottom-4 flex justify-end">
            <Button
              onClick={saveActive}
              disabled={saving || !active.dirty}
              size="lg"
              className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white shadow-2xl"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan Perubahan {active.dirty ? "•" : ""}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ImagePicker({
  label,
  hint,
  url,
  folder,
  onChange,
  allowClear,
}: {
  label: string;
  hint?: string;
  url: string;
  folder: string;
  onChange: (url: string) => void;
  allowClear?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran maksimal 5MB");
      return;
    }
    setBusy(true);
    const newUrl = await uploadAsset(file, folder);
    setBusy(false);
    if (newUrl) {
      onChange(newUrl);
      toast.success("Gambar di-unggah");
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-3 bg-slate-50/50 dark:bg-slate-800/30">
        {url ? (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden bg-white border border-slate-200 max-h-56 flex items-center justify-center">
              <img src={url} alt={label} className="max-h-56 w-auto object-contain" />
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
                <span className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-[#5B6CF9] cursor-pointer">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Ganti
                </span>
              </label>
              {allowClear && (
                <button
                  onClick={() => onChange("")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-red-500 hover:border-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              )}
            </div>
            <Input
              value={url}
              onChange={(e) => onChange(e.target.value)}
              className="text-xs"
              placeholder="atau paste URL gambar"
            />
          </div>
        ) : (
          <label className="block">
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
            <div className="flex flex-col items-center justify-center py-8 gap-2 cursor-pointer text-slate-400 hover:text-[#5B6CF9]">
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-8 w-8" />}
              <span className="text-sm font-semibold">Klik untuk unggah gambar</span>
              <span className="text-xs">Maks 5MB · JPG/PNG/WEBP</span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
