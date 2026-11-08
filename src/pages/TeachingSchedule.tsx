import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Plus, Pencil, Trash2, BookOpen, Clock, Users as UsersIcon, Calendar, Search, GraduationCap, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { ClassScheduleBoard } from "@/components/schedule/ClassScheduleBoard";
import { BulkScheduleEditor } from "@/components/schedule/BulkScheduleEditor";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { SCHEDULE_DAYS, conflictsFor, validRange, type ScheduleForm } from "@/lib/classSchedule";

const DAYS = SCHEDULE_DAYS;

interface Subject {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  is_active: boolean;
}

interface Schedule {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  is_active: boolean;
  notes: string | null;
}

interface TeacherProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface ClassData {
  id: string;
  name: string;
}

export default function TeachingSchedule({ view = "full" }: { view?: "class" | "full" }) {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("school_admin") || roles.includes("super_admin") || roles.includes("staff");
  const schoolId = profile?.school_id;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const loadVersion = useRef(0);
  const [activeTab, setActiveTab] = useState("schedules");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Schedule form
  const [bulkDialog, setBulkDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<ScheduleForm>({
    teacher_id: "",
    subject_id: "",
    class_id: "",
    day_of_week: 0,
    start_time: "07:00",
    end_time: "08:00",
    room: "",
    notes: "",
  });

  // Subject form
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", color: "#3B82F6" });

  const fetchData = useCallback(async () => {
    const version = ++loadVersion.current;
    if (!schoolId) { setLoading(false); return; }
    setLoading(true);
    setLoadError("");
    try {
      const [subjectsRes, schedulesRes, classesRes, teachersRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("school_id", schoolId).order("name"),
        supabase.from("teaching_schedules").select("*").eq("school_id", schoolId).eq("is_active", true).order("day_of_week").order("start_time"),
        supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
        supabase.from("profiles").select("user_id, full_name, avatar_url").eq("school_id", schoolId),
      ]);
      if (version !== loadVersion.current) return;
      const error = subjectsRes.error || schedulesRes.error || classesRes.error || teachersRes.error;
      if (error) throw error;
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (schedulesRes.data) setSchedules(schedulesRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (teachersRes.data) setTeachers(teachersRes.data);
    } catch (error) {
      if (version === loadVersion.current) setLoadError(error instanceof Error ? error.message : "Data jadwal belum dapat dimuat. Silakan coba kembali.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchData();
    // This ref is a request counter, not a DOM node; invalidate in-flight responses on cleanup.
    return () => { loadVersion.current++; }; // eslint-disable-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // Subject CRUD
  const saveSubject = async () => {
    if (!schoolId || !subjectForm.name.trim()) return;
    const payload = { school_id: schoolId, name: subjectForm.name.trim(), code: subjectForm.code.trim() || null, color: subjectForm.color };
    let error;
    if (editingSubject) {
      ({ error } = await supabase.from("subjects").update(payload).eq("id", editingSubject.id));
    } else {
      ({ error } = await supabase.from("subjects").insert(payload));
    }
    if (error) { toast.error("Gagal menyimpan mapel: " + error.message); return; }
    toast.success(editingSubject ? "Mapel diperbarui" : "Mapel ditambahkan");
    setSubjectDialog(false);
    setEditingSubject(null);
    setSubjectForm({ name: "", code: "", color: "#3B82F6" });
    fetchData();
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Hapus mata pelajaran ini?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus: " + error.message); return; }
    toast.success("Mapel dihapus");
    fetchData();
  };

  // Schedule CRUD
  const saveSchedule = async () => {
    if (savingSchedule || !isAdmin) return;
    if (!schoolId || !formData.teacher_id || !formData.subject_id || !formData.class_id) {
      toast.error("Lengkapi semua field wajib"); return;
    }
    if (!validRange(formData)) { toast.error("Jam selesai harus setelah jam mulai, pada hari yang sama."); return; }
    if (!classes.some((item) => item.id === formData.class_id) || !teachers.some((item) => item.user_id === formData.teacher_id) ||
      !subjects.some((item) => item.id === formData.subject_id) || !Number.isInteger(formData.day_of_week) || formData.day_of_week < 0 || formData.day_of_week > 6) {
      toast.error("Periksa kembali kelas, guru, mata pelajaran, dan hari yang dipilih."); return;
    }
    setSavingSchedule(true);
    try {
      const { data: latest, error: checkError } = await supabase.from("teaching_schedules").select("*").eq("school_id", schoolId).eq("is_active", true);
      if (checkError) throw checkError;
      const conflicts = conflictsFor(formData, latest || [], editingSchedule?.id);
      if (conflicts.length > 0) {
        toast.error(`Guru atau kelas sudah memiliki jadwal pada ${DAYS[formData.day_of_week]}, ${conflicts[0].start_time.slice(0, 5)}–${conflicts[0].end_time.slice(0, 5)}.`); return;
      }
      const payload = { ...formData, school_id: schoolId, room: formData.room.trim() || null, notes: formData.notes.trim() || null };
      const result = editingSchedule
        ? await supabase.from("teaching_schedules").update(payload).eq("id", editingSchedule.id).eq("school_id", schoolId).select("id")
        : await supabase.from("teaching_schedules").insert(payload).select("id");
      if (result.error) throw result.error;
      if (result.data?.length !== 1) throw new Error("Jadwal belum tersimpan. Periksa hak akses akun Anda.");
      toast.success(editingSchedule ? "Jadwal diperbarui" : "Jadwal ditambahkan");
      setScheduleDialog(false); setEditingSchedule(null); resetForm(); fetchData();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Periksa koneksi dan coba kembali.";
      toast.error("Gagal menyimpan jadwal: " + message);
    } finally { setSavingSchedule(false); }
  };

  const createSubjectInline = async (name: string): Promise<string | null> => {
    if (!isAdmin || !schoolId || !name.trim()) return null;
    const existing = subjects.find(s => s.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
    if (existing?.is_active) return existing.id;
    if (existing) { toast.error("Mapel ini nonaktif. Aktifkan melalui tab Mata Pelajaran pada Jadwal Lengkap."); return null; }
    try {
      const {data,error} = await supabase.from("subjects").insert({school_id:schoolId,name:name.trim(),color:"#5B6CF9"}).select("*").single();
      if(error) throw error;
      setSubjects(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name))); toast.success("Mata pelajaran ditambahkan"); return data.id;
    } catch(error) { toast.error("Gagal menambah mapel: " + (error && typeof error === "object" && "message" in error ? String(error.message) : "Periksa koneksi.")); return null; }
  };

  const saveBulk = async (rows: ScheduleForm[]): Promise<boolean> => {
    if (!isAdmin || !schoolId || savingSchedule) return false;
    if (!rows.length || rows.length > 100) { toast.error("Isi 1–100 baris jadwal."); return false; }
    setSavingSchedule(true);
    try {
      const {data:latest,error} = await supabase.from("teaching_schedules").select("*").eq("school_id",schoolId).eq("is_active",true);
      if(error) throw error;
      const checked = [...(latest || [])];
      for (const [i,row] of rows.entries()) {
        if (!validRange(row) || !Number.isInteger(row.day_of_week) || row.day_of_week < 0 || row.day_of_week > 6 ||
            !classes.some(c=>c.id===row.class_id) || !teachers.some(t=>t.user_id===row.teacher_id) || !subjects.some(s=>s.id===row.subject_id && s.is_active)) {
          throw new Error(`Baris ${i+1}: lengkapi kelas, mapel, guru, hari, dan jam yang valid.`);
        }
        if(conflictsFor(row,checked).length) throw new Error(`Baris ${i+1}: jadwal guru atau kelas bentrok pada ${DAYS[row.day_of_week]}, ${row.start_time}–${row.end_time}. Periksa juga baris lain dalam pengajuan ini.`);
        checked.push({...row,id:`bulk-${i}`,school_id:schoolId,is_active:true,created_at:"",updated_at:""});
      }
      const result = await supabase.from("teaching_schedules").insert(rows.map(row=>({...row,school_id:schoolId,room:row.room.trim()||null,notes:row.notes.trim()||null}))).select("id");
      if(result.error) throw result.error;
      if(result.data?.length!==rows.length) throw new Error("Jumlah jadwal tersimpan belum sesuai. Muat ulang sebelum mencoba kembali.");
      toast.success(`${rows.length} jadwal berhasil ditambahkan`); setBulkDialog(false); fetchData(); return true;
    } catch(error) { toast.error(error && typeof error === "object" && "message" in error ? String(error.message) : "Gagal menyimpan jadwal massal."); return false; }
    finally { setSavingSchedule(false); }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    const { error } = await supabase.from("teaching_schedules").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus: " + error.message); return; }
    toast.success("Jadwal dihapus");
    fetchData();
  };

  const resetForm = () => {
    setFormData({ teacher_id: "", subject_id: "", class_id: "", day_of_week: 0, start_time: "07:00", end_time: "08:00", room: "", notes: "" });
  };

  const openEditSchedule = (s: Schedule) => {
    setEditingSchedule(s);
    setFormData({
      teacher_id: s.teacher_id,
      subject_id: s.subject_id,
      class_id: s.class_id,
      day_of_week: s.day_of_week,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      room: s.room || "",
      notes: s.notes || "",
    });
    setScheduleDialog(true);
  };

  const getTeacher = useCallback((id: string) => teachers.find((t) => t.user_id === id), [teachers]);
  const getTeacherName = useCallback((id: string) => getTeacher(id)?.full_name || "—", [getTeacher]);
  const getSubjectName = useCallback((id: string) => subjects.find((s) => s.id === id)?.name || "—", [subjects]);
  const getSubjectColor = (id: string) => subjects.find((s) => s.id === id)?.color || "#5B6CF9";
  const getClassName = useCallback((id: string) => classes.find((c) => c.id === id)?.name || "—", [classes]);
  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // Tailwind-friendly readable text on colored bg: convert hex to rgba helpers
  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const filteredSchedules = useMemo(() => {
    let filtered = schedules;
    if (selectedDay !== "all") filtered = filtered.filter((s) => s.day_of_week === parseInt(selectedDay));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        getTeacherName(s.teacher_id).toLowerCase().includes(q) ||
        getSubjectName(s.subject_id).toLowerCase().includes(q) ||
        getClassName(s.class_id).toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [schedules, selectedDay, searchQuery, getTeacherName, getSubjectName, getClassName]);

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups: Record<number, Schedule[]> = {};
    filteredSchedules.forEach((s) => {
      if (!groups[s.day_of_week]) groups[s.day_of_week] = [];
      groups[s.day_of_week].push(s);
    });
    return groups;
  }, [filteredSchedules]);

  const scheduleEditor = isAdmin && <ScheduleEditor onCreateSubject={createSubjectInline} open={scheduleDialog} onOpenChange={(open) => { setScheduleDialog(open); if (!open) { setEditingSchedule(null); resetForm(); } }} editing={!!editingSchedule} saving={savingSchedule} value={formData} onChange={setFormData} onSave={saveSchedule} teachers={teachers} subjects={subjects} classes={classes} />;

  const bulkEditor = isAdmin && <BulkScheduleEditor onCreateSubject={createSubjectInline} open={bulkDialog} onOpenChange={setBulkDialog} saving={savingSchedule} classes={classes} teachers={teachers} subjects={subjects} onSave={saveBulk} />;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader icon={CalendarDays} title="Jadwal Mengajar" subtitle="Memuat data..." />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (loadError) return <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">{loadError}</p><Button variant="outline" className="mt-4" onClick={fetchData}>Coba lagi</Button></Card>;

  if (view === "class") return <><ClassScheduleBoard classes={classes} schedules={schedules} subjects={subjects} teachers={teachers} isAdmin={isAdmin} onAdd={(defaults) => { setEditingSchedule(null); setFormData({ teacher_id: "", subject_id: "", class_id: "", day_of_week: 0, start_time: "07:00", end_time: "08:00", room: "", notes: "", ...defaults }); setScheduleDialog(true); }} onEdit={openEditSchedule} onDelete={deleteSchedule} onBulk={() => setBulkDialog(true)} />{scheduleEditor}{bulkEditor}</>;

  return (
    <div className="space-y-4">
      {scheduleEditor}{bulkEditor}
      <PageHeader icon={CalendarDays} title="Jadwal Lengkap" subtitle="Seluruh jadwal mengajar sekolah, dikelompokkan berdasarkan hari." />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full max-w-md", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
          <TabsTrigger value="schedules" className="gap-1.5"><Calendar className="h-4 w-4" />Jadwal</TabsTrigger>
          {isAdmin && <TabsTrigger value="subjects" className="gap-1.5"><BookOpen className="h-4 w-4" />Mata Pelajaran</TabsTrigger>}
        </TabsList>

        {/* ===== SCHEDULES TAB ===== */}
        <TabsContent value="schedules" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {isAdmin && <Button variant="outline" onClick={()=>setBulkDialog(true)}>Tambah massal</Button>}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari guru, mapel, kelas..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Hari" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Hari</SelectItem>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {isAdmin && <Button className="gap-1.5" onClick={() => { setEditingSchedule(null); resetForm(); setScheduleDialog(true); }}><Plus className="h-4 w-4" />Tambah Jadwal</Button>}

          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            <Card className="border-0 shadow-card rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
              <div className="min-w-0"><p className="text-xl sm:text-2xl font-bold leading-none">{schedules.length}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">Total Jadwal</p></div>
            </CardContent></Card>
            <Card className="border-0 shadow-card rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0"><UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" /></div>
              <div className="min-w-0"><p className="text-xl sm:text-2xl font-bold leading-none">{new Set(schedules.map((s) => s.teacher_id)).size}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">Guru Terjadwal</p></div>
            </CardContent></Card>
            <Card className="border-0 shadow-card rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" /></div>
              <div className="min-w-0"><p className="text-xl sm:text-2xl font-bold leading-none">{subjects.filter((s) => s.is_active).length}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">Mata Pelajaran</p></div>
            </CardContent></Card>
            <Card className="border-0 shadow-card rounded-2xl"><CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0"><GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" /></div>
              <div className="min-w-0"><p className="text-xl sm:text-2xl font-bold leading-none">{new Set(schedules.map((s) => s.class_id)).size}</p><p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">Kelas Terjadwal</p></div>
            </CardContent></Card>
          </div>

          {/* Schedule by day */}
          {Object.keys(groupedByDay).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada jadwal</p>
              <p className="text-sm">Tambahkan jadwal mengajar untuk guru</p>
            </CardContent></Card>
          ) : (
            Object.entries(groupedByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
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
                    {items.map((s) => {
                      const isMe = s.teacher_id === user?.id;
                      const subjColor = getSubjectColor(s.subject_id);
                      const teacher = getTeacher(s.teacher_id);
                      const teacherName = getTeacherName(s.teacher_id);
                      return (
                        <div key={s.id} className="flex items-stretch gap-2.5 sm:gap-3">
                          {/* Time column */}
                          <div className="w-12 sm:w-14 shrink-0 pt-2 text-right">
                            <p className="font-mono text-[11px] sm:text-xs font-semibold text-foreground leading-none">
                              {s.start_time.slice(0, 5)}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-none">
                              {s.end_time.slice(0, 5)}
                            </p>
                          </div>

                          {/* Schedule pill — neutral surface, color only as accent */}
                          <div
                            className={cn(
                              "relative flex-1 min-w-0 rounded-2xl px-3 sm:px-3.5 py-2.5 sm:py-3 bg-card border border-border/60 transition-all hover:shadow-md hover:border-border",
                              isMe && "ring-2 ring-primary/30 border-primary/40 bg-primary/[0.03]"
                            )}
                          >
                            {/* Left accent bar (subject color) */}
                            <span
                              className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                              style={{ backgroundColor: subjColor }}
                              aria-hidden
                            />

                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Title + meta — single line */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: subjColor }}
                                    aria-hidden
                                  />
                                  <p className="text-[13px] sm:text-sm font-semibold text-foreground truncate">
                                    {getSubjectName(s.subject_id)}
                                  </p>
                                  {isMe && (
                                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] h-4 px-1.5 shrink-0 hover:bg-primary/20">
                                      Anda
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10.5px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                                  {getClassName(s.class_id)}
                                  {s.room && <> · {s.room}</>}
                                  <> · {teacherName}</>
                                </p>
                              </div>

                              {/* Teacher avatar */}
                              <div
                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-background overflow-hidden bg-muted flex items-center justify-center shrink-0"
                                title={teacherName}
                              >
                                {teacher?.avatar_url ? (
                                  <img
                                    src={teacher.avatar_url}
                                    alt={teacherName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
                                    {getInitials(teacherName)}
                                  </span>
                                )}
                              </div>

                              {/* Admin actions */}
                              {isAdmin && (
                                <div className="flex gap-0.5 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg"
                                    onClick={() => openEditSchedule(s)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                                    onClick={() => deleteSchedule(s.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
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
        </TabsContent>

        {/* ===== SUBJECTS TAB ===== */}
        {isAdmin && (
          <TabsContent value="subjects" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Daftar Mata Pelajaran</h3>
              <Dialog open={subjectDialog} onOpenChange={(o) => { setSubjectDialog(o); if (!o) { setEditingSubject(null); setSubjectForm({ name: "", code: "", color: "#3B82F6" }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Tambah Mapel</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingSubject ? "Edit Mapel" : "Tambah Mata Pelajaran"}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Nama Mapel *</Label><Input placeholder="Contoh: Matematika" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} /></div>
                    <div><Label>Kode</Label><Input placeholder="Contoh: MTK" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} /></div>
                    <div><Label>Warna Label</Label><Input type="color" className="h-10 w-20 p-1" value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} /></div>
                    <Button onClick={saveSubject} className="w-full">{editingSubject ? "Simpan" : "Tambah"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((s) => (
                <Card key={s.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: s.color || "#3B82F6" }} />
                  <CardContent className="p-4 pl-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      {s.code && <p className="text-xs text-muted-foreground">Kode: {s.code}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingSubject(s); setSubjectForm({ name: s.name, code: s.code || "", color: s.color || "#3B82F6" }); setSubjectDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSubject(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {subjects.length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Belum ada mata pelajaran</p>
                </CardContent></Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
