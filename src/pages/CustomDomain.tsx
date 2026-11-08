import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, Crown, CheckCircle2, Clock, AlertCircle, ExternalLink, Copy, ChevronRight, Shield, Server, Zap, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "@/lib/toast";
import { motion } from "framer-motion";
import { PaymentIframeDialog } from "@/components/PaymentIframeDialog";

const CustomDomain = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [addon, setAddon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [paymentIframe, setPaymentIframe] = useState<string | null>(null);
  const [paymentTxnId, setPaymentTxnId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("platform_settings").select("value").eq("key", "addon_custom_domain_enabled").maybeSingle().then(({ data }) => {
      if (data?.value === "false") setMenuEnabled(false);
    });
  }, []);

  useEffect(() => {
    if (!profile?.school_id) { setLoading(false); return; }
    supabase
      .from("school_addons")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("addon_type", "custom_domain")
      .maybeSingle()
      .then(({ data }) => {
        setAddon(data);
        if (data?.custom_domain) setDomainInput(data.custom_domain);
        setLoading(false);
      });
  }, [profile?.school_id]);

  const handlePurchase = async () => {
    if (!profile?.school_id) return;
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-mayar-payment", {
        body: { addon_type: "custom_domain", school_id: profile.school_id },
      });
      if (error) throw error;
      if (data?.auto_approved) {
        toast.success("Custom Domain berhasil diaktifkan!");
        window.location.reload();
      } else if (data?.payment_url) {
        toast.success("Membuka halaman pembayaran (QRIS / Transfer Bank)...");
        setPaymentTxnId(data.transaction_id || null);
        setPaymentIframe(data.payment_url);
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat pembayaran");
    } finally {
      setPurchasing(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!addon?.id || !domainInput.trim()) return;
    setSavingDomain(true);
    const { error } = await supabase
      .from("school_addons")
      .update({ custom_domain: domainInput.trim().toLowerCase(), domain_status: "pending" })
      .eq("id", addon.id);
    if (error) {
      toast.error("Gagal menyimpan domain");
    } else {
      toast.success("Domain berhasil disimpan! Silakan konfigurasikan DNS Anda.");
      setAddon({ ...addon, custom_domain: domainInput.trim().toLowerCase(), domain_status: "pending" });
    }
    setSavingDomain(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard!");
  };

  if (!menuEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center p-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Fitur Tidak Tersedia</h3>
          <p className="text-muted-foreground text-sm">Fitur Custom Domain sedang dinonaktifkan oleh administrator.</p>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Custom Domain
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gunakan domain kustom untuk dashboard absensi sekolah Anda
        </p>
      </div>

      {!addon || addon.status !== "active" ? (
        /* Purchase Card */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-xl font-bold">Add-on Custom Domain</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Tampilkan dashboard absensi dengan domain sekolah Anda sendiri. Profesional dan mudah diingat oleh orang tua & guru.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { icon: Shield, label: "SSL Gratis", desc: "HTTPS otomatis" },
                      { icon: Zap, label: "Instant Setup", desc: "Aktif dalam hitungan menit" },
                      { icon: Server, label: "Mengikuti Langganan", desc: "Masa aktif sesuai paket" },
                    ].map((f) => (
                      <div key={f.label} className="flex items-start gap-2 bg-card/50 rounded-lg p-3 border border-border/50">
                        <f.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-foreground">Rp 200.000</span>
                        <span className="text-sm text-muted-foreground">/ sekali bayar</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mengikuti masa aktif langganan Anda
                        {features.planName === "Free" && " (Free = selamanya)"}
                      </p>
                    </div>
                    <Button onClick={handlePurchase} disabled={purchasing} className="gradient-primary text-white font-semibold px-6">
                      <Crown className="h-4 w-4 mr-2" />
                      {purchasing ? "Memproses..." : "Beli Sekarang"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        /* Active Add-on Management */
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Custom Domain Aktif
                </CardTitle>
                <Badge className={statusColors[addon.domain_status] || statusColors.pending}>
                  {addon.domain_status === "active" ? "Terverifikasi" : addon.domain_status === "pending" ? "Menunggu DNS" : addon.domain_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Domain Anda</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="contoh: absensi.sekolahku.sch.id"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSaveDomain} disabled={savingDomain || !domainInput.trim()}>
                    {savingDomain ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Masukkan domain atau subdomain yang ingin Anda gunakan
                </p>
              </div>

              {addon.custom_domain && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Konfigurasi DNS
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Tambahkan record DNS berikut di panel registrar domain Anda:
                  </p>
                  <div className="space-y-2">
                    {[
                      { type: "CNAME", name: addon.custom_domain, value: "absenpintar.lovable.app" },
                      { type: "TXT", name: `_lovable.${addon.custom_domain}`, value: `lovable_verify=${profile?.school_id?.slice(0, 8)}` },
                    ].map((rec) => (
                      <div key={rec.type} className="bg-card border rounded-lg p-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">{rec.type}</Badge>
                            <span className="text-xs font-mono truncate">{rec.name}</span>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground truncate">{rec.value}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => copyToClipboard(rec.value)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addon.expires_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Berlaku hingga: {new Date(addon.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tutorial */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowTutorial(!showTutorial)}>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Tutorial Konfigurasi DNS
                <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${showTutorial ? "rotate-90" : ""}`} />
              </CardTitle>
            </CardHeader>
            {showTutorial && (
              <CardContent className="pt-0">
                <DnsTutorial domain={addon.custom_domain} />
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Always show tutorial for non-purchased users too */}
      {(!addon || addon.status !== "active") && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowTutorial(!showTutorial)}>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Cara Kerja Custom Domain
              <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${showTutorial ? "rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {showTutorial && (
            <CardContent className="pt-0">
              <DnsTutorial />
            </CardContent>
          )}
        </Card>
      )}

      <PaymentIframeDialog
        open={!!paymentIframe}
        paymentUrl={paymentIframe}
        title="Pembayaran Custom Domain — QRIS / Transfer Bank"
        checkPaid={async () => {
          if (!paymentTxnId) return false;
          const { data } = await supabase.from("payment_transactions").select("status").eq("id", paymentTxnId).maybeSingle();
          return data?.status === "paid";
        }}
        onPaid={() => { window.location.href = "/custom-domain?status=success"; }}
        onClose={() => { setPaymentIframe(null); setPaymentTxnId(null); }}
      />
    </div>
  );
};

function DnsTutorial({ domain }: { domain?: string }) {
  const steps = [
    {
      title: "1. Beli Add-on Custom Domain",
      desc: "Klik tombol \"Beli Sekarang\" dan selesaikan pembayaran via QRIS / Transfer Bank.",
      icon: Crown,
    },
    {
      title: "2. Masukkan Domain Anda",
      desc: "Masukkan domain atau subdomain yang ingin digunakan (contoh: absensi.sekolahku.sch.id).",
      icon: Globe,
    },
    {
      title: "3. Login ke Panel Registrar Domain",
      desc: "Buka dashboard registrar domain Anda (Niagahoster, Hostinger, Cloudflare, Rumahweb, dll).",
      icon: ExternalLink,
    },
    {
      title: "4. Tambahkan Record CNAME",
      desc: `Buat record CNAME yang mengarahkan ${domain || "subdomain Anda"} ke absenpintar.lovable.app`,
      icon: Server,
    },
    {
      title: "5. Tambahkan Record TXT (Verifikasi)",
      desc: "Tambahkan record TXT untuk verifikasi kepemilikan domain.",
      icon: Shield,
    },
    {
      title: "6. Tunggu Propagasi DNS",
      desc: "Proses propagasi DNS membutuhkan waktu 5 menit hingga 48 jam. Setelah aktif, domain Anda akan langsung terhubung.",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <step.icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">{step.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
          </div>
        </div>
      ))}

      <Separator />

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Contoh Konfigurasi DNS di Berbagai Provider
        </h4>
        <div className="space-y-3 text-xs text-amber-700 dark:text-amber-300">
          <div>
            <p className="font-semibold">Niagahoster / Hostinger:</p>
            <p>Kelola Domain → Zone DNS → Tambah Record → Pilih CNAME → Isi Host & Target</p>
          </div>
          <div>
            <p className="font-semibold">Cloudflare:</p>
            <p>DNS → Records → Add Record → Tipe: CNAME, Name: subdomain, Target: absenpintar.lovable.app → Proxy Status: DNS Only</p>
          </div>
          <div>
            <p className="font-semibold">Rumahweb / IDWebHost:</p>
            <p>Domain → DNS Management → Tambah Record CNAME baru</p>
          </div>
          <div>
            <p className="font-semibold">Google Domains / Namecheap:</p>
            <p>DNS Settings → Custom Records → Add CNAME Record</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-1">Tips</h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Gunakan subdomain seperti <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">absensi.sekolahku.sch.id</code> agar tidak mengganggu website utama</li>
          <li>Jika menggunakan Cloudflare, pastikan Proxy Status diatur ke <strong>DNS Only</strong> (ikon awan abu-abu)</li>
          <li>Hubungi admin jika domain tidak terverifikasi setelah 48 jam</li>
        </ul>
      </div>
    </div>
  );
}

export default CustomDomain;
