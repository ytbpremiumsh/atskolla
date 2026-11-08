import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Upload, X, Globe, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

/* ── Landing Theme Selector ── */
function LandingThemeSelector() {
  const [theme, setTheme] = useState("classic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("platform_settings").select("value").eq("key", "landing_theme").maybeSingle().then(({ data }) => {
      if (data?.value) setTheme(data.value);
    });
  }, []);

  const handleSave = async (selected: string) => {
    setTheme(selected);
    setSaving(true);
    const { error } = await supabase.from("platform_settings").upsert(
      { key: "landing_theme", value: selected, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) toast.error("Gagal menyimpan tema");
    else toast.success(`Tema landing page diubah ke "${selected === "modern" ? "Modern SaaS" : "Classic"}". Refresh landing page untuk melihat perubahan.`);
    setSaving(false);
  };

  const themes = [
    { id: "classic", name: "Classic", desc: "Tampilan original dengan typing effect, gradient hero, dan layout terpusat.", preview: "bg-gradient-to-b from-slate-50 to-white" },
    { id: "modern", name: "Modern SaaS", desc: "Tampilan profesional dengan hero biru curved, mockup floating, dan promo bar.", preview: "bg-gradient-to-br from-indigo-600 to-blue-800" },
  ];

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-foreground text-sm">Tema Landing Page</h3>
        </div>
        <p className="text-xs text-muted-foreground">Pilih tampilan halaman utama. Perubahan langsung berlaku setelah disimpan.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSave(t.id)}
              disabled={saving}
              className={`relative text-left rounded-xl border-2 p-4 transition-all hover:shadow-md ${theme === t.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-muted hover:border-primary/30"}`}
            >
              <div className={`h-20 rounded-lg mb-3 ${t.preview} flex items-center justify-center`}>
                {t.id === "classic" ? (
                  <div className="text-center">
                    <div className="h-2 w-16 bg-slate-300 rounded mx-auto mb-1" />
                    <div className="h-1.5 w-12 bg-slate-200 rounded mx-auto" />
                    <div className="h-8 w-20 bg-slate-100 rounded mt-2 mx-auto border border-slate-200" />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="h-2 w-16 bg-white/40 rounded mx-auto mb-1" />
                    <div className="h-1.5 w-12 bg-white/25 rounded mx-auto" />
                    <div className="flex gap-1 mt-2 justify-center">
                      <div className="h-6 w-8 bg-white/20 rounded" />
                      <div className="h-8 w-10 bg-white/30 rounded" />
                    </div>
                  </div>
                )}
              </div>
              <p className="font-bold text-sm text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              {theme === t.id && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Branding Settings (Favicon + Header Logo) ── */
