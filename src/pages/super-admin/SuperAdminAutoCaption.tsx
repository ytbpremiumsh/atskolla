import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import {
  Sparkles, Loader2, Copy, Facebook, Instagram, Twitter, MessageCircle, Linkedin,
  Music2, FileText, Wand2, Bold, Italic, Underline, Strikethrough, RefreshCw,
  Type, ListOrdered, Quote, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const SAMPLE_FB = `🚀 Sekolah Anda masih repot dengan absensi manual? Saatnya naik level dengan ATSkolla — sistem absensi sekolah cerdas berbasis AI & QR Code.

Dengan ATSkolla, setiap siswa bisa absen hanya dengan scan QR atau Face Recognition. Begitu anak tiba di sekolah, orang tua langsung menerima notifikasi WhatsApp otomatis. Saat pulang? Mereka juga tahu tepat waktu. Tidak ada lagi kekhawatiran "anak saya sudah sampai sekolah belum?" 🙌

✨ Yang bikin ATSkolla beda:
✓ Absensi via QR Code, Face Recognition (AI), atau Manual
✓ Notifikasi WhatsApp real-time ke orang tua
✓ Dashboard khusus Wali Kelas
✓ Laporan kehadiran PDF & Excel siap cetak
✓ Pembayaran SPP online otomatis
✓ Multi-role: Admin, Bendahara, Guru, Wali Kelas
✓ Bisa pakai domain sendiri (sekolahmu.id)

Cocok untuk SD, SMP, SMA, SMK, MA & Pesantren — dari sekolah kecil sampai yayasan besar.

🎁 Coba GRATIS 7 hari Premium tanpa kartu kredit! Buktikan sendiri kemudahannya.

👉 Daftar sekarang: https://www.atskolla.com
💬 Konsultasi gratis: wa.me/6281234567890

#ATSkolla #AbsensiSekolah #SekolahDigital #PendidikanIndonesia #EdTech`;

const platforms = [
  { v: "facebook", label: "Facebook", icon: Facebook },
  { v: "instagram", label: "Instagram", icon: Instagram },
  { v: "tiktok", label: "TikTok", icon: Music2 },
  { v: "twitter", label: "Twitter / X", icon: Twitter },
  { v: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { v: "linkedin", label: "LinkedIn", icon: Linkedin },
  { v: "blog", label: "Blog / Artikel", icon: FileText },
];

const tones = [
  { v: "profesional", label: "Profesional" },
  { v: "santai", label: "Santai" },
  { v: "persuasif", label: "Persuasif (Hard-sell)" },
  { v: "edukatif", label: "Edukatif" },
  { v: "promo", label: "Promo / Diskon" },
  { v: "storytelling", label: "Storytelling" },
];

const TOPIC_PRESETS = [
  "Perkenalan ATSkolla untuk sekolah yang masih pakai absen manual",
  "Keunggulan absensi via Face Recognition untuk SMA/SMK",
  "Manfaat notifikasi WhatsApp otomatis untuk orang tua",
  "Promo Trial Premium 7 hari gratis",
];

const REWRITE_STYLES = [
  { v: "improve", label: "Tingkatkan Kualitas" },
  { v: "mimic", label: "Tiru Gaya Contoh (Style Mimic)" },
  { v: "shorter", label: "Lebih Singkat" },
  { v: "longer", label: "Lebih Panjang" },
  { v: "professional", label: "Lebih Profesional" },
  { v: "casual", label: "Lebih Santai" },
  { v: "persuasive", label: "Lebih Persuasif" },
  { v: "engaging", label: "Lebih Engaging" },
  { v: "fix_grammar", label: "Perbaiki Tata Bahasa" },
  { v: "seo", label: "Optimasi SEO" },
  { v: "translate_en", label: "Terjemahkan ke Inggris" },
  { v: "translate_id", label: "Terjemahkan ke Indonesia" },
  { v: "custom", label: "Custom (instruksi sendiri)" },
];

const CONTENT_TYPES = [
  { v: "caption_sosmed", label: "Caption Media Sosial", desc: "Hook + body + CTA singkat (FB/IG)" },
  { v: "deskripsi_produk", label: "Deskripsi Produk", desc: "Untuk landing page / marketplace" },
  { v: "iklan_fb", label: "Iklan Facebook Ads", desc: "Format AIDA untuk iklan berbayar" },
  { v: "iklan_google", label: "Iklan Google Ads", desc: "3 headline + 2 deskripsi pendek" },
  { v: "headline", label: "Headline / Judul Iklan", desc: "5-10 alternatif headline kuat" },
  { v: "artikel_blog", label: "Artikel Blog SEO", desc: "Artikel panjang dengan H1, H2, kesimpulan" },
  { v: "artikel_press", label: "Press Release / Siaran Pers", desc: "Format jurnalistik formal" },
  { v: "email_marketing", label: "Email Marketing", desc: "Subject + body + CTA tombol" },
  { v: "whatsapp_broadcast", label: "WhatsApp Broadcast", desc: "Pesan WA personal & ringkas" },
  { v: "script_video", label: "Script Video Pendek", desc: "Reels/TikTok 30-60 detik scene-by-scene" },
  { v: "testimoni", label: "Testimoni / Review", desc: "Cerita storytelling dari user" },
  { v: "faq", label: "FAQ Produk", desc: "5-7 Q&A yang sering ditanya" },
  { v: "thread_twitter", label: "Thread Twitter/X", desc: "5-8 tweet bernomor" },
];

// ===== Unicode text styling helpers (works on FB / IG / WA) =====
const boldMap = (c: string) => {
  const code = c.codePointAt(0)!;
  if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + code - 65);
  if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + code - 97);
  if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + code - 48);
  return c;
};
const italicMap = (c: string) => {
  const code = c.codePointAt(0)!;
  if (code === 104) return "\u210e"; // h italic
  if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d434 + code - 65);
  if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d44e + code - 97);
  return c;
};
const boldItalicMap = (c: string) => {
  const code = c.codePointAt(0)!;
  if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d468 + code - 65);
  if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d482 + code - 97);
  return c;
};
const transform = (text: string, fn: (c: string) => string) =>
  Array.from(text).map(fn).join("");
