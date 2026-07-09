import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, BookOpen, Users as UsersIcon, GraduationCap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

interface Subject { id: string; name: string; color: string | null; is_active: boolean; }
interface Schedule {
  id: string; teacher_id: string; subject_id: string; class_id: string;
  day_of_week: number; start_time: string; end_time: string; room: string | null;
  is_active: boolean; notes: string | null;
}
interface Teacher { user_id: string; full_name: string; }
interface ClassData { id: string; name: string; }

export default function PrincipalJadwal() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const [subjectsRes, schedulesRes, classesRes, teachersRes] = await Promise.all([
          supabase.from("subjects").select("id, name, color, is_active").eq("school_id", schoolId).order("name"),
          supabase.from("teaching_schedules").select("*").eq("school_id", schoolId).eq("is_active", true).order("day_of_week").order("start_time"),
          supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
          supabase.from("profiles").select("user_id, full_name").eq("school_id", schoolId),
        ]);
        setSubjects(subjectsRes.data || []);
        setSchedules(schedulesRes.data || []);
        setClasses(classesRes.data || []);
        setTeachers(teachersRes.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || "—";
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "—";
  const getSubjectColor = (id: string) => subjects.find(s => s.id === id)?.color || "#5B6CF9";
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "—";

  const filtered = useMemo(() => {
    let arr = schedules;
    if (selectedDay !== "all") arr = arr.filter(s => s.day_of_week === parseInt(selectedDay));
    if (teacherFilter !== "all") arr = arr.filter(s => s.teacher_id === teacherFilter);
    if (classFilter !== "all") arr = arr.filter(s => s.class_id === classFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(s =>
        getTeacherName(s.teacher_id).toLowerCase().includes(q) ||
        getSubjectName(s.subject_id).toLowerCase().includes(q) ||
        getClassName(s.class_id).toLowerCase().includes(q) ||
        (s.room || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [schedules, selectedDay, teacherFilter, classFilter, searchQuery, teachers, subjects, classes]);

  const grouped = useMemo(() => {
    const g: Record<number, Schedule[]> = {};
    filtered.forEach(s => { (g[s.day_of_week] ||= []).push(s); });
    return g;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari guru, mapel, kelas, ruangan..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={selectedDay} onValueChange={setSelectedDay}>
          <SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Hari</SelectItem>
            {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Guru" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Guru</SelectItem>
            {teachers.map(t => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Calendar className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0"><p className="text-lg sm:text-xl font-bold leading-none">{filtered.length}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total Jadwal</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><UsersIcon className="h-4 w-4 text-emerald-600" /></div>
          <div className="min-w-0"><p className="text-lg sm:text-xl font-bold leading-none">{new Set(filtered.map(s => s.teacher_id)).size}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Guru Terjadwal</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0"><BookOpen className="h-4 w-4 text-sky-600" /></div>
          <div className="min-w-0"><p className="text-lg sm:text-xl font-bold leading-none">{new Set(filtered.map(s => s.subject_id)).size}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Mata Pelajaran</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0"><GraduationCap className="h-4 w-4 text-amber-600" /></div>
          <div className="min-w-0"><p className="text-lg sm:text-xl font-bold leading-none">{new Set(filtered.map(s => s.class_id)).size}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Kelas Terjadwal</p></div>
        </CardContent></Card>
      </div>

      {/* Jadwal per hari */}
      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada jadwal</p>
          <p className="text-sm">Coba ubah filter pencarian</p>
        </CardContent></Card>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
          <Card key={day} className="border-0 shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 px-3.5 sm:px-6 pt-3.5 sm:pt-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="truncate">{DAYS[Number(day)]}</span>
                <Badge variant="secondary" className="ml-auto text-[10px] sm:text-xs shrink-0">{items.length} jadwal</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-5 pb-3 sm:pb-5">
              <div className="space-y-2.5">
                {items.map(s => {
                  const subjColor = getSubjectColor(s.subject_id);
                  return (
                    <div key={s.id} className="flex items-stretch gap-2.5 sm:gap-3">
                      <div className="w-12 sm:w-14 shrink-0 pt-2 text-right">
                        <p className="font-mono text-[11px] sm:text-xs font-semibold leading-none">{s.start_time.slice(0, 5)}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-none">{s.end_time.slice(0, 5)}</p>
                      </div>
                      <div className={cn("relative flex-1 min-w-0 rounded-2xl px-3 sm:px-3.5 py-2.5 sm:py-3 bg-card border border-border/60 transition-all hover:shadow-md hover:border-border")}>
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r" style={{ backgroundColor: subjColor }} aria-hidden />
                        <div className="flex items-center gap-2 min-w-0 mb-1">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: subjColor }} aria-hidden />
                          <p className="font-semibold text-sm truncate">{getSubjectName(s.subject_id)}</p>
                          <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">Kelas {getClassName(s.class_id)}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{getTeacherName(s.teacher_id)}</span>
                          {s.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.room}</span>}
                          {s.notes && <span className="italic truncate">"{s.notes}"</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
