import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { usePrincipalData } from "@/hooks/usePrincipalData";
import { FinanceCard, fmtIDR } from "./_shared";

export default function PrincipalKeuangan() {
  const { loading, finance, settlements, monthly } = usePrincipalData();

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keuangan Sekolah"
        subtitle="Rekap SPP, buku kas, dan pencairan dana"
        icon={Wallet}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FinanceCard label="Total Tagihan" value={fmtIDR(finance.totalTagihan)} icon={DollarSign} />
        <FinanceCard label="Total Pembayaran" value={fmtIDR(finance.totalPembayaran)} icon={TrendingUp} tone="emerald" />
        <FinanceCard label="Tunggakan" value={fmtIDR(finance.tunggakan)} icon={TrendingDown} tone="rose" />
        <FinanceCard label="Saldo Buku Kas" value={fmtIDR(finance.saldoKas)} icon={Wallet} tone="sky" />
        <FinanceCard label="Menunggu Pencairan" value={fmtIDR(finance.danaPending)} icon={Clock} tone="amber" />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Keuangan Bulanan (6 Bulan)</CardTitle>
          <CardDescription>Pembayaran SPP, pemasukan & pengeluaran kas</CardDescription>
        </CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
              <RTooltip formatter={(v: any) => fmtIDR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="SPP" stroke="#5B6CF9" strokeWidth={2} />
              <Line type="monotone" dataKey="Pendapatan" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Riwayat Pencairan Terbaru</CardTitle>
          <CardDescription>10 settlement terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">Belum ada settlement</div>
          ) : (
            <div className="space-y-1.5">
              {settlements.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs p-3 rounded-xl border border-border/50 bg-background/60">
                  <div className="flex flex-col">
                    <span className="font-mono font-semibold">{s.settlement_code}</span>
                    <span className="text-muted-foreground">{s.bank_name} • {format(new Date(s.requested_at), "d MMM yyyy", { locale: idLocale })}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtIDR(s.final_payout)}</div>
                    <Badge variant={s.status === "paid" ? "default" : s.status === "pending" ? "secondary" : "outline"} className="text-[10px]">{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
