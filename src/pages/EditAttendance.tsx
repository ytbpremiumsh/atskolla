import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/PageHeader";
import { sendManualAttendanceWA } from "@/lib/sendManualAttendanceWA";
import {
  Pencil, Save, Loader2, GraduationCap, Users, CheckCircle2, XCircle, AlertTriangle,
  LogIn, LogOut, CalendarDays, Search,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa",
};
const STATUS_COLORS: Record<string, string> = {
  hadir: "hsl(152, 69%, 40%)",
  izin: "hsl(38, 92%, 50%)",
  sakit: "hsl(210, 70%, 50%)",
  alfa: "hsl(0, 72%, 51%)",
};

const EditAttendance = () => {
  const { profile, roles } = useAuth();
  const [attendanceType, setAttendanceType] = useState("datang");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [editChanges, setEditChanges] = useState<Record<string, string>>({});
  const [newEntries, setNewEntries] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isTeacherOnly = roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("staff");

  // Fetch classes and students
  useEffect(() => {
    if (!profile?.school_id) { setLoading(false); return; }
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
      supabase.from("students").select("id, name, class, student_id").eq("school_id", profile.school_id),
    ]).then(([classRes, studentRes]) => {
      setClasses(classRes.data || []);
      setStudents(studentRes.data || []);
    });
  }, [profile?.school_id]);

  // Fetch attendance logs for selected date
  const fetchLogs = useCallback(async () => {
    if (!profile?.school_id || !selectedDate) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("school_id", profile.school_id)
        .eq("date", selectedDate)
        .eq("attendance_type", attendanceType)
        .order("created_at", { ascending: true });
      setLogs(data || []);
      setEditChanges({});
      setNewEntries({});
    } finally {
      setLoading(false);
    }
  }, [profile?.school_id, selectedDate, attendanceType]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalChanges = Object.keys(editChanges).length + Object.keys(newEntries).length;

  const saveChanges = async () => {
    if (totalChanges === 0) return;
    setSaving(true);
    try {
      const waTasks: Promise<any>[] = [];
      // Update existing logs
      for (const [logId, newStatus] of Object.entries(editChanges)) {
        await supabase.from("attendance_logs").update({ status: newStatus }).eq("id", logId);
        const log = logs.find(l => l.id === logId);
        if (log && newStatus === "hadir") {
          waTasks.push(sendManualAttendanceWA({
            schoolId: profile!.school_id!,
            studentId: log.student_id,
            status: newStatus,
            attendanceType: attendanceType as "datang" | "pulang",
            date: selectedDate,
            timeStr: log.time || new Date().toTimeString().slice(0, 8),
            recordedBy: "Manual Admin",
          }));
        }
      }
      // Insert new entries for students without logs
      const now = new Date().toTimeString().slice(0, 8);
      for (const [studentId, status] of Object.entries(newEntries)) {
        await supabase.from("attendance_logs").insert({
          school_id: profile!.school_id!,
          student_id: studentId,
          date: selectedDate,
          status,
          time: now,
          method: "manual",
          attendance_type: attendanceType,
        });
        if (status === "hadir") {
          waTasks.push(sendManualAttendanceWA({
            schoolId: profile!.school_id!,
            studentId,
            status,
            attendanceType: attendanceType as "datang" | "pulang",
            date: selectedDate,
            timeStr: now,
            recordedBy: "Manual Admin",
          }));
        }
      }
      if (waTasks.length > 0) await Promise.allSettled(waTasks);
      toast.success(`${totalChanges} status berhasil diperbarui`);
      setEditChanges({});
      setNewEntries({});
      fetchLogs();
    } catch {
      toast.error("Gagal menyimpan perubahan");
    }
    setSaving(false);
  };

  const classNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => set.add(s.class));
    return Array.from(set).sort();
  }, [students]);

  // Merge students with logs - show ALL students, not just those with logs
  const mergedData = useMemo(() => {
    let filteredStudents = students;
    if (selectedClass !== "all") {
      filteredStudents = filteredStudents.filter(s => s.class === selectedClass);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredStudents = filteredStudents.filter(s =>
        s.name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q)
      );
    }

    // Sort by class then name
    filteredStudents = [...filteredStudents].sort((a, b) => {
      const classCompare = a.class.localeCompare(b.class);
      return classCompare !== 0 ? classCompare : a.name.localeCompare(b.name);
    });

    return filteredStudents.map(student => {
      const log = logs.find(l => l.student_id === student.id);
      return { student, log };
    });
  }, [students, logs, selectedClass, searchQuery]);

  // Stats for selected class/date
  const stats = useMemo(() => {
    const s = { total: mergedData.length, hadir: 0, izin: 0, sakit: 0, alfa: 0, belum: 0 };
    mergedData.forEach(({ student, log }) => {
      const newStatus = newEntries[student.id];
      if (!log && !newStatus) { s.belum++; return; }
      const status = newStatus || (log ? (editChanges[log.id] || log.status) : null);
      if (status && status in s) s[status as keyof typeof s]++;
      else s.belum++;
    });
    return s;
  }, [mergedData, editChanges, newEntries]);

  const typeLabel = attendanceType === "pulang" ? "Kepulangan" : "Kehadiran";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Pencil}
        title="Riwayat Absensi"
        subtitle="Kelola dan perbarui data absensi harian per kelas"
      />

      {/* Attendance Type Tabs */}
      <Tabs value={attendanceType} onValueChange={(v) => { setAttendanceType(v); setEditChanges({}); }}>
        <TabsList className="bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="datang" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-[#5B6CF9] data-[state=active]:text-white">
            <LogIn className="h-3.5 w-3.5" /> Kehadiran (Datang)
          </TabsTrigger>
          <TabsTrigger value="pulang" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-[#5B6CF9] data-[state=active]:text-white">
            <LogOut className="h-3.5 w-3.5" /> Kepulangan (Pulang)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#5B6CF9]/5 to-[#4c5ded]/5 border-b border-border/50 p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-[#5B6CF9]" />
            Filter Data {typeLabel}
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Tanggal</label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 w-auto rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Kelas</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[160px] h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cari Siswa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nama / NIS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[180px] pl-9 rounded-lg text-sm"
                />
              </div>
            </div>
            {totalChanges > 0 && (
              <Button onClick={saveChanges} disabled={saving} size="sm" className="rounded-lg bg-[#5B6CF9] hover:bg-[#4c5ded] text-white h-9 gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan ({totalChanges})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-foreground", bg: "bg-secondary" },
          { label: "Hadir", value: stats.hadir, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Izin", value: stats.izin, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Sakit", value: stats.sakit, icon: XCircle, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-500/10" },
          { label: "Alfa", value: stats.alfa, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-500/10" },
          { label: "Belum", value: stats.belum, icon: Users, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-500/10" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-lg rounded-2xl">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class Cards Grid */}
      {selectedClass === "all" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {classNames.map(cls => {
            const classStudents = students.filter(s => s.class === cls);
            const classLogs = logs.filter(l => {
              const st = students.find(s => s.id === l.student_id);
              return st?.class === cls;
            });
            const classStats = { total: classStudents.length, hadir: 0, izin: 0, sakit: 0, alfa: 0, belum: 0 };
            classLogs.forEach(l => {
              const status = editChanges[l.id] || l.status;
              if (status in classStats) classStats[status as keyof typeof classStats]++;
            });
            classStats.belum = classStats.total - classLogs.length;
            const rate = classStats.total > 0 ? Math.round((classStats.hadir / classStats.total) * 100) : 0;

            return (
              <Card
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className="border-0 shadow-lg rounded-2xl cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center shadow-md">
                      <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{cls}</p>
                      <p className="text-[10px] text-muted-foreground">{classStats.total} siswa</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground">Kehadiran</span>
                      <span className={`text-xs font-bold ${rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>{rate}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[
                        { key: "hadir", label: "H", val: classStats.hadir, color: "bg-emerald-500 text-white" },
                        { key: "izin", label: "I", val: classStats.izin, color: "bg-amber-500 text-white" },
                        { key: "sakit", label: "S", val: classStats.sakit, color: "bg-sky-500 text-white" },
                        { key: "alfa", label: "A", val: classStats.alfa, color: "bg-red-500 text-white" },
                      ].map(b => (
                        <span key={b.key} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${b.color}`}>
                          {b.label}:{b.val}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected class indicator */}
      {selectedClass !== "all" && (
        <div className="flex items-center gap-2">
          <Badge className="bg-[#5B6CF9]/10 text-[#5B6CF9] border-[#5B6CF9]/30 text-xs font-bold gap-1.5 px-3 py-1.5 rounded-lg">
            <GraduationCap className="h-3.5 w-3.5" /> Kelas: {selectedClass}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setSelectedClass("all")} className="text-xs text-muted-foreground hover:text-foreground rounded-lg h-8">
            ← Semua Kelas
          </Button>
        </div>
      )}

      {/* Attendance Table */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#5B6CF9]/5 to-[#4c5ded]/5 border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[#5B6CF9]" />
            Data {typeLabel} — {new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h3>
          <span className="text-xs text-muted-foreground">{mergedData.length} siswa</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#5B6CF9]" /></div>
          ) : mergedData.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Tidak ada siswa</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Pilih kelas lain</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">No</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Siswa</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">NIS</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Kelas</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Waktu</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Ubah Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedData.map(({ student, log }, idx) => {
                  const newStatus = newEntries[student.id];
                  const currentStatus = newStatus || (log ? (editChanges[log.id] || log.status) : null);
                  const statusColor = currentStatus ? STATUS_COLORS[currentStatus] || STATUS_COLORS.hadir : "";
                  const isChanged = (log && editChanges[log.id] && editChanges[log.id] !== log.status) || !!newStatus;
                  return (
                    <TableRow key={student.id} className={`${isChanged ? "bg-[#5B6CF9]/5" : ""} hover:bg-muted/20 transition-colors`}>
                      <TableCell className="text-xs text-muted-foreground py-2.5 w-10">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-semibold py-2.5">{student.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono py-2.5">{student.student_id}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-semibold rounded-md">{student.class}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono py-2.5">{log?.time?.slice(0, 5) || "—"}</TableCell>
                      <TableCell className="py-2.5">
                        {currentStatus ? (
                          <Badge
                            className="text-[10px] font-bold border-0 rounded-full px-2.5 text-white"
                            style={{ backgroundColor: statusColor }}
                          >
                            {STATUS_LABELS[currentStatus] || currentStatus}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-semibold rounded-full px-2.5">
                            Belum
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex gap-1">
                          {["hadir", "izin", "sakit", "alfa"].map(s => (
                            <button
                              key={s}
                              onClick={() => {
                                if (log) {
                                  // Has existing log — edit it
                                  setEditChanges(prev => {
                                    const next = { ...prev };
                                    if (s === log.status) { delete next[log.id]; } else { next[log.id] = s; }
                                    return next;
                                  });
                                  // Clear newEntries for this student if any
                                  setNewEntries(prev => { const n = { ...prev }; delete n[student.id]; return n; });
                                } else {
                                  // No log — create new entry
                                  setNewEntries(prev => {
                                    const next = { ...prev };
                                    if (next[student.id] === s) { delete next[student.id]; } else { next[student.id] = s; }
                                    return next;
                                  });
                                }
                              }}
                              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                                currentStatus === s
                                  ? "text-white shadow-sm scale-105"
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                              style={currentStatus === s ? { backgroundColor: STATUS_COLORS[s] } : {}}
                            >
                              {s === "hadir" ? "H" : s === "izin" ? "I" : s === "sakit" ? "S" : "A"}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EditAttendance;
