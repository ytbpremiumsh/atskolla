import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_POPUP,
  POPUP_SETTING_KEY,
  parsePopupConfig,
  type LandingPopupConfig,
} from "@/components/LandingPopup";

export default function SuperAdminPopup() {
  const [cfg, setCfg] = useState<LandingPopupConfig>(DEFAULT_POPUP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", POPUP_SETTING_KEY)
      .maybeSingle()
      .then(({ data }) => {
        setCfg(parsePopupConfig(data?.value));
        setLoading(false);
      });
  }, []);

  const set = <K extends keyof LandingPopupConfig>(k: K, v: LandingPopupConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `popup/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("landing-assets").upload(path, file);
    if (error) {
      setUploading(false);
      toast.error("Gagal upload gambar: " + error.message);
      return;
    }
    const { data } = supabase.storage.from("landing-assets").getPublicUrl(path);
    set("image_url", data.publicUrl);
    setUploading(false);
    toast.success("Gambar terunggah");
  };

  const save = async (bumpVersion: boolean) => {
    setSaving(true);
    const next = { ...cfg, version: bumpVersion ? (cfg.version || 1) + 1 : cfg.version || 1 };
    const { error } = await supabase.from("platform_settings").upsert(
      { key: POPUP_SETTING_KEY, value: JSON.stringify(next), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan: " + error.message);
    setCfg(next);
    toast.success(bumpVersion ? "Tersimpan & popup ditampilkan ulang ke semua pengunjung" : "Tersimpan");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Popup Informasi Halaman Utama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label>Aktifkan Popup</Label>
              <p className="text-[11px] text-muted-foreground">Muncul otomatis saat pengunjung membuka halaman utama.</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>

          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input value={cfg.title} onChange={(e) => set("title", e.target.value)} placeholder="Promo Tahun Ajaran Baru" />
          </div>

          <div className="space-y-1.5">
            <Label>Isi Teks</Label>
            <Textarea rows={4} value={cfg.body} onChange={(e) => set("body", e.target.value)} placeholder="Tulis informasi yang ingin ditampilkan…" />
          </div>

          <div className="space-y-1.5">
            <Label>Gambar (opsional)</Label>
            <div className="flex items-center gap-2">
              <Input value={cfg.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://… atau upload" />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              {cfg.image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("image_url", "")}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label Tombol</Label>
              <Input value={cfg.button_label} onChange={(e) => set("button_label", e.target.value)} placeholder="Daftar Sekarang" />
            </div>
            <div className="space-y-1.5">
              <Label>URL Tombol</Label>
              <Input value={cfg.button_url} onChange={(e) => set("button_url", e.target.value)} placeholder="/register atau https://…" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Jeda Tampil (detik)</Label>
              <Input
                type="number"
                min={0}
                value={cfg.delay_seconds}
                onChange={(e) => set("delay_seconds", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label>Tampil Sekali</Label>
                <p className="text-[11px] text-muted-foreground">Per pengunjung, per versi.</p>
              </div>
              <Switch checked={cfg.show_once} onCheckedChange={(v) => set("show_once", v)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => save(false)} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan
            </Button>
            <Button variant="outline" onClick={() => save(true)} disabled={saving}>
              Simpan & Tampilkan Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card h-fit">
        <CardHeader>
          <CardTitle className="text-base">Pratinjau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            {cfg.image_url && <img src={cfg.image_url} alt="Pratinjau popup" className="max-h-52 w-full object-cover" />}
            <div className="space-y-3 p-5">
              <h3 className="text-base font-bold">{cfg.title || "Judul popup"}</h3>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{cfg.body || "Isi teks popup akan tampil di sini."}</p>
              {cfg.button_label && (
                <Button className="w-full gradient-primary text-primary-foreground" type="button">{cfg.button_label}</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
