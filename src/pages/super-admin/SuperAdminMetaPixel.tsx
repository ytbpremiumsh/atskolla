import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Activity, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

const KEYS = [
  "meta_pixel_enabled",
  "meta_pixel_id",
  "meta_capi_access_token",
  "meta_test_event_code",
] as const;

export default function SuperAdminMetaPixel() {
  const [enabled, setEnabled] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [token, setToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", KEYS as unknown as string[])
      .then(({ data }) => {
        const m = Object.fromEntries((data || []).map((d) => [d.key, d.value]));
        setEnabled(m.meta_pixel_enabled === "1");
        setPixelId(m.meta_pixel_id || "");
        setToken(m.meta_capi_access_token || "");
        setTestCode(m.meta_test_event_code || "");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (enabled && !pixelId.trim()) {
      toast.error("Pixel ID wajib diisi untuk mengaktifkan");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const rows = [
      { key: "meta_pixel_enabled", value: enabled ? "1" : "0", updated_at: now },
      { key: "meta_pixel_id", value: pixelId.trim(), updated_at: now },
      { key: "meta_capi_access_token", value: token.trim(), updated_at: now },
      { key: "meta_test_event_code", value: testCode.trim(), updated_at: now },
    ];
    const { error } = await supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else toast.success("Konfigurasi Meta Pixel disimpan. Muat ulang landing page untuk efek.");
    setSaving(false);
  };

  const handleTestCAPI = async () => {
    if (!pixelId || !token) {
      toast.error("Lengkapi Pixel ID & Access Token, lalu Simpan dulu");
      return;
    }
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: "PageView",
        event_source_url: window.location.origin,
        test_event_code: testCode || undefined,
      },
    });
    if (error) setTestResult({ ok: false, msg: error.message });
    else if (data?.success) setTestResult({ ok: true, msg: `Event terkirim. fbtrace_id: ${data.fbtrace_id || "-"}` });
    else setTestResult({ ok: false, msg: data?.error || "Gagal" });
    setTesting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Meta Pixel & Conversions API
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Hubungkan Meta Pixel dan Conversions API Gateway untuk melacak konversi iklan Facebook & Instagram pada landing page.
        </p>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/40">
            <div>
              <p className="font-semibold text-sm">Aktifkan Meta Pixel</p>
              <p className="text-xs text-muted-foreground">Inject script Pixel di seluruh halaman publik (Landing, Login, Register).</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Pixel ID</Label>
            <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="contoh: 1234567890123456" />
            <p className="text-[11px] text-muted-foreground">Ditemukan di Events Manager → Pengaturan Set Data → ID Set Data.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Conversions API — Access Token</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAB... (token permanen dari Meta)"
            />
            <p className="text-[11px] text-muted-foreground">
              Disimpan untuk pengiriman event server-side. Buat di Events Manager → Pengaturan → Conversions API → Generate Access Token.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Test Event Code (opsional)</Label>
            <Input value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="contoh: TEST12345" />
            <p className="text-[11px] text-muted-foreground">Isi saat verifikasi di Events Manager → Test Events. Kosongkan untuk produksi.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan
            </Button>
            <Button onClick={handleTestCAPI} disabled={testing} variant="outline">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
              Tes Kirim Event (CAPI)
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noreferrer">
                Buka Events Manager <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${testResult.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"}`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{testResult.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card bg-muted/30">
        <CardContent className="p-4 sm:p-6 space-y-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-sm">Cara cek koneksi:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Simpan Pixel ID & Access Token di atas, lalu aktifkan toggle.</li>
            <li>Buka landing page di tab baru — event <b>PageView</b> otomatis terkirim (browser-side).</li>
            <li>Klik <b>Tes Kirim Event (CAPI)</b> untuk verifikasi server-side via Conversions API.</li>
            <li>Cek di Meta Events Manager → tab <b>Test Events</b> (gunakan Test Event Code) atau <b>Overview</b> (real).</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
