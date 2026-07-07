import { useEffect, useMemo, useState } from "react";
import { Landmark, ArrowDownToLine, FileText, Loader2, Receipt, TrendingUp, Banknote, CheckCircle2, XCircle, Clock, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsRow, downloadCSV, useMonthRange, type Header, type Row } from "./_common";
import { format } from "date-fns";
import { fmtIDR } from "../_shared";

/**
 * Sinkron dengan Bendahara → Pencairan (read-only untuk Kepsek).
 * 2 Tab:
 *  - Settlement : pengajuan aktif (pending + approved)
 *  - Riwayat    : yang sudah selesai (paid + rejected)
 * Card ringkasan menyesuaikan tab yang aktif.
 */
export default function LaporanSettlement() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const now = new Date();
  const first = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10);
  const { last } = useMonthRange();
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"settlement" | "riwayat">("settlement");

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoading(true);
      let q = supabase.from("spp_settlements").select("*").eq("school_id", schoolId).order("requested_at", { ascending: false });
      if (from) q = q.gte("requested_at", from);
      if (to) q = q.lte("requested_at", to + "T23:59:59");
      const { data } = await q;
      setAll(data || []);
      setLoading(false);
    })();
  }, [schoolId, from, to]);

  const activeList = useMemo(() => all.filter((s) => ["pending", "approved"].includes(s.status)), [all]);
  const historyList = useMemo(() => all.filter((s) => ["paid", "rejected"].includes(s.status)), [all]);

  const activeSummary = useMemo(() => ({
    total: activeList.length,
    pending: activeList.filter((s) => s.status === "pending").length,
    approved: activeList.filter((s) => s.status === "approved").length,
    pendingPayout: activeList.reduce((s, x) => s + (x.final_payout || x.total_net || 0), 0),
  }), [activeList]);

  const historySummary = useMemo(() => {
    const paid = historyList.filter((s) => s.status === "paid");
    const rejected = historyList.filter((s) => s.status === "rejected");
    return {
      total: historyList.length,
      paidCount: paid.length,
      rejectedCount: rejected.length,
      totalPaid: paid.reduce((s, x) => s + (x.final_payout || 0), 0),
      totalGross: paid.reduce((s, x) => s + (x.total_gross || 0), 0),
    };
  }, [historyList]);

  const badge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-500 hover:bg-amber-500",
      approved: "bg-blue-500 hover:bg-blue-500",
      paid: "bg-emerald-500 hover:bg-emerald-500",
      rejected: "bg-red-500 hover:bg-red-500",
    };
    return <Badge className={`${map[s] || "bg-slate-500"} text-white text-[10px]`}>{s.toUpperCase()}</Badge>;
  };

  const toRows = (list: any[]): Row[] => list.map((s) => ({
    Kode: s.settlement_code,
    Diminta: s.requested_at ? format(new Date(s.requested_at), "dd/MM/yy HH:mm") : "-",
    Disetujui: s.approved_at ? format(new Date(s.approved_at), "dd/MM/yy HH:mm") : "-",
    Dicairkan: s.paid_at ? format(new Date(s.paid_at), "dd/MM/yy HH:mm") : "-",
    Status: s.status,
    Transaksi: s.total_transactions,
    Bruto: s.total_gross,
    "Biaya Pencairan": s.withdraw_fee ?? 3000,
    Final: s.final_payout,
    Bank: s.bank_name || "-",
    "No Rekening": s.account_number || "-",
    Penerima: s.account_holder || "-",
  }));

  const csvHeaders: Header[] = [
    { key: "Kode", label: "Kode" }, { key: "Diminta", label: "Diminta" }, { key: "Disetujui", label: "Disetujui" }, { key: "Dicairkan", label: "Dicairkan" },
    { key: "Status", label: "Status" }, { key: "Transaksi", label: "Transaksi" },
    { key: "Bruto", label: "Bruto", type: "money" }, { key: "Biaya Pencairan", label: "Biaya Pencairan", type: "money" }, { key: "Final", label: "Final", type: "money" },
    { key: "Bank", label: "Bank" }, { key: "No Rekening", label: "No Rekening" }, { key: "Penerima", label: "Penerima" },
  ];

  const currentList = tab === "settlement" ? activeList : historyList;

  const renderTable = (list: any[]) => (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="[&_th]:whitespace-nowrap">
              <TableHead>Code</TableHead>
              <TableHead>Tgl</TableHead>
              <TableHead>Trx</TableHead>
              <TableHead>Bruto</TableHead>
              <TableHead>Biaya Pencairan</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Bank / Penerima</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                {tab === "settlement" ? "Tidak ada pengajuan aktif" : "Belum ada riwayat settlement"}
              </TableCell></TableRow>
            ) : list.map((s) => {
              const withdrawFee = s.withdraw_fee ?? 3000;
              const finalPayout = s.final_payout ?? Math.max(0, (s.total_gross || 0) - withdrawFee);
              return (
                <TableRow key={s.id} className="[&_td]:whitespace-nowrap hover:bg-muted/40">
                  <TableCell className="text-xs font-mono">{s.settlement_code}</TableCell>
                  <TableCell className="text-xs">{s.requested_at ? new Date(s.requested_at).toLocaleDateString("id-ID") : "-"}</TableCell>
                  <TableCell>{s.total_transactions ?? 0}</TableCell>
                  <TableCell className="text-xs">{fmtIDR(s.total_gross || 0)}</TableCell>
                  <TableCell className="text-xs text-rose-600">{fmtIDR(withdrawFee)}</TableCell>
                  <TableCell className="font-semibold text-emerald-600">{fmtIDR(finalPayout)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{s.bank_name || "-"}</div>
                    <div className="text-muted-foreground">{s.account_holder || "-"}</div>
                  </TableCell>
                  <TableCell>{badge(s.status)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rekap Settlement / Pencairan"
        subtitle="Sinkron dengan Bendahara — pantau pengajuan aktif dan riwayat pencairan"
        icon={Landmark}
        variant="primary"
        actions={
          <Button size="sm" onClick={() => downloadCSV(`Settlement_${tab}_${from}_${to}`, toRows(currentList), csvHeaders)} className="bg-white/20 hover:bg-white/30 text-white border border-white/20">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        }
      />

      {/* Filter tanggal */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-[10px] text-muted-foreground">Dari Tanggal</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Sampai Tanggal</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-fit gap-1 bg-indigo-50 dark:bg-indigo-950/40 p-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
          <TabsTrigger
            value="settlement"
            className="gap-2 rounded-lg font-semibold text-[#3D4FE0] dark:text-indigo-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#5B6CF9] data-[state=active]:to-[#3D4FE0] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#5B6CF9]/30 transition-all duration-300"
          >
            <ArrowDownToLine className="h-4 w-4" /> Settlement
          </TabsTrigger>
          <TabsTrigger
            value="riwayat"
            className="gap-2 rounded-lg font-semibold text-[#3D4FE0] dark:text-indigo-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#5B6CF9] data-[state=active]:to-[#3D4FE0] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#5B6CF9]/30 transition-all duration-300"
          >
            <FileText className="h-4 w-4" /> Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settlement" className="space-y-4 mt-4">
          <StatsRow items={[
            { label: "Pengajuan Aktif", value: activeSummary.total, tone: "primary", icon: Receipt },
            { label: "Pending", value: activeSummary.pending, tone: "amber", icon: Clock },
            { label: "Disetujui", value: activeSummary.approved, tone: "indigo", icon: CheckCircle2 },
            { label: "Menunggu Pencairan", value: fmtIDR(activeSummary.pendingPayout), tone: "amber", icon: Banknote },
          ]} />
          {renderTable(activeList)}
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-4 mt-4">
          <StatsRow items={[
            { label: "Total Riwayat", value: historySummary.total, tone: "primary", icon: FileText },
            { label: "Dicairkan", value: historySummary.paidCount, tone: "emerald", icon: CheckCircle2 },
            { label: "Ditolak", value: historySummary.rejectedCount, tone: "rose", icon: XCircle },
            { label: "Total Bruto", value: fmtIDR(historySummary.totalGross), tone: "indigo", icon: TrendingUp },
            { label: "Total Sudah Cair", value: fmtIDR(historySummary.totalPaid), tone: "emerald", icon: Banknote },
          ]} />
          {renderTable(historyList)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