function BrandingSettings() {
  const [faviconUrl, setFaviconUrl] = useState("");
  const [headerLogoUrl, setHeaderLogoUrl] = useState("");
  const [loginLogoUrl, setLoginLogoUrl] = useState("");
  const [loginImage, setLoginImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["favicon_url", "header_logo_url", "login_logo_url", "login_sidebar_image"])
      .then(({ data }) => {
        if (data) {
          const m = Object.fromEntries(data.map((d) => [d.key, d.value]));
          setFaviconUrl(m.favicon_url || "");
          setHeaderLogoUrl(m.header_logo_url || "");
          setLoginLogoUrl(m.login_logo_url || "");
          setLoginImage(m.login_sidebar_image || "");
        }
      });
  }, []);

  const handleUpload = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Maksimal 5MB"); return; }
    setUploading(key);
    const ext = file.name.split(".").pop();
    const path = `branding/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("landing-assets").upload(path, file);
    if (error) { toast.error("Gagal unggah"); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("landing-assets").getPublicUrl(path);
    const url = urlData.publicUrl;
    if (key === "favicon_url") setFaviconUrl(url);
    else if (key === "header_logo_url") setHeaderLogoUrl(url);
    else if (key === "login_logo_url") setLoginLogoUrl(url);
    else if (key === "login_sidebar_image") setLoginImage(url);
    setUploading(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const rows = [
      { key: "favicon_url", value: faviconUrl, updated_at: new Date().toISOString() },
      { key: "header_logo_url", value: headerLogoUrl, updated_at: new Date().toISOString() },
      { key: "login_logo_url", value: loginLogoUrl, updated_at: new Date().toISOString() },
      { key: "login_sidebar_image", value: loginImage, updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else {
      toast.success("Branding berhasil disimpan! Muat ulang halaman untuk melihat perubahan.");
      // Update favicon immediately
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      if (faviconUrl) link.href = faviconUrl;
    }
    setSaving(false);
  };

  const renderUploadField = (label: string, key: string, value: string, setter: (v: string) => void) => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      {value && (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-16 rounded-lg object-contain bg-muted p-1" />
          <button onClick={() => setter("")} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={(e) => setter(e.target.value)} placeholder="URL gambar atau unggah" className="text-xs" />
        <input type="file" accept="image/*" id={`branding-${key}`} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); }} />
        <Button type="button" variant="outline" size="sm" disabled={uploading === key} onClick={() => document.getElementById(`branding-${key}`)?.click()}>
          {uploading === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-foreground text-sm">Branding & Logo Website</h3>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Simpan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Kelola favicon (icon tab browser), logo header halaman utama, dan logo halaman login.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {renderUploadField("Favicon (Icon Tab Browser)", "favicon_url", faviconUrl, setFaviconUrl)}
          {renderUploadField("Logo Header Landing Page", "header_logo_url", headerLogoUrl, setHeaderLogoUrl)}
          {renderUploadField("Logo Halaman Login", "login_logo_url", loginLogoUrl, setLoginLogoUrl)}
          {renderUploadField("Gambar Sidebar Login", "login_sidebar_image", loginImage, setLoginImage)}
        </div>
      </CardContent>
    </Card>
  );
}


interface ContentItem {
  id: string;
  key: string;
  value: string;
  type: string;
}

const LABELS: Record<string, string> = {
  hero_title: "Judul Hero",
  hero_subtitle: "Deskripsi Hero",
  hero_image: "Gambar Hero",
  hero_caption: "Caption di bawah Gambar Hero",
  cta_text: "Teks Tombol CTA",
  hero_stat_1_value: "Statistik 1 - Angka (cth: 500+)",
  hero_stat_1_label: "Statistik 1 - Label (cth: Sekolah Aktif)",
  hero_stat_2_value: "Statistik 2 - Angka (cth: 120K+)",
  hero_stat_2_label: "Statistik 2 - Label (cth: Siswa Terdaftar)",
  hero_stat_3_value: "Statistik 3 - Angka (cth: 99.9%)",
  hero_stat_3_label: "Statistik 3 - Label (cth: Data Akurat)",
  hero_stat_4_value: "Statistik 4 - Angka (cth: 34)",
  hero_stat_4_label: "Statistik 4 - Label (cth: Provinsi)",
  feature_1_title: "Fitur 1 - Judul",
  feature_1_desc: "Fitur 1 - Deskripsi",
  feature_1_icon: "Fitur 1 - Ikon (scan/monitor/message/chart)",
  feature_2_title: "Fitur 2 - Judul",
  feature_2_desc: "Fitur 2 - Deskripsi",
  feature_2_icon: "Fitur 2 - Ikon",
  feature_3_title: "Fitur 3 - Judul",
  feature_3_desc: "Fitur 3 - Deskripsi",
  feature_3_icon: "Fitur 3 - Ikon",
  feature_4_title: "Fitur 4 - Judul",
  feature_4_desc: "Fitur 4 - Deskripsi",
  feature_4_icon: "Fitur 4 - Ikon",
  feature_5_title: "Fitur 5 - Judul",
  feature_5_desc: "Fitur 5 - Deskripsi",
  feature_5_icon: "Fitur 5 - Ikon",
  feature_6_title: "Fitur 6 - Judul",
  feature_6_desc: "Fitur 6 - Deskripsi",
  feature_6_icon: "Fitur 6 - Ikon",
  why_label: "Label Seksi Kenapa Kami (teks kecil di atas judul)",
  why_title: "Judul Seksi Kenapa Kami",
  why_desc: "Deskripsi Seksi Kenapa Kami",
  why_image: "Gambar Lampiran Seksi Kenapa Kami",
  why_item_1_title: "Kenapa 1 - Judul",
  why_item_1_desc: "Kenapa 1 - Deskripsi",
  why_item_2_title: "Kenapa 2 - Judul",
  why_item_2_desc: "Kenapa 2 - Deskripsi",
  why_item_3_title: "Kenapa 3 - Judul",
  why_item_3_desc: "Kenapa 3 - Deskripsi",
  why_item_4_title: "Kenapa 4 - Judul",
  why_item_4_desc: "Kenapa 4 - Deskripsi",
  trusted_title: "Judul Seksi Dipercaya Sekolah",
  trusted_subtitle: "Deskripsi Seksi Dipercaya Sekolah",
  cta_banner_text: "Teks Banner CTA",
  cta_banner_desc: "Deskripsi Banner CTA",
  footer_logo: "Logo Footer",
  footer_brand_name: "Nama Brand Footer (cth: ATSkolla)",
  footer_brand_tagline: "Tagline Brand (cth: Absensi Digital Sekolah)",
  footer_description: "Deskripsi Singkat Footer",
  footer_address: "Alamat",
  footer_email: "Email",
  footer_phone: "Telepon",
  footer_link_faq: "Link FAQ (URL)",
  footer_link_docs: "Link Dokumentasi (URL)",
  footer_link_privacy: "Link Kebijakan Privasi (URL)",
  footer_link_terms: "Link Syarat & Ketentuan (URL)",
  footer_social_text: "Teks Sosial Media",
  show_pricing: "Tampilkan Section Harga di Landing Page (pindah ke Manajemen Paket)",
};

const SECTIONS = [
  { title: "Hero Section", keys: ["hero_title", "hero_subtitle", "hero_image", "hero_caption", "cta_text"] },
  { title: "Statistik Hero Banner", keys: ["hero_stat_1_value", "hero_stat_1_label", "hero_stat_2_value", "hero_stat_2_label", "hero_stat_3_value", "hero_stat_3_label", "hero_stat_4_value", "hero_stat_4_label"] },
  { title: "Fitur 1", keys: ["feature_1_title", "feature_1_desc", "feature_1_icon"] },
  { title: "Fitur 2", keys: ["feature_2_title", "feature_2_desc", "feature_2_icon"] },
  { title: "Fitur 3", keys: ["feature_3_title", "feature_3_desc", "feature_3_icon"] },
  { title: "Fitur 4", keys: ["feature_4_title", "feature_4_desc", "feature_4_icon"] },
  { title: "Fitur 5", keys: ["feature_5_title", "feature_5_desc", "feature_5_icon"] },
  { title: "Fitur 6", keys: ["feature_6_title", "feature_6_desc", "feature_6_icon"] },
  { title: "Platform Terpercaya (Kenapa Kami)", keys: ["why_label", "why_title", "why_desc", "why_image", "why_item_1_title", "why_item_1_desc", "why_item_2_title", "why_item_2_desc", "why_item_3_title", "why_item_3_desc", "why_item_4_title", "why_item_4_desc"] },
  { title: "Dipercaya Sekolah", keys: ["trusted_title", "trusted_subtitle"] },
  { title: "Banner CTA", keys: ["cta_banner_text", "cta_banner_desc"] },
  { title: "Footer — Identitas", keys: ["footer_logo", "footer_brand_name", "footer_brand_tagline", "footer_description"] },
  { title: "Footer — Kontak", keys: ["footer_address", "footer_email", "footer_phone", "footer_social_text"] },
  { title: "Footer — Halaman & Link", keys: ["footer_link_faq", "footer_link_docs", "footer_link_privacy", "footer_link_terms"] },
];


const SuperAdminLanding = () => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchContent = async () => {
    const { data } = await supabase.from("landing_content").select("*").order("created_at");
    setItems((data as ContentItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContent(); }, []);

  const getValue = (key: string) => {
    if (key in edited) return edited[key];
    return items.find((i) => i.key === key)?.value || "";
  };

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }
    setUploading(key);
    const ext = file.name.split(".").pop();
    const path = `${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("landing-assets").upload(path, file);
    if (error) {
      toast.error("Gagal mengunggah gambar");
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("landing-assets").getPublicUrl(path);
    handleChange(key, urlData.publicUrl);
    setUploading(null);
  };

  const handleSave = async () => {
    const keys = Object.keys(edited);
    if (keys.length === 0) {
      toast.info("Tidak ada perubahan");
      return;
    }
    setSaving(true);
    const rows = keys.map((key) => {
      const existing = items.find((i) => i.key === key);
      return {
        key,
        value: edited[key],
        type: existing?.type || (key.includes("image") || key.includes("logo") ? "image" : "text"),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase
      .from("landing_content")
      .upsert(rows, { onConflict: "key" });
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Landing page berhasil diperbarui!");
      setEdited({});
      fetchContent();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <BrandingSettings />
      <LandingThemeSelector />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Landing Page</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Kelola konten halaman utama</p>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(edited).length === 0} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="border-0 shadow-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h3 className="font-bold text-foreground text-sm">{section.title}</h3>
            {section.keys.map((key) => {
              const item = items.find((i) => i.key === key);
              const isImage = item?.type === "image" || key.includes("image") || key.includes("logo");
              const label = LABELS[key] || key;
              const val = getValue(key);

              if (isImage) {
                return (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs">{label}</Label>
                    {val && (
                      <div className="relative inline-block">
                        <img src={val} alt={label} className="h-24 rounded-lg object-cover" />
                        <button
                          onClick={() => handleChange(key, "")}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id={`file-${key}`}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(key, f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading === key}
                        onClick={() => document.getElementById(`file-${key}`)?.click()}
                      >
                        {uploading === key ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}

                        Unggah Gambar
                      </Button>
                    </div>
                  </div>
                );
              }

              const isLong = key.includes("subtitle") || key.includes("desc") || key.includes("address");
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  {isLong ? (
                    <Textarea
                      value={val}
                      onChange={(e) => handleChange(key, e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <Input
                      value={val}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SuperAdminLanding;
