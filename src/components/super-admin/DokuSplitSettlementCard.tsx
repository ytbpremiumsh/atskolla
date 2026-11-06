import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Split, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = { id: string; name: string; doku_settlement_bank_id: string | null };

const ID_PATTERN = /^[A-Z]{3}-[0-9]{3,5}-[0-9]{6,20}$/;

const DokuSplitSettlementCard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schools")
      .select("id,name,doku_settlement_bank_id")
      .order("name");
    if (error) toast.error("Gagal memuat sekolah: " + error.message);
    const list = (data || []) as Row[];
    setRows(list);
    setDraft(Object.fromEntries(list.map((r) => [r.id, r.doku_settlement_bank_id || ""])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.name.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const activeCount = rows.filter((r) => !!r.doku_settlement_bank_id).length;

  const save = async (r: Row) => {
    const value = (draft[r.id] || "").trim().toUpperCase();
    if (value && !ID_PATTERN.test(value)) {
      toast.error("Format Bank Settlement ID tidak valid. Contoh: BNK-0308-1793845037429");
      return;
    }
    setSavingId(r.id);
    const { error } = await supabase
      .from("schools")
      .update({ doku_settlement_bank_id: value || null })
      .eq("id", r.id);
    setSavingId(null);
    if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
    toast.success(value ? `Split aktif untuk ${r.name}` : `Split dimatikan untuk ${r.name}`);
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, doku_settlement_bank_id: value || null } : x)));
    setDraft((d) => ({ ...d, [r.id]: value }));
  };

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Split className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Split Settlement DOKU</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nominal SPP murni langsung dikirim DOKU ke rekening sekolah. Biaya admin otomatis masuk ke
              rekening utama (default) akun DOKU, yaitu rekening owner ATSkolla.
            </p>
          </div>
          <Badge variant="secondary">{activeCount} sekolah aktif</Badge>
        </div>

        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p>1. Daftarkan rekening sekolah di DOKU: Settings → Bank Account, tunggu status Verified.</p>
          <p>2. Salin kode di kolom Bank Settlement ID (contoh: BNK-0308-1793845037429) lalu tempel di sekolah terkait.</p>
          <p>3. Pastikan rekening owner (Mandiri) dijadikan rekening utama/default di DOKU.</p>
          <p>4. Tagihan yang dibayar lewat split tidak ikut dihitung di pencairan manual bendahara.</p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari sekolah..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {filtered.map((r) => {
              const dirty = (draft[r.id] || "") !== (r.doku_settlement_bank_id || "");
              return (
                <div key={r.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.doku_settlement_bank_id ? "Split aktif" : "Belum diatur — dana masuk ke rekening utama"}
                    </p>
                  </div>
                  <Input
                    value={draft[r.id] || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="BNK-xxxx-xxxxxxxxxxxxx"
                    className="font-mono text-xs sm:w-64"
                  />
                  <Button size="sm" onClick={() => save(r)} disabled={!dirty || savingId === r.id}>
                    {savingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada sekolah</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DokuSplitSettlementCard;
