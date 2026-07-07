import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, XCircle, HeartPulse, FileText, Users, BookOpen } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scheduleId: string | null;
  className: string;
  subject: string;
  teacher: string;
  startTime: string;
  endTime: string;
};

type Row = { id: string; name: string; nis?: string | null; status: "hadir" | "izin" | "sakit" | "alfa" | "belum" };

const STATUS_STYLE: Record<Row["status"], { chip: string; icon: any; label: string }> = {
  hadir: { chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20", icon: CheckCircle2, label: "Hadir" },
  izin:  { chip: "bg-sky-500/10 text-sky-700 ring-sky-500/20", icon: FileText, label: "Izin" },
  sakit: { chip: "bg-amber-500/10 text-amber-700 ring-amber-500/20", icon: HeartPulse, label: "Sakit" },
  alfa:  { chip: "bg-rose-500/10 text-rose-700 ring-rose-500/20", icon: XCircle, label: "Alfa" },
  belum: { chip: "bg-slate-500/10 text-slate-700 ring-slate-500/20", icon: Clock, label: "Belum" },
};

export function ClassAttendanceDetailDialog({ open, onOpenChange, scheduleId, className, subject, teacher, startTime, endTime }: Props) {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open || !scheduleId || !schoolId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [studentsQ, attQ] = await Promise.all([
          supabase.from("students").select("id, name, nis").eq("school_id", schoolId).eq("class", className).order("name"),
          supabase.from("subject_attendance").select("student_id, status").eq("school_id", schoolId).eq("teaching_schedule_id", scheduleId).eq("date", today),
        ]);
        const attMap = new Map<string, string>((attQ.data || []).map((a: any) => [a.student_id, a.status]));
        const list: Row[] = (studentsQ.data || []).map((s: any) => {
          const st = (attMap.get(s.id) || "belum") as Row["status"];
          return { id: s.id, name: s.name, nis: s.nis, status: (["hadir","izin","sakit","alfa"].includes(st) ? st : "belum") as Row["status"] };
        });
        if (!cancelled) setRows(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, scheduleId, schoolId, className]);

  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const orderedStatuses: Row["status"][] = ["hadir", "izin", "sakit", "alfa", "belum"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#5B6CF9]" />
            {subject}
          </DialogTitle>
          <DialogDescription>
            {className} · {teacher} · {startTime}–{endTime}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-2">
          {orderedStatuses.map((st) => {
            const s = STATUS_STYLE[st];
            const Icon = s.icon;
            return (
              <div key={st} className={`rounded-xl px-2 py-2 ring-1 ${s.chip} flex flex-col items-center gap-0.5`}>
                <Icon className="h-4 w-4" />
                <div className="text-base font-extrabold leading-none">{counts[st] || 0}</div>
                <div className="text-[10px] font-medium">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              Belum ada siswa di kelas ini
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
              {rows.map((r, idx) => {
                const s = STATUS_STYLE[r.status];
                const Icon = s.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                        {r.nis && <div className="text-[11px] text-muted-foreground truncate">NIS {r.nis}</div>}
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${s.chip}`}>
                      <Icon className="h-3 w-3" />
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
