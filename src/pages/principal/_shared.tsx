import { Card, CardContent } from "@/components/ui/card";

export const fmtIDR = (n: number) => `Rp ${(n || 0).toLocaleString("id-ID")}`;

export function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: string }) {
  const tones: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-600",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600",
    indigo: "from-indigo-500/15 to-indigo-500/5 text-indigo-600",
  };
  return (
    <Card className={`rounded-2xl bg-gradient-to-br ${tones[tone] || tones.primary} border-border/50`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

export function FinanceCard({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: string; tone?: string }) {
  const tones: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    sky: "text-sky-600 bg-sky-500/10",
    amber: "text-amber-600 bg-amber-500/10",
  };
  return (
    <div className="p-3 rounded-xl border border-border/50 bg-card">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]} mb-2`}><Icon className="h-4 w-4" /></div>
      <div className="text-sm font-bold text-foreground truncate">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
