import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { School, CheckCircle2, Webhook, Copy, Check, Key, Eye, EyeOff, Loader2, AlertTriangle, Pencil, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SchoolRow {
  id: string;
  name: string;
  created_at?: string;
}

const SuperAdminSubscriptions = () => {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase
      .from("schools")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    setSchools((data as SchoolRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const [webhookCopied, setWebhookCopied] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mayar-webhook`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    toast.success("URL Webhook disalin!");
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  // Mayar API Key management
  const [apiKeyDialog, setApiKeyDialog] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);

  const fetchApiKeyStatus = async () => {
    setLoadingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-mayar-key', {
        body: { action: 'get' },
      });
      if (!error && data) {
        setHasKey(data.has_key);
        setMaskedKey(data.masked_key || '');
      }
    } catch {}
    setLoadingKey(false);
  };

  useEffect(() => { fetchApiKeyStatus(); }, []);

  const handleSaveApiKey = async () => {
    if (!newApiKey.trim()) { toast.error("API Key tidak boleh kosong"); return; }
    setSavingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-mayar-key', {
        body: { action: 'set', api_key: newApiKey.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("API Key Mayar berhasil diperbarui!");
      setNewApiKey("");
      setApiKeyDialog(false);
      fetchApiKeyStatus();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + (err.message || "Unknown error"));
    } finally {
      setSavingKey(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Langganan Sekolah</h1>
        <p className="text-muted-foreground text-sm">Semua sekolah kini mendapat akses yang sama — seluruh fitur terbuka.</p>
      </div>

      {/* Unified access banner */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="gradient-primary p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-primary-foreground">Akses Penuh Untuk Semua Sekolah</h2>
                <Badge className="bg-white/20 text-primary-foreground border-0 text-[10px] gap-1">
                  <InfinityIcon className="h-3 w-3" /> Tanpa Batas
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-primary-foreground/85 mt-0.5">
                Sistem langganan dinonaktifkan. Setiap sekolah — baru maupun lama — otomatis menggunakan seluruh fitur premium tanpa batas waktu.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Webhook Info */}
      <Card className="border-0 shadow-card bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">Mayar Webhook URL</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tetap dipasang untuk auto-accept pembayaran add-on & pembelian lain.</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-[11px] bg-background/80 px-3 py-1.5 rounded-lg border text-foreground truncate flex-1">
                  {webhookUrl}
                </code>
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={copyWebhook}>
                  {webhookCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mayar API Key */}
      <Card className="border-0 shadow-card bg-gradient-to-r from-accent/30 to-accent/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Key className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">API Key Mayar</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Kelola API Key untuk integrasi pembayaran Mayar</p>
              <div className="flex items-center gap-2 mt-2">
                {loadingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : hasKey ? (
                  <code className="text-[11px] bg-background/80 px-3 py-1.5 rounded-lg border text-foreground">{maskedKey}</code>
                ) : (
                  <span className="text-[11px] text-destructive font-medium inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Belum dikonfigurasi</span>
                )}
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => { setNewApiKey(""); setShowKey(false); setApiKeyDialog(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Ubah
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schools list — uniform access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Daftar Sekolah ({schools.length})</h2>
        </div>

        {schools.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Belum ada sekolah terdaftar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schools.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                        <School className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{s.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className="text-[10px] bg-success/10 text-success border-success/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Akses Penuh
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <InfinityIcon className="h-3 w-3" /> Semua Fitur Terbuka
                          </Badge>
                        </div>
                        {s.created_at && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Terdaftar: {new Date(s.created_at).toLocaleDateString("id-ID")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialog} onOpenChange={setApiKeyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah API Key Mayar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>API Key Baru</Label>
              <div className="relative mt-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="Masukkan API Key Mayar..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              API Key bisa didapatkan dari dashboard Mayar di bagian Settings &gt; API Keys. Key yang baru akan langsung digunakan untuk pembayaran selanjutnya.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyDialog(false)}>Batal</Button>
            <Button onClick={handleSaveApiKey} disabled={savingKey} className="gradient-primary text-primary-foreground">
              {savingKey ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
              {savingKey ? "Menyimpan..." : "Simpan Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSubscriptions;
