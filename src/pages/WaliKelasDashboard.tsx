import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Users, UserCheck, Clock, GraduationCap, Search,
  AlertTriangle, Thermometer, FileText, Activity, Trophy, Medal, Flame, TrendingUp,
  ClipboardCheck, BarChart3, History as HistoryIcon, Download, LayoutGrid, Home, CalendarCheck2,
} from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";

const STATUS_LABELS: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa", belum: "Belum" };
const STATUS_BG: Record<string, string> = {
  hadir: "bg-success/10 text-success border-success/20",
  izin: "bg-warning/10 text-warning border-warning/20",
  sakit: "bg-blue-50 text-blue-500 border-blue-200",
  alfa: "bg-destructive/10 text-destructive border-destructive/20",
  belum: "bg-muted text-muted-foreground border-border",
};

interface StudentWithAttendance {
  id: string;
  name: string;
  student_id: string;
  class: string;
  photo_url: string | null;
  status: string;
  time: string | null;
  method: string | null;
}

const RANK_STYLES = [
  { icon: Trophy, bg: "bg-yellow-100 dark:bg-yellow-900/30", color: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-300 dark:border-yellow-700", badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white" },
  { icon: Medal, bg: "bg-slate-100 dark:bg-slate-800/50", color: "text-slate-500 dark:text-slate-300", border: "border-slate-300 dark:border-slate-600", badge: "bg-gradient-to-r from-slate-400 to-slate-500 text-white" },
  { icon: Medal, bg: "bg-orange-50 dark:bg-orange-900/20", color: "text-orange-600 dark:text-orange-400", border: "border-orange-300 dark:border-orange-700", badge: "bg-gradient-to-r from-orange-400 to-orange-600 text-white" },
];

const WaliKelasDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [classRanking, setClassRanking] = useState<{ name: string; rate: number; hadir: number; total: number; students: number }[]>([]);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const fetchAssignments = async () => {
      const { data } = await supabase
        .from("class_teachers")
        .select("class_name, school_id")
        .eq("user_id", user.id);
      setAssignments(data || []);
    };
    fetchAssignments();
  }, [user]);

  useEffect(() => {
    if (assignments.length === 0) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const schoolId = assignments[0].school_id;
        const classNames = assignments.map((a) => a.class_name);

        const { data: studentData } = await supabase
          .from("students").select("id, name, student_id, class, photo_url")
          .eq("school_id", schoolId).in("class", classNames).order("class").order("name");

        if (!studentData || studentData.length === 0) {
          setStudents([]);
          return;
        }

        const studentIds = studentData.map((s) => s.id);

        // Today's attendance
        const { data: attendanceData } = await supabase
          .from("attendance_logs").select("student_id, status, time, method")
          .eq("school_id", schoolId).eq("date", today).in("student_id", studentIds);

        const attendanceMap = new Map<string, { status: string; time: string; method: string }>();
        (attendanceData || []).forEach((a) => {
          attendanceMap.set(a.student_id, { status: a.status, time: a.time, method: a.method });
        });

        const merged: StudentWithAttendance[] = studentData.map((s) => {
          const att = attendanceMap.get(s.id);
          return { ...s, status: att?.status || "belum", time: att?.time || null, method: att?.method || null };
        });
        setStudents(merged);

        // Fetch ALL school classes for ranking (30 days)
        const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const [allStudentsRes, allLogsRes] = await Promise.all([
          supabase.from("students").select("id, class").eq("school_id", schoolId),
          supabase.from("attendance_logs")
            .select("student_id, status, students(class)")
            .eq("school_id", schoolId)
            .gte("date", thirtyAgo)
            .lte("date", today)
            .limit(5000),
        ]);

        const allSchoolStudents = allStudentsRes.data || [];
        const allLogs = allLogsRes.data || [];

        // Count students per class
        const classStudentCount: Record<string, number> = {};
        allSchoolStudents.forEach((s: any) => {
          classStudentCount[s.class] = (classStudentCount[s.class] || 0) + 1;
        });

        // Calculate ranking
        const byClass: Record<string, { hadir: number; total: number }> = {};
        allLogs.forEach((l: any) => {
          const cls = (l.students as any)?.class || "?";
          if (!byClass[cls]) byClass[cls] = { hadir: 0, total: 0 };
          byClass[cls].total++;
          if (l.status === "hadir") byClass[cls].hadir++;
        });

        const ranking = Object.entries(byClass).map(([cls, d]) => ({
          name: cls,
          rate: d.total > 0 ? Math.round((d.hadir / d.total) * 100) : 0,
          hadir: d.hadir,
          total: d.total,
          students: classStudentCount[cls] || 0,
        })).sort((a, b) => b.rate - a.rate);

        setClassRanking(ranking);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [assignments, today]);

  const stats = useMemo(() => {
    const total = students.length;
    const hadir = students.filter((s) => s.status === "hadir").length;
    const izin = students.filter((s) => s.status === "izin").length;
    const sakit = students.filter((s) => s.status === "sakit").length;
    const alfa = students.filter((s) => s.status === "alfa").length;
    const belum = students.filter((s) => s.status === "belum").length;
    return { total, hadir, izin, sakit, alfa, belum };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) || s.class.toLowerCase().includes(q)
    );
  }, [students, search]);

  const percentage = stats.total ? Math.round(((stats.total - stats.belum) / stats.total) * 100) : 0;
  const classNames = assignments.map((a) => a.class_name);

  // Find my class rank
  const myClassRanks = classRanking
    .map((c, i) => ({ ...c, rank: i + 1 }))
    .filter((c) => classNames.includes(c.name));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Memuat data...</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={GraduationCap} title="Dashboard Wali Kelas" subtitle="Belum ada wali kelas yang ditugaskan" />
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Anda belum ditugaskan sebagai wali kelas.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Hubungi admin sekolah untuk penugasan.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRateColor = (rate: number) => {
    if (rate >= 85) return "text-success";
    if (rate >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <>
      {/* ============ MOBILE — Fintech Payou-style (primary) ============ */}
      <WaliKelasMobileDashboard
        stats={stats}
        percentage={percentage}
        classNames={classNames}
        myClassRanks={myClassRanks}
        students={filteredStudents}
        search={search}
        setSearch={setSearch}
      />

      {/* ============ DESKTOP / TABLET (md+) ============ */}
      <div className="hidden md:block space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Dashboard Wali Kelas"
        subtitle={`Kelas: ${classNames.join(", ")} • ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="dashboard" className="flex-1 sm:flex-none gap-1.5">
            <Activity className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1 sm:flex-none gap-1.5">
            <Trophy className="h-4 w-4" /> Peringkat Kelas
          </TabsTrigger>
        </TabsList>

        {/* ===== DASHBOARD TAB ===== */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {[
              { icon: Users, value: stats.total, label: "Total Siswa", color: "text-primary", bg: "bg-primary/10" },
              { icon: UserCheck, value: stats.hadir, label: "Hadir", color: "text-success", bg: "bg-success/10" },
              { icon: FileText, value: stats.izin, label: "Izin", color: "text-warning", bg: "bg-warning/10" },
              { icon: Thermometer, value: stats.sakit, label: "Sakit", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: AlertTriangle, value: stats.alfa, label: "Alfa", color: "text-destructive", bg: "bg-destructive/10" },
              { icon: Clock, value: stats.belum, label: "Belum", color: "text-muted-foreground", bg: "bg-muted" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className={`text-xl sm:text-2xl font-extrabold leading-tight ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Progress */}
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Progress Absensi Hari Ini</span>
                </div>
                <span className="text-2xl font-extrabold text-primary">{percentage}%</span>
              </div>
              <div className="h-4 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.2 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{stats.total - stats.belum} dari {stats.total} siswa sudah diabsen</p>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>

          {/* Student list */}
          <Card className="border-0 shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-sm text-foreground">Daftar Siswa & Status Absensi</h2>
            </div>
            <div className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Tidak ada siswa ditemukan</div>
              ) : (
                filteredStudents.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${
                      s.status === "hadir" ? "bg-success/15 text-success" :
                      s.status === "izin" ? "bg-warning/15 text-warning" :
                      s.status === "sakit" ? "bg-blue-50 text-blue-500" :
                      s.status === "alfa" ? "bg-destructive/15 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.class} • NIS: {s.student_id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className={`text-[10px] ${STATUS_BG[s.status] || ""}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </Badge>
                      {s.time && (
                        <span className="text-[10px] font-mono text-muted-foreground">{s.time.slice(0, 5)}</span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ===== RANKING TAB ===== */}
        <TabsContent value="ranking" className="space-y-6 mt-4">
          {classRanking.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-10 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Belum ada data untuk peringkat kelas.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* My Class Position */}
              {myClassRanks.length > 0 && (
                <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 via-background to-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Posisi Kelas Anda</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {myClassRanks.map((mc) => (
                        <div key={mc.name} className="flex items-center gap-3 bg-background rounded-xl p-3 border border-primary/20 shadow-sm">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xl font-black text-primary">#{mc.rank}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">{mc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-lg font-extrabold ${getRateColor(mc.rate)}`}>{mc.rate}%</span>
                              <span className="text-[10px] text-muted-foreground">dari {classRanking.length} kelas</span>
                            </div>
                          </div>
                          {mc.rank <= 3 && (
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${RANK_STYLES[mc.rank - 1]?.badge || ""}`}>
                              #{mc.rank}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bar Chart */}
              <Card className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Perbandingan Kehadiran Semua Kelas</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Data 30 hari terakhir • Kelas Anda ditandai warna berbeda</p>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classRanking} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip formatter={(val: number) => `${val}%`} />
                        <Bar
                          dataKey="rate"
                          name="Kehadiran %"
                          radius={[0, 6, 6, 0]}
                          fill="hsl(var(--muted-foreground))"
                          shape={(props: any) => {
                            const isMyClass = classNames.includes(props.name);
                            const fill = isMyClass ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)";
                            return (
                              <rect
                                x={props.x} y={props.y}
                                width={props.width} height={props.height}
                                fill={fill}
                                rx={6} ry={6}
                              />
                            );
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Full Ranking List */}
              <Card className="border-0 shadow-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">Papan Peringkat Kelas</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Peringkat berdasarkan persentase kehadiran 30 hari terakhir</p>
                </div>
                <div className="divide-y divide-border">
                  {classRanking.map((cls, i) => {
                    const isMyClass = classNames.includes(cls.name);
                    const style = i < 3 ? RANK_STYLES[i] : null;
                    return (
                      <motion.div
                        key={cls.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`flex items-center gap-3 p-3.5 transition-colors ${
                          isMyClass ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-secondary/30"
                        }`}
                      >
                        {/* Rank */}
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                          style ? `${style.bg} ${style.color}` : "bg-muted text-muted-foreground"
                        }`}>
                          <span>#{i + 1}</span>
                        </div>

                        {/* Class Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm truncate ${isMyClass ? "text-primary" : "text-foreground"}`}>{cls.name}</p>
                            {isMyClass && (
                              <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0">
                                Kelas Anda
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{cls.students} siswa • {cls.hadir}/{cls.total} hadir</p>
                        </div>

                        {/* Rate */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24 hidden sm:block">
                            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${
                                  cls.rate >= 85 ? "bg-success" : cls.rate >= 70 ? "bg-warning" : "bg-destructive"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${cls.rate}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 }}
                              />
                            </div>
                          </div>
                          <span className={`text-lg font-extrabold min-w-[48px] text-right ${getRateColor(cls.rate)}`}>
                            {cls.rate}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};

// ============================================================
// MOBILE — Fintech Payou-style for Wali Kelas
// ============================================================
function WaliKelasMobileDashboard({
  stats, percentage, classNames, myClassRanks, students, search, setSearch,
}: {
  stats: any; percentage: number; classNames: string[];
  myClassRanks: { name: string; rank: number; rate: number }[];
  students: any[]; search: string; setSearch: (s: string) => void;
}) {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const myBest = myClassRanks[0];

  return (
    <div className="md:hidden -mx-4 -mt-4 pb-32 min-h-screen bg-gradient-to-b from-[#5B6CF9]/10 via-background to-background">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Wali Kelas</p>
        <p className="text-sm font-bold truncate max-w-[260px]">{classNames.join(", ") || "Kelas Saya"}</p>
      </div>

      <div className="px-4 space-y-4">
        {/* HERO CARD — primary gradient */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#5B6CF9] via-[#5B6CF9] to-[#4c5ded] text-white p-5 shadow-[0_20px_50px_-15px_rgba(91,108,249,0.55)]">
          <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 25% 0%, white 1.2px, transparent 1.2px), radial-gradient(circle at 75% 100%, white 1.2px, transparent 1.2px)", backgroundSize: "28px 28px" }} />

          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Progress Absensi</p>
              <p className="text-[11px] text-white/80 truncate">{today}</p>
            </div>
          </div>

          <div className="relative mt-4">
            <p className="text-[44px] font-extrabold tracking-tight leading-none">{percentage}<span className="text-2xl">%</span></p>
            <p className="text-[11px] text-white/80 mt-1.5">
              {stats.total - stats.belum} dari {stats.total} siswa sudah diabsen
            </p>
            <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          {/* Ranking pill moved here directly — quick actions removed (duplicate dengan bottom nav) */}

          {/* Ranking pill */}
          {myBest && (
            <div className="relative mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25 text-white font-semibold text-xs">
              <Trophy className="h-3.5 w-3.5" />
              Peringkat Kelas Anda: #{myBest.rank} • {myBest.rate}%
            </div>
          )}
        </div>

        {/* Stats grid — ringkas 4 status inti */}
        <div className="grid grid-cols-2 min-[400px]:grid-cols-4 gap-2.5">
          <MiniStat icon={UserCheck} label="Hadir" value={stats.hadir} gradient="from-emerald-500 to-teal-600" />
          <MiniStat icon={FileText} label="Izin" value={stats.izin} gradient="from-amber-500 to-orange-600" />
          <MiniStat icon={Thermometer} label="Sakit" value={stats.sakit} gradient="from-sky-500 to-blue-600" />
          <MiniStat icon={AlertTriangle} label="Alfa" value={stats.alfa} gradient="from-rose-500 to-red-600" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-2xl bg-white dark:bg-card ring-1 ring-border/60 border-0" />
        </div>

        {/* Student list */}
        <div className="rounded-2xl bg-white dark:bg-card ring-1 ring-border/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-[#5B6CF9]/10 to-[#4c5ded]/5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#5B6CF9]" />
              <p className="text-xs font-bold text-foreground">Daftar Siswa</p>
            </div>
            <span className="text-[10px] font-semibold text-[#5B6CF9]">{students.length} siswa</span>
          </div>
          {students.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Tidak ada siswa</p>
          ) : (
            <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
              {students.slice(0, 30).map((s) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${
                    s.status === "hadir" ? "bg-emerald-100 text-emerald-700" :
                    s.status === "izin" ? "bg-amber-100 text-amber-700" :
                    s.status === "sakit" ? "bg-sky-100 text-sky-700" :
                    s.status === "alfa" ? "bg-rose-100 text-rose-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {s.photo_url ? <img src={s.photo_url} alt="" className="h-full w-full rounded-full object-cover" /> : (s.name || "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.class} • NIS: {s.student_id}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] capitalize shrink-0">{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating bottom nav */}
      <nav className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
        <div className="pointer-events-auto relative flex items-center gap-1 bg-white/95 dark:bg-card/95 backdrop-blur-xl rounded-full px-2 py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] ring-1 ring-border/60 max-w-md w-full">
          <NavBtn icon={Home} label="Beranda" active color="#5B6CF9" onClick={() => navigate("/wali-kelas-dashboard")} />
          <NavBtn icon={ClipboardCheck} label="Absensi" color="#10B981" onClick={() => navigate("/wali-kelas-attendance")} />

          <Sheet>
            <SheetTrigger asChild>
              <button
                className="relative -mt-8 mx-1 h-14 w-14 rounded-full bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] text-white flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(91,108,249,0.7)] ring-4 ring-background transition-transform active:scale-95 hover:scale-105 shrink-0"
                aria-label="Menu Lainnya"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-0 pb-8">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left">Menu Lainnya</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-3">
                <SheetTile icon={HistoryIcon} label="Riwayat" gradient="from-sky-500 to-blue-600" onClick={() => navigate("/wali-kelas-history")} />
                <SheetTile icon={Download} label="Export" gradient="from-violet-500 to-purple-600" onClick={() => navigate("/wali-kelas-export")} />
                <SheetTile icon={Trophy} label="Peringkat" gradient="from-yellow-500 to-amber-600" onClick={() => window.scrollTo({ top: 9999, behavior: "smooth" })} />
              </div>
            </SheetContent>
          </Sheet>

          <NavBtn icon={Users} label="Siswa" color="#10B981" onClick={() => navigate("/wali-kelas-students")} />
          <NavBtn icon={BarChart3} label="Rekap" color="#F59E0B" onClick={() => navigate("/wali-kelas-export")} />
        </div>
      </nav>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: number; gradient: string }) {
  return (
    <div className="rounded-2xl p-3 bg-white dark:bg-card ring-1 ring-border/60 shadow-sm">
      <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-1.5 shadow-sm`}>
        <Icon className="h-4 w-4 text-white" strokeWidth={2.3} />
      </div>
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
    </div>
  );
}

function ServiceTile({ icon: Icon, label, gradient, onClick }: { icon: any; label: string; gradient: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform">
      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)] group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.4)] transition-all ring-1 ring-white/30 bg-gradient-to-br ${gradient}`}>
        <Icon className="h-[22px] w-[22px] text-white" strokeWidth={2.3} />
      </div>
      <span className="text-[10px] font-semibold text-foreground/80 text-center leading-tight">{label}</span>
    </button>
  );
}

function NavBtn({ icon: Icon, label, active, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all ${active ? "scale-105" : ""}`}>
      <Icon className="h-5 w-5 transition-colors" style={{ color: active ? color : "hsl(var(--muted-foreground))" }} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[9px] font-semibold transition-colors" style={{ color: active ? color : "hsl(var(--muted-foreground))" }}>{label}</span>
    </button>
  );
}

function SheetTile({ icon: Icon, label, gradient, onClick }: { icon: any; label: string; gradient: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card hover:bg-muted/40 border border-border/40 transition-all active:scale-95">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-sm ${gradient}`}>
        <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
      </div>
      <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{label}</span>
    </button>
  );
}

export default WaliKelasDashboard;
