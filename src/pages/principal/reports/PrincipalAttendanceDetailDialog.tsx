import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Phone, User, GraduationCap, CalendarDays, Clock, ChevronLeft, ChevronRight, UserCheck, UserX, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const STATUS_CODES: Record<string, string> = { hadir: "H", sakit: "S", izin: "I", alfa: "A" };
const STATUS_CLR: Record<string, string> = {
  hadir: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  sakit: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  izin: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  alfa: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};
const MONTH = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

type Props = {
  open: boolean;
  onClose: () => void;
  kind: "student" | "teacher";
  targetId: string | null;
};

export function PrincipalAttendanceDetailDialog({ open, onClose, kind, targetId }: Props) {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !targetId || !schoolId) return;
    (async () => {
      setLoading(true);
      const y = month.getFullYear();
      const m = month.getMonth();
      const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const last = new Date(y, m + 1, 0).toISOString().slice(0, 10);

      if (kind === "student") {
        const [sRes, lRes] = await Promise.all([
          supabase.from("students").select("id, student_id, name, class, gender, parent_name, parent_phone, card_number, rfid_uid").eq("id", targetId).eq("school_id", schoolId).maybeSingle(),
          supabase.from("attendance_logs").select("date, time, status, attendance_type").eq("student_id", targetId).eq("school_id", schoolId).gte("date", first).lte("date", last).order("date", { ascending: false }).order("time", { ascending: false }),
        ]);
        setEntity(sRes.data);
        setLogs(lRes.data || []);
        setRoles([]);
      } else {
        const [pRes, rRes, lRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone, avatar_url").eq("user_id", targetId).eq("school_id", schoolId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", targetId),
          supabase.from("teacher_attendance_logs").select("date, time, status, attendance_type").eq("user_id", targetId).eq("school_id", schoolId).gte("date", first).lte("date", last).order("date", { ascending: false }).order("time", { ascending: false }),
        ]);
        setEntity(pRes.data);
        setRoles((rRes.data || []).map((r: any) => r.role));
        setLogs(lRes.data || []);
      }
      setLoading(false);
    })();
  }, [open, targetId, schoolId, kind, month]);

  // Group logs by date → { datang, pulang }
  const byDate = useMemo(() => {
    const m: Record<string, { datang?: any; pulang?: any }> = {};
    logs.forEach((l) => {
      const type = l.attendance_type || "datang";
      if (!m[l.date]) m[l.date] = {};
      if (type === "pulang") m[l.date].pulang = l;
      else m[l.date].datang = l;
    });
    return m;
  }, [logs]);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const stats = useMemo(() => {
    let h = 0, s = 0, i = 0, a = 0, terlambat = 0;
    Object.values(byDate).forEach((row) => {
      const st = row.datang?.status;
      if (st === "hadir") { h++; if (row.datang?.time && row.datang.time > "07:30:00") terlambat++; }
      else if (st === "sakit") s++;
      else if (st === "izin") i++;
      else if (st === "alfa") a++;
    });
    const total = h + s + i + a;
    const rata = total > 0 ? Math.round((h / total) * 100) : 0;
    return { h, s, i, a, terlambat, total, rata };
  }, [byDate]);

  const shiftMonth = (delta: number) => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + delta);
    setMonth(d);
  };

  const title = kind === "student" ? (entity?.name || "Detail Siswa") : (entity?.full_name || "Detail Guru");
  const subtitleParts: string[] = [];
  if (kind === "student" && entity) {
    subtitleParts.push(`NIS ${entity.student_id}`, `Kelas ${entity.class}`, entity.gender === "P" ? "Perempuan" : "Laki-laki");
  } else if (kind === "teacher" && entity) {
    if (roles.length) subtitleParts.push(roles.join(" • "));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] text-white flex items-center justify-center text-lg font-bold shrink-0">
              {(title || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg leading-tight truncate">{title}</DialogTitle>
              <DialogDescription className="mt-0.5 flex flex-wrap gap-1.5 items-center">
                {subtitleParts.map((p, i) => (
                  <span key={i} className="text-xs">{i > 0 && "•"} {p}</span>
                ))}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !entity ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Data tidak ditemukan</div>
        ) : (
          <div className="space-y-4">
            {/* Info card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
                {kind === "student" ? (
                  <>
                    <InfoRow icon={User} label="Wali/Orang Tua" value={entity.parent_name || "-"} />
                    <InfoRow icon={Phone} label="No HP Wali" value={entity.parent_phone || "-"} />
                    <InfoRow icon={GraduationCap} label="Kelas" value={entity.class || "-"} />
                    <InfoRow icon={UserCheck} label="Kartu / RFID" value={entity.rfid_uid ? "Terdaftar" : "Belum"} />
                  </>
                ) : (
                  <>
                    <InfoRow icon={User} label="Nama" value={entity.full_name || "-"} />
                    <InfoRow icon={Phone} label="No HP" value={entity.phone || "-"} />
                    <InfoRow icon={GraduationCap} label="Peran" value={roles.length ? roles.join(", ") : "-"} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Month navigation + stats */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold min-w-[140px] text-center">
                  {MONTH[month.getMonth()]} {month.getFullYear()}
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatChip tone="emerald" label="Hadir" value={stats.h} />
                <StatChip tone="sky" label="Sakit" value={stats.s} />
                <StatChip tone="amber" label="Izin" value={stats.i} />
                <StatChip tone="rose" label="Alfa" value={stats.a} />
                <StatChip tone="amber" label="Terlambat" value={stats.terlambat} />
                <StatChip tone="primary" label="% Hadir" value={`${stats.rata}%`} />
              </div>
            </div>

            {/* Monthly grid */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1.5">
                  {days.map((d) => {
                    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const row = byDate[key];
                    const st = row?.datang?.status;
                    const code = st ? STATUS_CODES[st] || "-" : "";
                    const clr = st ? STATUS_CLR[st] : "bg-muted text-muted-foreground border-border/40";
                    return (
                      <div key={d} className={`aspect-square rounded-lg border flex flex-col items-center justify-center ${clr}`} title={`${d} — ${st || "belum absen"}`}>
                        <div className="text-[10px] opacity-70">{d}</div>
                        <div className="text-sm font-bold leading-none">{code || "·"}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                  <LegendDot cls="bg-emerald-500" label="H = Hadir" />
                  <LegendDot cls="bg-sky-500" label="S = Sakit" />
                  <LegendDot cls="bg-amber-500" label="I = Izin" />
                  <LegendDot cls="bg-rose-500" label="A = Alfa" />
                  <LegendDot cls="bg-muted-foreground/40" label="· = belum absen" />
                </div>
              </CardContent>
            </Card>

            {/* Log list */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="px-4 py-2.5 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" /> Riwayat Absensi Bulan Ini
                </div>
                {logs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <AlertCircle className="h-5 w-5 opacity-40" />
                    Belum ada catatan absensi
                  </div>
                ) : (
                  <div className="divide-y divide-border/40 max-h-[280px] overflow-y-auto">
                    {Object.entries(byDate)
                      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                      .map(([date, row]) => {
                        const d = new Date(date);
                        return (
                          <div key={date} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30">
                            <div className="text-center shrink-0 w-12">
                              <div className="text-[10px] uppercase text-muted-foreground">{format(d, "EEE", { locale: idLocale })}</div>
                              <div className="text-lg font-bold leading-none">{format(d, "d")}</div>
                            </div>
                            <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                              <LogCell type="Datang" log={row.datang} />
                              <LogCell type="Pulang" log={row.pulang} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function StatChip({ tone, label, value }: { tone: string; label: string; value: any }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    sky: "bg-sky-500/10 text-sky-700 border-sky-500/20",
    amber: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tones[tone]}`}>
      {label} <span className="font-extrabold">{value}</span>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${cls}`} />{label}</span>;
}

function LogCell({ type, log }: { type: "Datang" | "Pulang"; log?: any }) {
  if (!log) return (
    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
      <UserX className="h-3.5 w-3.5" /> {type} — belum
    </div>
  );
  const st = log.status || "-";
  const clr = STATUS_CLR[st] || "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-[11px] font-medium">{type}</span>
      <span className="text-[11px] font-mono">{String(log.time || "").slice(0, 5) || "-"}</span>
      <Badge className={`text-[9px] border-0 ${clr}`}>{st}</Badge>
    </div>
  );
}
