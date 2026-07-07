import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Activity } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { usePrincipalData } from "@/hooks/usePrincipalData";

export default function PrincipalAgenda() {
  const { loading, calendar, timeline } = usePrincipalData();

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender & Aktivitas"
        subtitle="Agenda sekolah dan riwayat aktivitas sistem"
        icon={CalendarDays}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Kalender Kegiatan</CardTitle>
            <CardDescription>Libur & pengumuman terjadwal</CardDescription>
          </CardHeader>
          <CardContent>
            {calendar.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Belum ada agenda</div>}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {calendar.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50">
                  <div className="text-center shrink-0 w-14">
                    <div className="text-[10px] uppercase text-muted-foreground">{format(new Date(c.date), "MMM", { locale: idLocale })}</div>
                    <div className="text-lg font-bold leading-none">{format(new Date(c.date), "d")}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.label}</div>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{c.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Timeline Aktivitas</CardTitle>
            <CardDescription>Absensi, pembayaran, pengumuman, kas & pencairan</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas</div>}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {timeline.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm p-2 rounded-xl hover:bg-muted/40">
                  <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${t.tone === "success" ? "bg-emerald-500" : t.tone === "warning" ? "bg-amber-500" : t.tone === "info" ? "bg-sky-500" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{t.at ? format(new Date(t.at), "d MMM yyyy • HH:mm", { locale: idLocale }) : "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
