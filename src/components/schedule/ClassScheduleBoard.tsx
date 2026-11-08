import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, ChevronRight, Clock, GraduationCap, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildDayCells, buildTimeRows, conflictsFor, formatMinutes, SCHEDULE_DAYS, validRange, type ScheduleEntry, type ScheduleForm } from "@/lib/classSchedule";
import { cn } from "@/lib/utils";

interface Props {
  classes: { id: string; name: string }[];
  schedules: ScheduleEntry[];
  subjects: { id: string; name: string; color: string | null }[];
  teachers: { user_id: string; full_name: string }[];
  isAdmin: boolean;
  onBulk?: () => void;
  onAdd: (defaults: Partial<ScheduleForm>) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onDelete: (id: string) => void;
}

export function ClassScheduleBoard({ classes, schedules, subjects, teachers, isAdmin, onAdd, onEdit, onDelete, onBulk }: Props) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<ScheduleEntry | null>(null);
  const orderedClasses = useMemo(() => [...classes].sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true })), [classes]);
  const selected = orderedClasses.find((item) => item.id === params.get("kelas")) || orderedClasses[0];
  const active = useMemo(() => schedules.filter((entry) => entry.is_active !== false), [schedules]);
  const entries = useMemo(() => active.filter((entry) => entry.class_id === selected?.id), [active, selected?.id]);
  const rows = useMemo(() => buildTimeRows(active), [active]);
  const days = useMemo(() => [0, 1, 2, 3, 4, ...([5, 6].filter((day) => entries.some((entry) => entry.day_of_week === day)))], [entries]);
  const columns = useMemo(() => new Map(days.map((day) => [day, buildDayCells(rows, entries, day)])), [days, rows, entries]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach((entry) => map.set(entry.class_id, (map.get(entry.class_id) || 0) + 1));
    return map;
  }, [active]);
  const conflictIds = useMemo(() => new Set(entries.filter((entry) => conflictsFor({ ...entry, room: entry.room || "", notes: entry.notes || "" }, active, entry.id).length > 0).map((entry) => entry.id)), [entries, active]);
  const invalidCount = entries.filter((entry) => !validRange(entry)).length;
  const subjectName = (id: string) => subjects.find((item) => item.id === id)?.name || "Mapel tidak ditemukan";
  const teacherName = (id: string) => teachers.find((item) => item.user_id === id)?.full_name || "Guru tidak ditemukan";
  const subjectColor = (id: string) => {
    const color = subjects.find((item) => item.id === id)?.color || "";
    return /^#[0-9a-f]{6}$/i.test(color) ? color : "#5B6CF9";
  };
  const selectClass = (id: string) => setParams((previous) => { const next = new URLSearchParams(previous); next.set("tab", "kelas"); next.set("kelas", id); return next; }, { replace: true });
  const showFull = () => setParams((previous) => { const next = new URLSearchParams(previous); next.set("tab", "mengajar"); return next; }, { replace: true });

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader icon={CalendarDays} title="Jadwal Pelajaran" subtitle="Pantau pembagian waktu, mata pelajaran, dan guru untuk setiap kelas." actions={isAdmin && <div className="flex flex-wrap gap-2">{onBulk && <Button variant="outline" className="bg-white text-primary" onClick={onBulk}>Tambah massal</Button>}<Button className="bg-white text-primary hover:bg-white/90" onClick={() => onAdd({ class_id: selected?.id || "" })}><Plus className="mr-1.5 h-4 w-4" />Tambah jadwal</Button></div>} />

      {!selected ? (
        <Card className="p-8 text-center"><GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" /><h2 className="font-semibold">Belum ada kelas</h2><p className="mt-1 text-sm text-muted-foreground">Data kelas akan muncul di sini setelah ditambahkan ke sekolah.</p>{isAdmin && <Button className="mt-4" onClick={() => navigate("/classes")}>Kelola kelas</Button>}</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card xl:grid-cols-[1.4fr_repeat(4,1fr)]">
            <div className="flex items-center gap-3 bg-primary p-4 text-primary-foreground col-span-2 xl:col-span-1"><div className="rounded-xl bg-white/15 p-2.5"><GraduationCap className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-lg font-semibold">{selected.name}</p><p className="text-xs text-white/75">Kelas yang dipantau</p></div></div>
            {[
              { value: entries.length, label: "Jadwal terisi" },
              { value: new Set(entries.map((entry) => entry.teacher_id)).size, label: "Guru mengajar" },
              { value: new Set(entries.map((entry) => entry.subject_id)).size, label: "Mata pelajaran" },
              { value: new Set(entries.map((entry) => entry.day_of_week)).size, label: "Hari terjadwal" },
            ].map((stat) => <div key={stat.label} className="border-t px-4 py-3 sm:border-l xl:border-t-0"><p className="text-xl font-bold text-primary">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.label}</p></div>)}
          </div>

          <div className="xl:hidden"><Select value={selected.id} onValueChange={selectClass}><SelectTrigger className="h-12 bg-card" aria-label="Kelas yang dipantau"><SelectValue /></SelectTrigger><SelectContent>{orderedClasses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {counts.get(item.id) || 0} jadwal</SelectItem>)}</SelectContent></Select></div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <Card className="hidden self-start overflow-hidden rounded-2xl shadow-none xl:block">
              <div className="border-b p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Per kelas</p><div className="mt-1 flex items-center justify-between"><h2 className="font-semibold">Daftar kelas</h2><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{classes.length}</span></div><div className="relative mt-3"><Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" /><Input className="h-9 pl-8 text-xs" placeholder="Cari kelas..." aria-label="Cari kelas" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
              <div className="max-h-[500px] space-y-1 overflow-y-auto p-2">
                {orderedClasses.filter((item) => item.name.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id"))).map((item) => <button key={item.id} type="button" onClick={() => selectClass(item.id)} aria-pressed={selected.id === item.id} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors", selected.id === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected.id === item.id ? "bg-white/15" : "bg-primary/10 text-primary")}><GraduationCap className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className={cn("mt-0.5 text-[11px]", selected.id === item.id ? "text-white/75" : "text-muted-foreground")}>{counts.get(item.id) || 0} jadwal</p></div><ChevronRight className="h-3.5 w-3.5 shrink-0" /></button>)}
                {orderedClasses.filter((item) => item.name.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id"))).length === 0 && <p className="p-3 text-xs text-muted-foreground">Kelas tidak ditemukan.</p>}
              </div>
              {isAdmin && <div className="border-t p-2"><Button variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => navigate("/classes")}><Plus className="mr-1.5 h-3.5 w-3.5" />Kelola kelas</Button></div>}
            </Card>

            <Card className="min-w-0 overflow-hidden rounded-2xl shadow-none">
              <div className="space-y-4 border-b p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Tampilan mingguan</p><h2 className="mt-1 text-lg font-semibold">Jadwal {selected.name}</h2><p className="mt-1 text-xs text-muted-foreground">{isAdmin ? "Klik sel kosong untuk menambah jadwal, atau pilih jadwal untuk mengedit." : "Lihat pembagian mata pelajaran dan guru untuk kelas ini."}</p></div><Button size="sm" variant="outline" onClick={showFull}>Jadwal lengkap<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div>
                <div className="grid grid-cols-3 gap-2 sm:flex">{days.map((day) => <div key={day} className="flex min-w-0 flex-1 items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2"><span className="text-[10px] font-semibold uppercase text-muted-foreground">{SCHEDULE_DAYS[day].slice(0, 3)}</span><span className="text-xs font-semibold text-primary">{entries.filter((entry) => entry.day_of_week === day).length}</span></div>)}</div>
                {(conflictIds.size > 0 || invalidCount > 0) && <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{conflictIds.size > 0 && `${conflictIds.size} jadwal berbenturan pada kelas atau guru. `}{invalidCount > 0 && `${invalidCount} jadwal memiliki waktu tidak valid; perbaiki melalui tab Jadwal Lengkap.`}</span></div>}
              </div>

              {rows.length === 0 ? <div className="p-8 text-center"><Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" /><h3 className="text-sm font-semibold">Belum ada rentang waktu jadwal</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">Tabel mingguan akan terbentuk dari jam mulai dan selesai jadwal sekolah yang tersimpan.</p>{isAdmin && <Button className="mt-4" size="sm" onClick={() => onAdd({ class_id: selected.id })}><Plus className="mr-1 h-4 w-4" />Tambah jadwal pertama</Button>}</div> : (
                <div className="overflow-x-auto" role="region" aria-label={`Tabel jadwal mingguan ${selected.name}`} tabIndex={0}>
                  <table className="w-full min-w-[780px] table-fixed border-collapse text-left text-xs">
                    <thead className="bg-primary text-primary-foreground"><tr><th scope="col" className="w-28 border-r border-white/20 px-3 py-3 text-[10px] uppercase">Sesi & waktu</th>{days.map((day) => <th scope="col" key={day} className="border-r border-white/20 px-2 py-3 text-center text-[10px] uppercase last:border-r-0">{SCHEDULE_DAYS[day]}</th>)}</tr></thead>
                    <tbody>{rows.map((row, i) => <tr key={row.start}>
                      <th scope="row" className="border-b border-r bg-muted/35 p-3 align-top"><p className="text-xs font-semibold text-primary">Sesi {i + 1}</p><p className="mt-1 whitespace-nowrap text-[10px] font-normal text-muted-foreground">{formatMinutes(row.start)} – {formatMinutes(row.end)}</p></th>
                      {days.map((day) => {
                        const cell = columns.get(day)?.[i];
                        if (!cell) return null;
                        return <td key={day} rowSpan={cell.rowSpan} className="border-b border-r p-1.5 align-top last:border-r-0">
                          {cell.entries.length === 0 ? isAdmin ? <button type="button" className="flex min-h-24 w-full items-center justify-center gap-1 rounded-lg text-[11px] text-muted-foreground/70 transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Tambah jadwal ${selected.name} ${SCHEDULE_DAYS[day]} ${formatMinutes(row.start)} – ${formatMinutes(row.end)}`} onClick={() => onAdd({ class_id: selected.id, day_of_week: day, start_time: formatMinutes(row.start), end_time: formatMinutes(row.end) })}><Plus className="h-3.5 w-3.5" />Tambah</button> : <div className="flex min-h-24 items-center justify-center text-muted-foreground/40">—</div> : <div className="space-y-1.5">{cell.entries.map((entry) => <div key={entry.id} className={cn("overflow-hidden rounded-lg border-l-[3px] bg-primary/[0.055]", conflictIds.has(entry.id) && "bg-amber-50 dark:bg-amber-950/30")} style={{ borderLeftColor: conflictIds.has(entry.id) ? "#f59e0b" : subjectColor(entry.subject_id) }}>
                            <button type="button" className="w-full p-2.5 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" onClick={() => isAdmin ? onEdit(entry) : setDetails(entry)} aria-label={`${isAdmin ? "Edit" : "Detail"} ${subjectName(entry.subject_id)}, ${SCHEDULE_DAYS[day]}, ${entry.start_time.slice(0, 5)}`}>
                              <p className="text-[11px] font-semibold leading-4">{subjectName(entry.subject_id)}</p><p className="mt-1 break-words text-[10px] leading-4 text-muted-foreground">{teacherName(entry.teacher_id)}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3 shrink-0" />{entry.start_time.slice(0, 5)} – {entry.end_time.slice(0, 5)}</p>{entry.room && <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-words">{entry.room}</span></p>}{conflictIds.has(entry.id) && <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">Perlu cek benturan</p>}
                            </button>
                            {isAdmin && <div className="flex justify-end border-t border-primary/5 px-1"><Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`Hapus jadwal ${subjectName(entry.subject_id)} ${SCHEDULE_DAYS[day]}`} onClick={() => onDelete(entry.id)}><Trash2 className="h-3 w-3" /></Button></div>}
                          </div>)}</div>}
                        </td>;
                      })}
                    </tr>)}</tbody>
                  </table>
                </div>
              )}
              <div className="border-t bg-muted/15 px-4 py-3"><p className="text-[11px] leading-relaxed text-muted-foreground">Baris waktu mengikuti jam mulai dan selesai jadwal sekolah. <span className="sm:hidden">Geser tabel ke samping untuk melihat seluruh hari.</span></p></div>
            </Card>
          </div>
        </>
      )}
      <Dialog open={!!details} onOpenChange={(open) => { if (!open) setDetails(null); }}><DialogContent><DialogHeader><DialogTitle>{details && subjectName(details.subject_id)}</DialogTitle></DialogHeader>{details && <div className="space-y-2 text-sm"><p>{selected?.name} • {SCHEDULE_DAYS[details.day_of_week]}</p><p className="text-muted-foreground">{teacherName(details.teacher_id)}</p><p>{details.start_time.slice(0, 5)} – {details.end_time.slice(0, 5)}{details.room && ` • ${details.room}`}</p>{details.notes && <p className="rounded-lg bg-muted p-3 text-muted-foreground">{details.notes}</p>}</div>}</DialogContent></Dialog>
    </div>
  );
}
