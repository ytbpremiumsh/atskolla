import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Split, Search, Landmark, AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Bank = {
  id: string;
  school_id: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  doku_bank_account_settlement_id: string | null;
  verification_status: string | null;
  rejection_reason: string | null;
};
type School = { id: string; name: string; doku_settlement_bank_id: string | null };

const ID_PATTERN = /^[A-Z]{3}-[0-9]{3,5}-[0-9]{6,20}$/;

const pickBank = (list: Bank[]) =>
  list.find((b) => b.is_active && b.is_default) || list.find((b) => b.is_active) || list[0] || null;

const SuperAdminSplitSettlement = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [banks, setBanks] = useState<Record<string, Bank[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [sRes, bRes] = await Promise.all([
      supabase.from("schools").select("id,name,doku_settlement_bank_id").order("name"),
      supabase
        .from("bendahara_bank_accounts")
        .select("id,school_id,bank_name,account_number,account_holder,is_default,is_active,doku_bank_account_settlement_id,verification_status,rejection_reason"),
    ]);
    if (sRes.error) toast.error("Gagal memuat sekolah: " + sRes.error.message);
    const list = (sRes.data || []) as School[];
    const byS: Record<string, Bank[]> = {};
    for (const b of (bRes.data || []) as Bank[]) (byS[b.school_id] ||= []).push(b);
    setSchools(list);
    setBanks(byS);
    setDraft(
      Object.fromEntries(
        list.map((s) => [s.id, s.doku_settlement_bank_id || pickBank(byS[s.id] || [])?.doku_bank_account_settlement_id || ""]),
      ),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? schools.filter((r) => r.name.toLowerCase().includes(s)) : schools;
    // Sekolah yang sudah punya rekening bendahara tampil lebih dulu.
    return [...base].sort((a, b) => Number(!!banks[b.id]?.length) - Number(!!banks[a.id]?.length));
  }, [schools, banks, q]);

  const pendingBanks = Object.values(banks).flat().filter((b) => b.is_active !== false && b.verification_status === "pending");

  const setVerification = async (b: Bank, status: "verified" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = window.prompt("Alasan penolakan rekening:", "Data rekening tidak sesuai");
      if (reason === null) return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("bendahara_bank_accounts").update({
      verification_status: status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      verified_by: u.user?.id ?? null,
      rejection_reason: reason,
    }).eq("id", b.id);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success(status === "verified" ? "Rekening terverifikasi, bendahara sudah bisa mencairkan" : "Rekening ditolak");
    await load();
  };

  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name || "-";

  const activeCount = schools.filter((s) => !!s.doku_settlement_bank_id).length;
  const withBankCount = schools.filter((s) => !!banks[s.id]?.length).length;

  const save = async (s: School) => {
    const value = (draft[s.id] || "").trim().toUpperCase();
    if (value && !ID_PATTERN.test(value)) {
      toast.error("Format Bank Settlement ID tidak valid. Contoh: BNK-0308-1793845037429");
      return;
    }
    const bank = pickBank(banks[s.id] || []);
    setSavingId(s.id);
    const { error } = await supabase.from("schools").update({ doku_settlement_bank_id: value || null }).eq("id", s.id);
    if (!error && bank) {
      // Sinkronkan juga ke rekening pencairan bendahara agar keduanya cocok.
      await supabase
        .from("bendahara_bank_accounts")
        .update({ doku_bank_account_settlement_id: value || null, doku_synced_at: new Date().toISOString() })
        .eq("id", bank.id);
    }
    setSavingId(null);
    if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
    toast.success(value ? `Split aktif untuk ${s.name}` : `Split dimatikan untuk ${s.name}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Split className="h-6 w-6 text-primary" /> Split Settlement DOKU
        </h1>
        <p className="text-muted-foreground text-sm">
          Nominal SPP murni langsung dikirim DOKU ke rekening sekolah. Biaya admin otomatis masuk ke rekening utama
          (default) akun DOKU, yaitu rekening owner ATSkolla.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Sekolah dengan split aktif</p>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Sekolah dengan rekening bendahara</p>
          <p className="text-2xl font-bold text-foreground">{withBankCount}</p>
        </CardContent></Card>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Pengajuan Rekening Menunggu Verifikasi</h2>
            <Badge variant={pendingBanks.length ? "default" : "secondary"}>{pendingBanks.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Setiap rekening baru dari bendahara masuk ke sini dan dikirim notifikasi (lonceng + WhatsApp admin). Rekening baru bisa dipakai untuk pencairan setelah Anda verifikasi.
          </p>
          {pendingBanks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Tidak ada pengajuan baru.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingBanks.map((b) => (
                <div key={b.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{schoolName(b.school_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{b.bank_name || "-"}</span>{" "}
                      <span className="font-mono">{b.account_number || "-"}</span> a.n. {b.account_holder || "-"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setVerification(b, "verified")}><CheckCircle2 className="h-4 w-4 mr-1" /> Verifikasi</Button>
                    <Button size="sm" variant="outline" onClick={() => setVerification(b, "rejected")}><XCircle className="h-4 w-4 mr-1" /> Tolak</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 space-y-4">
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>1. Lihat rekening pencairan yang sudah diinput bendahara di bawah nama sekolah.</p>
            <p>2. Daftarkan rekening yang sama persis di DOKU: Settings → Bank Account, tunggu status Verified.</p>
            <p>3. Salin Bank Settlement ID dari DOKU (contoh: BNK-0308-1793845037429), tempel, lalu simpan. ID otomatis tersinkron ke rekening bendahara.</p>
            <p>4. Pastikan rekening owner (Mandiri) dijadikan rekening utama/default di DOKU.</p>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari sekolah..." className="pl-9" />
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((s) => {
                const bank = pickBank(banks[s.id] || []);
                const saved = s.doku_settlement_bank_id || "";
                const dirty = (draft[s.id] || "") !== saved;
                const synced = !!saved && bank?.doku_bank_account_settlement_id === saved;
                return (
                  <div key={s.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        {saved ? (
                          <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Split aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Belum diatur</Badge>
                        )}
                      </div>
                      {bank ? (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Landmark className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">{bank.bank_name || "-"}</span>{" "}
                            <span className="font-mono">{bank.account_number || "-"}</span> a.n. {bank.account_holder || "-"}
                            {!bank.is_active && " (nonaktif)"}
                            {bank.verification_status === "verified" ? " — terverifikasi" : bank.verification_status === "rejected" ? " — ditolak" : " — menunggu verifikasi"}
                            {saved && (synced ? " — tersinkron" : " — belum tersinkron, klik simpan")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" /> Bendahara belum menginput rekening pencairan
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={draft[s.id] || ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                        placeholder="BNK-xxxx-xxxxxxxxxxxxx"
                        className="font-mono text-xs md:w-64"
                      />
                      <Button size="sm" onClick={() => save(s)} disabled={(!dirty && synced) || savingId === s.id}>
                        {savingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada sekolah</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminSplitSettlement;
