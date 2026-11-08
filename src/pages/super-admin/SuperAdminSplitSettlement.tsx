import { BankBookAttachment } from "@/components/bank/BankBookAttachment";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Split, Search, Landmark, AlertTriangle, CheckCircle2, ShieldCheck, XCircle, Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

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
  bank_branch: string | null;
  bank_book_path: string | null;
};
type Reg = { id: string; bank_name: string; account_number: string; account_holder: string | null; settlement_id: string | null };
type School = { id: string; name: string; doku_settlement_bank_id: string | null };

const ID_PATTERN = /^[A-Z]{3}-[0-9]{3,5}-[0-9]{6,20}$/;

const pickBank = (list: Bank[]) =>
  list.find((b) => b.is_active && b.is_default) || list.find((b) => b.is_active) || list[0] || null;

const Step = ({ n, icon: Icon, title, desc, count, tone, children }: any) => (
    <Card className="border-0 shadow-card overflow-hidden">
      <div className={`h-1 ${tone}`} />
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Langkah {n}</span>
              {count !== undefined && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
            </div>
            <h2 className="font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );


const SuperAdminSplitSettlement = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [banks, setBanks] = useState<Record<string, Bank[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const verificationBusy = useRef(false);
  const [verifyTarget, setVerifyTarget] = useState<Bank | null>(null);
  const [verifySettlementId, setVerifySettlementId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [regs, setRegs] = useState<Reg[]>([]);
  const [editingRegistry, setEditingRegistry] = useState<Reg | null>(null);
  const [registrySettlementId, setRegistrySettlementId] = useState("");
  const [registrySaving, setRegistrySaving] = useState(false);
  const registrySaveBusy = useRef(false);
  const editRegistry = (account: Reg) => { setEditingRegistry(account);setRegistrySettlementId(account.settlement_id || ""); };
  const saveRegistry = async () => {
    if (!editingRegistry || registrySaveBusy.current) return;
    const value = registrySettlementId.trim().toUpperCase();
    if (!value || !ID_PATTERN.test(value)) { toast.error("Masukkan Settlement ID resmi dari penyedia pembayaran dengan format BNK-..."); return; }
    registrySaveBusy.current = true;setRegistrySaving(true);
    try {
      let update = supabase.from("doku_registered_accounts").update({ settlement_id: value }).eq("id", editingRegistry.id);
      update = editingRegistry.settlement_id === null ? update.is("settlement_id", null) : update.eq("settlement_id", editingRegistry.settlement_id);
      const { error } = await update.select("id").single();
      if (error) throw error;
      const edited = editingRegistry;
      setEditingRegistry(null);
      const refreshed = await load();
      setDraft(previous => {
        const next = { ...previous };
        for (const school of refreshed.schoolRows) {
          const bank = pickBank(refreshed.bankRows[school.id] || []);
          if (bank && (bank.bank_name || "").replace(/\s/g, "").toUpperCase() === edited.bank_name.replace(/\s/g, "").toUpperCase()
            && (bank.account_number || "").replace(/\D/g, "") === edited.account_number.replace(/\D/g, "")) next[school.id] = value;
        }
        return next;
      });
      toast.success("Settlement ID tersimpan. Periksa dan klik Simpan pada Langkah 3 untuk menerapkannya ke sekolah.");
    } catch (error) {
      const issue = error as { message?: string; code?: string };
      toast.error(issue?.code === "PGRST116" ? "Data rekening sudah berubah. Tutup formulir, muat ulang, lalu coba lagi." : "Gagal menyimpan Settlement ID: " + (issue?.message || "Coba lagi."));
    } finally { registrySaveBusy.current = false;setRegistrySaving(false); }
  };
  const [reg, setReg] = useState({ bank_name: "", account_number: "", account_holder: "", settlement_id: "" });

  const loadRegs = async () => {
    const { data, error } = await supabase.from("doku_registered_accounts").select("id,bank_name,account_number,account_holder,settlement_id").order("created_at", { ascending: false });
    if (error) { toast.error("Gagal memuat daftar rekening: " + error.message); return; }
    setRegs((data || []) as Reg[]);
  };

  const addReg = async () => {
    if (!reg.bank_name.trim() || !reg.account_number.trim()) { toast.error("Nama bank dan nomor rekening wajib"); return; }
    const sid = reg.settlement_id.trim().toUpperCase();
    if (sid && !ID_PATTERN.test(sid)) { toast.error("Format Bank Settlement ID tidak valid"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("doku_registered_accounts").insert({
      bank_name: reg.bank_name.trim(), account_number: reg.account_number.replace(/\D/g, ""),
      account_holder: reg.account_holder.trim() || null, settlement_id: sid || null, created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message.includes("duplicate") ? "Nomor rekening sudah ada di daftar" : error.message); return; }
    toast.success("Ditambahkan. Pengajuan sekolah yang cocok otomatis terverifikasi.");
    setReg({ bank_name: "", account_number: "", account_holder: "", settlement_id: "" });
    await load();
  };

  const delReg = async (id: string) => {
    if (!confirm("Hapus dari registri rekening ATSkolla?")) return;
    const { error } = await supabase.from("doku_registered_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadRegs();
  };

  const load = async () => {
    setLoading(true);
    const [sRes, bRes, rRes] = await Promise.all([
      supabase.from("schools").select("id,name,doku_settlement_bank_id").order("name"),
      supabase
        .from("bendahara_bank_accounts")
        .select("id,school_id,bank_name,account_number,account_holder,is_default,is_active,doku_bank_account_settlement_id,verification_status,rejection_reason,bank_branch,bank_book_path"),
      supabase.from("doku_registered_accounts").select("id,bank_name,account_number,account_holder,settlement_id").order("created_at", { ascending: false }),
    ]);
    if (sRes.error) toast.error("Gagal memuat sekolah: " + sRes.error.message);
    if (bRes.error) toast.error("Gagal memuat rekening: " + bRes.error.message);
    if (rRes.error) toast.error("Gagal memuat daftar rekening: " + rRes.error.message);
    const registry = (rRes.data || []) as Reg[];
    setRegs(registry);
    const registryId = (bank: Bank | null) => bank ? registry.find(r => r.bank_name.replace(/\s/g, "").toUpperCase() === (bank.bank_name || "").replace(/\s/g, "").toUpperCase() && r.account_number.replace(/\D/g, "") === (bank.account_number || "").replace(/\D/g, ""))?.settlement_id || "" : "";
    const list = (sRes.data || []) as School[];
    const byS: Record<string, Bank[]> = {};
    for (const b of (bRes.data || []) as Bank[]) (byS[b.school_id] ||= []).push(b);
    setSchools(list);
    setBanks(byS);
    setDraft(
      Object.fromEntries(
        list.map((s) => [s.id, s.doku_settlement_bank_id || pickBank(byS[s.id] || [])?.doku_bank_account_settlement_id || registryId(pickBank(byS[s.id] || [])) || ""]),
      ),
    );
    setLoading(false);
    return { schoolRows: list, bankRows: byS };
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? schools.filter((r) => r.name.toLowerCase().includes(s)) : schools;
    // Sekolah yang sudah punya rekening bendahara tampil lebih dulu.
    return [...base].sort((a, b) => Number(!!banks[b.id]?.length) - Number(!!banks[a.id]?.length));
  }, [schools, banks, q]);

  const pendingBanks = Object.values(banks).flat().filter((b) => b.is_active !== false && b.verification_status === "pending");

  const setVerification = async (b: Bank, status: "verified" | "rejected", settlementId?: string) => {
    if (verificationBusy.current) return;
    let reason: string | null = null;
    if (status === "rejected") {
      reason = window.prompt("Alasan penolakan rekening:", "Data rekening tidak sesuai");
      if (reason === null) return;
      if (!reason.trim()) { toast.error("Isi alasan penolakan rekening"); return; }
    }
    verificationBusy.current = true;setVerifyingId(b.id);
    try {
      if (status === "verified") {
        const sid = (settlementId || "").trim().toUpperCase();
        if (!ID_PATTERN.test(sid)) throw new Error("Settlement ID wajib diisi dengan format BNK-...");
        const { error } = await supabase.rpc("verify_and_register_bank_account", { p_account_id: b.id });
        if (error) throw error;
        // Isi otomatis Settlement ID pada Registri Rekening ATSkolla untuk rekening yang sama
        const { data: regRows, error: regErr } = await supabase.from("doku_registered_accounts").select("id,bank_name,account_number");
        if (regErr) throw regErr;
        const norm = (v: string | null | undefined) => (v || "").replace(/\D/g, "");
        const bankKey = (v: string | null | undefined) => (v || "").replace(/\s/g, "").toUpperCase();
        const match = (regRows || []).find((r: any) => norm(r.account_number) === norm(b.account_number) && bankKey(r.bank_name) === bankKey(b.bank_name))
          || (regRows || []).find((r: any) => norm(r.account_number) === norm(b.account_number));
        if (match) {
          const { error: upErr } = await supabase.from("doku_registered_accounts").update({ settlement_id: sid }).eq("id", match.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from("doku_registered_accounts").insert({
            bank_name: (b.bank_name || "").trim(), account_number: norm(b.account_number), account_holder: b.account_holder || null, settlement_id: sid,
          } as any);
          if (insErr) throw insErr;
        }
        setDraft(prev => ({ ...prev, [b.school_id]: sid }));
        setVerifyTarget(null);
        toast.success("Rekening terverifikasi dan Settlement ID otomatis tersimpan di Registri Rekening ATSkolla.");
      } else {
        const { data: u, error: authError } = await supabase.auth.getUser();
        if (authError || !u.user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
        const { error } = await supabase.from("bendahara_bank_accounts").update({
          verification_status: "rejected", verified_at: null, verified_by: u.user.id,
          rejection_reason: reason?.trim() || null,
        }).eq("id", b.id).eq("verification_status", "pending").select("id").single();
        if (error) throw error;
        toast.success("Rekening ditolak");
      }
      await load();
    } catch (error) {
      toast.error("Gagal memproses rekening: " + ((error as {message?: string})?.message || "Silakan coba lagi."));
    } finally { verificationBusy.current = false;setVerifyingId(null); }
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
    if (value && (!bank || bank.is_active === false)) {
      toast.error("Sekolah ini belum punya rekening pencairan aktif");
      return;
    }
    if (value && bank?.verification_status !== "verified") {
      toast.error("Verifikasi dulu rekening sekolah ini sebelum mengaktifkan split");
      return;
    }
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

  const stats = [
    { label: "Split aktif", value: activeCount, sub: "sekolah", cls: "bg-emerald-500/10 text-emerald-600" , icon: CheckCircle2 },
    { label: "Menunggu verifikasi", value: pendingBanks.length, sub: "rekening", cls: "bg-amber-500/10 text-amber-600", icon: ShieldCheck },
    { label: "Registri Rekening ATSkolla", value: regs.length, sub: "rekening", cls: "bg-primary/10 text-primary", icon: Landmark },
    { label: "Punya rekening", value: withBankCount, sub: "sekolah", cls: "bg-sky-500/10 text-sky-600", icon: Split },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Cara kerja: </span>
        nominal SPP dikirim otomatis ke rekening sekolah, biaya admin masuk ke rekening utama ATSkolla di penyedia pembayaran.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((st) => (
          <Card key={st.label} className="border-0 shadow-card"><CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${st.cls}`}><st.icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{st.label}</p>
              <p className="text-xl font-bold text-foreground leading-tight">{st.value} <span className="text-[11px] font-normal text-muted-foreground">{st.sub}</span></p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Step n={1} icon={ShieldCheck} title="Verifikasi Pengajuan Rekening" count={pendingBanks.length}
        tone={pendingBanks.length ? "bg-amber-500" : "bg-muted"}
        desc="Periksa rekening dan lampirannya. Klik Verifikasi, lalu masukkan Settlement ID (BNK-...) dari penyedia pembayaran. ID akan otomatis tersimpan di Registri Rekening ATSkolla.">
        {pendingBanks.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Tidak ada pengajuan baru.</div>
        ) : (
          <div className="space-y-2">
            {pendingBanks.map((b) => (
              <div key={b.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{schoolName(b.school_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{b.bank_name || "-"}</span>{" "}
                    <span className="font-mono">{b.account_number || "-"}</span> a.n. {b.account_holder || "-"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Cabang: <span className="font-medium text-foreground">{b.bank_branch || "Belum diisi (rekening lama)"}</span></p>
                  <BankBookAttachment path={b.bank_book_path} bank={b.bank_name} holder={b.account_holder} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={verifyingId !== null} onClick={() => { setVerifyTarget(b); setVerifySettlementId(""); }}>{verifyingId === b.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} {verifyingId === b.id ? "Memproses…" : "Verifikasi"}</Button>
                  <Button size="sm" variant="outline" disabled={verifyingId !== null} onClick={() => setVerification(b, "rejected")}><XCircle className="h-4 w-4 mr-1" /> Tolak</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Step>

      <Step n={2} icon={Landmark} title="Rekening Registri Rekening ATSkolla" count={regs.length} tone="bg-primary"
        desc="Rekening yang disetujui masuk ke registri internal ATSkolla. Isi ID resmi dari penyedia pembayaran setelah rekening terdaftar pada penyedia.">
        <p className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">Daftar ini tersimpan di ATSkolla. Penambahan ke daftar tidak mendaftarkan rekening ke layanan penyedia pembayaran dan tidak otomatis mengaktifkan Split Settlement. Settlement ID tetap menggunakan ID resmi dari penyedia pembayaran.</p>
        <div className="rounded-xl bg-muted/40 p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1.2fr_auto] gap-2">
          <Input placeholder="Nama bank (mis. BSI)" value={reg.bank_name} onChange={(e) => setReg({ ...reg, bank_name: e.target.value })} />
          <Input placeholder="Nomor rekening" inputMode="numeric" value={reg.account_number} onChange={(e) => setReg({ ...reg, account_number: e.target.value })} />
          <Input placeholder="Atas nama" value={reg.account_holder} onChange={(e) => setReg({ ...reg, account_holder: e.target.value })} />
          <Input placeholder="Settlement ID (BNK-...)" className="font-mono text-xs" value={reg.settlement_id} onChange={(e) => setReg({ ...reg, settlement_id: e.target.value })} />
          <Button onClick={addReg}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </div>
        {regs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {regs.map((r) => (
              <div key={r.id} className="rounded-xl border p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Landmark className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.bank_name} <span className="font-mono font-normal">{r.account_number}</span></p>
                  <p className="text-xs text-muted-foreground truncate">a.n. {r.account_holder || "-"}</p>
                  {r.settlement_id ? <p className="text-[11px] font-mono text-muted-foreground">{r.settlement_id}</p> : <p className="text-[11px] text-amber-700 dark:text-amber-400">Settlement ID penyedia pembayaran belum diisi</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => editRegistry(r)} disabled={registrySaving} className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Edit</Button>
                  <Button size="icon" variant="ghost" aria-label={`Hapus rekening ${r.bank_name}`} disabled={registrySaving} className="text-muted-foreground hover:text-destructive" onClick={() => delReg(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Step>

      <Dialog open={!!verifyTarget} onOpenChange={open => { if (!open && !verificationBusy.current) setVerifyTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Verifikasi Rekening</DialogTitle><DialogDescription>Masukkan Settlement ID (BNK-...) dari penyedia pembayaran untuk rekening ini. ID akan otomatis tersimpan di Registri Rekening ATSkolla.</DialogDescription></DialogHeader>
          <div className="space-y-1 rounded-xl border bg-muted/40 p-3 text-sm">
            <p className="font-semibold">{verifyTarget ? schoolName(verifyTarget.school_id) : ""}</p>
            <p><span className="font-medium">{verifyTarget?.bank_name}</span> <span className="font-mono">{verifyTarget?.account_number}</span></p>
            <p className="text-muted-foreground">a.n. {verifyTarget?.account_holder || "-"}</p>
          </div>
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (verifyTarget) setVerification(verifyTarget, "verified", verifySettlementId); }}>
            <div className="space-y-2">
              <Label htmlFor="verify-settlement-id">Settlement ID <span className="text-destructive">*</span></Label>
              <Input id="verify-settlement-id" autoFocus autoComplete="off" placeholder="BNK-xxxx-xxxxxxxxxxxxx" value={verifySettlementId} disabled={verifyingId !== null} onChange={e => setVerifySettlementId(e.target.value)} className="font-mono" />
              {verifySettlementId.trim() && !ID_PATTERN.test(verifySettlementId.trim().toUpperCase()) && (
                <p className="text-xs text-destructive">Format tidak valid. Contoh: BNK-0308-1793845037429</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={verifyingId !== null} onClick={() => setVerifyTarget(null)}>Batal</Button>
              <Button type="submit" disabled={verifyingId !== null || !ID_PATTERN.test(verifySettlementId.trim().toUpperCase())}>
                {verifyingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Verifikasi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRegistry} onOpenChange={open => { if (!open && !registrySaveBusy.current) setEditingRegistry(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Settlement ID penyedia pembayaran</DialogTitle><DialogDescription>Isi ID resmi dari dashboard penyedia pembayaran untuk rekening berikut.</DialogDescription></DialogHeader>
          <div className="space-y-1 rounded-xl border bg-muted/40 p-3 text-sm"><p className="font-semibold">{editingRegistry?.bank_name} <span className="font-mono">{editingRegistry?.account_number}</span></p><p className="text-muted-foreground">a.n. {editingRegistry?.account_holder || "-"}</p></div>
          <form className="space-y-4" onSubmit={event => { event.preventDefault();saveRegistry(); }}>
            <div className="space-y-2"><Label htmlFor="registry-settlement-id">Settlement ID</Label><Input id="registry-settlement-id" autoFocus autoComplete="off" placeholder="BNK-xxxx-xxxxxxxxxxxxx" value={registrySettlementId} disabled={registrySaving} onChange={event => setRegistrySettlementId(event.target.value)} className="font-mono" /><p className="text-xs text-muted-foreground">ID ini tidak dibuat oleh tombol Verifikasi. Salin ID milik rekening yang sama dari penyedia pembayaran.</p></div>
            <p className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">Setelah tersimpan, ID tersedia di Langkah 3. Untuk mengaktifkan atau mengganti Split Settlement sekolah, periksa nilainya lalu klik Simpan di Langkah 3.</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={registrySaving} onClick={() => setEditingRegistry(null)}>Batal</Button><Button type="submit" disabled={registrySaving || !registrySettlementId.trim()}>{registrySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan ID</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Step n={3} icon={Split} title="Aktifkan Split per Sekolah" tone="bg-emerald-500"
        desc="Tempel Settlement ID (BNK-...) dari penyedia pembayaran untuk rekening sekolah, lalu simpan. Rekening harus sudah terverifikasi.">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari sekolah..." className="pl-9" />
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const bank = pickBank(banks[s.id] || []);
              const saved = s.doku_settlement_bank_id || "";
              const dirty = (draft[s.id] || "") !== saved;
              const synced = !!saved && bank?.doku_bank_account_settlement_id === saved;
              const vs = bank?.verification_status;
              return (
                <div key={s.id} className="rounded-xl border p-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      {saved
                        ? <Badge className="bg-emerald-500 hover:bg-emerald-500 gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" /> Split aktif</Badge>
                        : <Badge variant="secondary" className="text-[10px]">Belum diatur</Badge>}
                      {saved && !synced && <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px]">Klik simpan untuk sinkron</Badge>}
                    </div>
                    {bank ? (
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <Landmark className="h-3.5 w-3.5 shrink-0" />
                        <span><span className="font-medium text-foreground">{bank.bank_name || "-"}</span> <span className="font-mono">{bank.account_number || "-"}</span> a.n. {bank.account_holder || "-"}</span>
                        {!bank.is_active && <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>}
                        <Badge variant="outline" className={`text-[10px] ${vs === "verified" ? "border-emerald-500 text-emerald-600" : vs === "rejected" ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600"}`}>
                          {vs === "verified" ? "Terverifikasi" : vs === "rejected" ? "Ditolak" : "Menunggu verifikasi"}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Bendahara belum menginput rekening
                      </div>
                    )}
                    {bank && <div className="space-y-1"><p className="text-xs text-muted-foreground">Cabang: {bank.bank_branch || "Belum diisi (rekening lama)"}</p><BankBookAttachment path={bank.bank_book_path} bank={bank.bank_name} holder={bank.account_holder} /></div>}
                    {(banks[s.id] || []).filter(b => b.id !== bank?.id && b.is_active !== false).map(b => <details key={b.id} className="rounded-lg border p-2 text-xs"><summary className="cursor-pointer font-medium">Rekening lain: {b.bank_name} · {b.account_number}</summary><p className="mt-2">a.n. {b.account_holder} · Cabang: {b.bank_branch || "Belum diisi"}</p><BankBookAttachment path={b.bank_book_path} bank={b.bank_name} holder={b.account_holder} /></details>)}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={draft[s.id] || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                      placeholder="BNK-xxxx-xxxxxxxxxxxxx"
                      className="font-mono text-xs md:w-64"
                    />
                    <Button size="sm" onClick={() => save(s)} disabled={(!dirty && synced) || savingId === s.id}>
                      {savingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Simpan</>}
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada sekolah</p>}
          </div>
        )}
      </Step>
    </div>
  );
};

export default SuperAdminSplitSettlement;