const underlineText = (text: string) => Array.from(text).map(c => c + "\u0332").join("");
const strikeText = (text: string) => Array.from(text).map(c => c + "\u0336").join("");

type FormatType = "bold" | "italic" | "bolditalic" | "underline" | "strike" | "bullet" | "number" | "quote" | "uppercase" | "arrow";

export default function SuperAdminAutoCaption() {
  const [tab, setTab] = useState<"generate" | "rewrite">("generate");

  // Generate state
  const [platform, setPlatform] = useState("facebook");
  const [contentType, setContentType] = useState("caption_sosmed");
  const [tone, setTone] = useState("persuasif");
  const [length, setLength] = useState("sedang");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Kepala sekolah & yayasan SMA/SMK di Indonesia");
  const [cta, setCta] = useState("Daftar gratis di www.atskolla.com");
  const [variants, setVariants] = useState(2);
  const [emoji, setEmoji] = useState(true);
  const [hashtags, setHashtags] = useState(true);

  // Rewrite state
  const [sourceText, setSourceText] = useState("");
  const [rewriteStyle, setRewriteStyle] = useState("improve");
  const [customInstruction, setCustomInstruction] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [rewriteVariants, setRewriteVariants] = useState(1);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([SAMPLE_FB]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const generate = async () => {
    if (!topic.trim()) return toast.error("Isi topik konten dulu");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-caption", {
        body: { mode: "generate", platform, content_type: contentType, tone, length, topic, audience, cta, variants, emoji, hashtags },
      });
      if (error || !data?.success) {
        toast.error("Gagal: " + (data?.error || error?.message || "unknown"));
        return;
      }
      setResults(data.variants);
      toast.success(`${data.variants.length} varian berhasil dibuat`);
    } catch (e: any) {
      toast.error("Gagal: " + (e?.message || "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const rewrite = async () => {
    if (rewriteStyle === "mimic") {
      if (!referenceText.trim()) return toast.error("Tempel teks referensi (contoh dari orang lain) dulu");
    } else {
      if (!sourceText.trim()) return toast.error("Isi teks yang ingin direwrite");
    }
    if (rewriteStyle === "custom" && !customInstruction.trim())
      return toast.error("Isi instruksi custom-nya");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-caption", {
        body: {
          mode: "rewrite",
          source_text: sourceText,
          rewrite_style: rewriteStyle,
          custom_instruction: customInstruction,
          reference_text: referenceText,
          variants: rewriteVariants,
          platform,
        },
      });
      if (error || !data?.success) {
        toast.error("Gagal: " + (data?.error || error?.message || "unknown"));
        return;
      }
      setResults(data.variants);
      toast.success(`Rewrite selesai (${data.variants.length} versi)`);
    } catch (e: any) {
      toast.error("Gagal: " + (e?.message || "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard — siap di-paste ke FB/IG/WA");
  };

  // Apply formatting to selected text in textarea
  const applyFormat = (idx: number, type: FormatType) => {
    const ta = textareaRefs.current[idx];
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const original = results[idx];
    if (start === end) {
      toast.error("Pilih (highlight) teks dulu, lalu klik tombol format");
      return;
    }
    const selected = original.slice(start, end);
    let formatted = selected;
    switch (type) {
      case "bold": formatted = transform(selected, boldMap); break;
      case "italic": formatted = transform(selected, italicMap); break;
      case "bolditalic": formatted = transform(selected, boldItalicMap); break;
      case "underline": formatted = underlineText(selected); break;
      case "strike": formatted = strikeText(selected); break;
      case "uppercase": formatted = selected.toUpperCase(); break;
      case "bullet":
        formatted = selected.split("\n").map(l => l.trim() ? "• " + l : l).join("\n");
        break;
      case "number":
        formatted = selected.split("\n").map((l, i) => l.trim() ? `${i + 1}. ${l}` : l).join("\n");
        break;
      case "quote":
        formatted = selected.split("\n").map(l => l.trim() ? "> " + l : l).join("\n");
        break;
      case "arrow":
        formatted = selected.split("\n").map(l => l.trim() ? "👉 " + l : l).join("\n");
        break;
    }
    const newText = original.slice(0, start) + formatted + original.slice(end);
    const next = [...results];
    next[idx] = newText;
    setResults(next);
    // restore focus & selection
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, start + formatted.length);
    });
  };

  const updateText = (idx: number, val: string) => {
    const next = [...results];
    next[idx] = val;
    setResults(next);
  };

  const sendToRewrite = (text: string) => {
    setSourceText(text);
    setTab("rewrite");
    toast.info("Teks dipindahkan ke tab Rewrite");
  };

  const PlatformIcon = platforms.find(p => p.v === platform)?.icon || Facebook;

  const FormatToolbar = ({ idx }: { idx: number }) => (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-muted/40 border-b border-border/60">
      <span className="text-[10px] font-bold text-muted-foreground mr-1">FORMAT:</span>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Bold (Tebal)" onClick={() => applyFormat(idx, "bold")}>
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Italic (Miring)" onClick={() => applyFormat(idx, "italic")}>
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-1.5 text-[11px] font-bold italic" title="Bold Italic" onClick={() => applyFormat(idx, "bolditalic")}>
        BI
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Underline (Garis bawah)" onClick={() => applyFormat(idx, "underline")}>
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Strikethrough (Coret)" onClick={() => applyFormat(idx, "strike")}>
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="UPPERCASE" onClick={() => applyFormat(idx, "uppercase")}>
        <Type className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-border mx-1" />
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Bullet list" onClick={() => applyFormat(idx, "bullet")}>
        <span className="text-sm leading-none">•</span>
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Numbered list" onClick={() => applyFormat(idx, "number")}>
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Quote" onClick={() => applyFormat(idx, "quote")}>
        <Quote className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Arrow CTA" onClick={() => applyFormat(idx, "arrow")}>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => sendToRewrite(results[idx])}>
          <RefreshCw className="h-3 w-3 mr-1" /> Rewrite
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => copy(results[idx])}>
          <Copy className="h-3 w-3 mr-1" /> Salin
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Wand2}
        title="Auto Caption AI"
        subtitle="Generate konten ATSkolla, rewrite teks, dan format Bold/Italic/Underline siap paste ke Facebook/IG/WA."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Pengaturan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="generate"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate</TabsTrigger>
                <TabsTrigger value="rewrite"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Rewrite</TabsTrigger>
              </TabsList>

              {/* GENERATE */}
              <TabsContent value="generate" className="space-y-3 mt-4">
                <div>
                  <Label className="text-xs">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {platforms.map(p => (
                        <SelectItem key={p.v} value={p.v}>
                          <span className="flex items-center gap-2"><p.icon className="h-3.5 w-3.5" /> {p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Jenis Konten / Tujuan</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      {CONTENT_TYPES.map(c => (
                        <SelectItem key={c.v} value={c.v}>
                          <div className="flex flex-col py-0.5">
                            <span className="font-medium">{c.label}</span>
                            <span className="text-[10px] text-muted-foreground">{c.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Topik Konten</Label>
                  <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="Misal: Perkenalan fitur Pengenalan wajah AI" />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TOPIC_PRESETS.map((t) => (
                      <button key={t} onClick={() => setTopic(t)} className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition border">
                        {t.length > 36 ? t.slice(0, 36) + "…" : t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{tones.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Panjang</Label>
                    <Select value={length} onValueChange={setLength}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendek">Pendek</SelectItem>
                        <SelectItem value="sedang">Sedang</SelectItem>
                        <SelectItem value="panjang">Panjang</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Target Audiens</Label>
                  <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">CTA</Label>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label className="text-xs">Varian</Label>
                    <Input type="number" min={1} max={5} value={variants} onChange={(e) => setVariants(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch checked={emoji} onCheckedChange={setEmoji} id="emoji" />
                    <Label htmlFor="emoji" className="text-xs">Emoji</Label>
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch checked={hashtags} onCheckedChange={setHashtags} id="ht" />
                    <Label htmlFor="ht" className="text-xs">Hashtag</Label>
                  </div>
                </div>
                <Button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-primary to-indigo-600 text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate Caption
                </Button>
              </TabsContent>

              {/* REWRITE */}
              <TabsContent value="rewrite" className="space-y-3 mt-4">
                <div>
                  <Label className="text-xs">Gaya Rewrite</Label>
                  <Select value={rewriteStyle} onValueChange={setRewriteStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWRITE_STYLES.map(s => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {rewriteStyle === "mimic" ? (
                  <>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                      <p className="text-[11px] text-foreground/80 leading-relaxed">
                        <b>Mode Tiru Gaya:</b> Tempel contoh teks dari iklan/postingan orang lain. AI akan menulis ulang dengan <b>struktur, gaya, & nada yang sama persis</b>, tapi isinya tentang ATSkolla.
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Teks Referensi (contoh dari orang lain)</Label>
                      <Textarea
                        value={referenceText}
                        onChange={(e) => setReferenceText(e.target.value)}
                        rows={8}
                        placeholder="Tempel iklan / caption / artikel orang lain yang ingin ditiru gayanya..."
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {referenceText.length} karakter • {referenceText.split(/\s+/).filter(Boolean).length} kata
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Topik / Poin tentang ATSkolla (opsional)</Label>
                      <Textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        rows={3}
                        placeholder="Misal: highlight Pengenalan wajah & notifikasi WA. Kosongkan untuk auto."
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label className="text-xs">Teks yang ingin di-rewrite</Label>
                    <Textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      rows={8}
                      placeholder="Tempel teks lama di sini..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{sourceText.length} karakter • {sourceText.split(/\s+/).filter(Boolean).length} kata</p>
                  </div>
                )}

                {rewriteStyle === "custom" && (
                  <div>
                    <Label className="text-xs">Instruksi Custom</Label>
                    <Textarea
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      rows={2}
                      placeholder="Misal: ubah jadi puisi pendek bertema sekolah modern"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Jumlah Versi</Label>
                  <Input type="number" min={1} max={5} value={rewriteVariants} onChange={(e) => setRewriteVariants(parseInt(e.target.value) || 1)} />
                </div>
                <Button onClick={rewrite} disabled={loading} className="w-full bg-gradient-to-r from-primary to-indigo-600 text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {rewriteStyle === "mimic" ? "Tiru Gaya & Tulis Ulang" : "Rewrite Sekarang"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PlatformIcon className="h-4 w-4 text-primary" />
              Hasil ({results.length})
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Pilih teks untuk format Bold/Italic/dll • Bisa diedit langsung
            </span>
          </div>

          {results.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
              Belum ada hasil. Pilih tab <b>Generate</b> atau <b>Rewrite</b> di kiri.
            </CardContent></Card>
          )}

          {results.map((text, i) => (
            <Card key={i} className="overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0">
                <span className="text-xs font-bold text-primary">VARIAN {i + 1}</span>
                <span className="text-[10px] text-muted-foreground">{text.length} karakter • {text.split(/\s+/).filter(Boolean).length} kata</span>
              </CardHeader>
              <FormatToolbar idx={i} />
              <CardContent className="p-0">
                <Textarea
                  ref={(el) => (textareaRefs.current[i] = el)}
                  value={text}
                  onChange={(e) => updateText(i, e.target.value)}
                  onFocus={() => setEditingIdx(i)}
                  rows={Math.min(20, Math.max(6, text.split("\n").length + 1))}
                  className="border-0 rounded-none resize-y font-sans text-[13px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </CardContent>
            </Card>
          ))}

          {results.length > 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-3 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Tips Format:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li><b>Bold/Italic</b> menggunakan unicode — langsung tampil tebal/miring saat di-paste ke Facebook, Instagram, WhatsApp, Twitter, LinkedIn.</li>
                  <li>Highlight teks dulu → klik tombol format (B / I / U / dll).</li>
                  <li>Tombol <b>Rewrite</b> di toolbar mengirim teks ke tab Rewrite untuk diolah ulang.</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
