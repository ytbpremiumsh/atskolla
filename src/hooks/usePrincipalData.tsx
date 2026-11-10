import { createContext, useContext, useCallback, useEffect, useState, useRef, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, subMonths, endOfMonth } from "date-fns";
import { loadPrincipalSummary } from "@/lib/principalSummary";
import { fetchAllPages } from "@/lib/pagedQuery";
import { getLocalDateString, getLocalTimeString } from "@/lib/dateLocal";
import { toast } from "@/lib/toast";

export interface PrincipalStats {
  totalStudents: number;
  totalTeachers: number;
  teachersPresent: number;
  studentsPresent: number;
  activeClasses: number;
  attendanceRate: number;
}

export interface PrincipalData {
  loading: boolean;
  error: string | null;
  schoolName: string;
  now: Date;
  stats: PrincipalStats;
  liveClasses: any[];
  teacherAtt: { hadir: number; izin: number; sakit: number; alfa: number; belum: number };
  classAtt: Array<{ name: string; total: number; hadir: number }>;
  finance: { totalTagihan: number; totalPembayaran: number; tunggakan: number; saldoKas: number; danaPending: number; splitAllocated: number };
  settlements: any[];
  monthly: any[];
  ranking: any[];
  calendar: any[];
  timeline: any[];
  notifs: any[];
  leaves: any[];
  announcements: any[];
  pendingSettlements: any[];
  withdrawals: any[];
  refresh: () => Promise<void>;
  setLeaves: (v: any[]) => void;
}

const Ctx = createContext<PrincipalData | null>(null);



export function PrincipalDataProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const schoolId = profile?.school_id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [schoolName, setSchoolName] = useState("");
  const [stats, setStats] = useState<PrincipalStats>({
    totalStudents: 0, totalTeachers: 0, teachersPresent: 0,
    studentsPresent: 0, activeClasses: 0, attendanceRate: 0,
  });
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [teacherAtt, setTeacherAtt] = useState({ hadir: 0, izin: 0, sakit: 0, alfa: 0, belum: 0 });
  const [classAtt, setClassAtt] = useState<Array<{ name: string; total: number; hadir: number }>>([]);
  const [finance, setFinance] = useState({ totalTagihan: 0, totalPembayaran: 0, tunggakan: 0, saldoKas: 0, danaPending: 0, splitAllocated: 0 });
  const [settlements, setSettlements] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const loadingRequest = useRef<string | null>(null);
  const hasLoaded = useRef<string | null>(null);
  const activeSchool = useRef(schoolId);
  activeSchool.current = schoolId;

  const loadAll = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    if (loadingRequest.current === schoolId) return;
    loadingRequest.current = schoolId;
    if (hasLoaded.current !== schoolId) setLoading(true);
    try {
      const summary = await loadPrincipalSummary(schoolId);
      if (!summary?.finance) throw new Error("Ringkasan keuangan belum tersedia");
      if (activeSchool.current !== schoolId) return;
      const timezone = summary.timezone || "Asia/Jakarta";
      const today = getLocalDateString(timezone);
      const jsDay = new Date(today+"T12:00:00Z").getUTCDay();
      const dow = jsDay === 0 ? 6 : jsDay - 1; // Monday=0..Sunday=6 sesuai skema jadwal
      const hhmm = getLocalTimeString(timezone);


      const [
        schoolQ, studentsQ, classesQ, teachersQ, teacherLogsQ, studentLogsQ,
        schedulesQ, subjectAttQ, invoicesQ, cashQ, setlAllQ,
        leavesQ, annQ, setlPendingQ, holidaysQ,
      ] = await Promise.all([
        supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
        fetchAllPages(() => supabase.from("students").select("id, class").eq("school_id", schoolId)),
        fetchAllPages(() => supabase.from("classes").select("id, name").eq("school_id", schoolId)),
        fetchAllPages(() => supabase.from("user_roles").select("user_id").eq("role", "teacher" as any)),
        fetchAllPages(() => supabase.from("teacher_attendance_logs").select("user_id, status, attendance_type").eq("school_id", schoolId).eq("date", today)),
        fetchAllPages(() => supabase.from("attendance_logs").select("student_id, status, attendance_type, created_at").eq("school_id", schoolId).eq("date", today)),
        fetchAllPages(() => supabase.from("teaching_schedules").select("id, teacher_id, class_id, subject_id, start_time, end_time, day_of_week, is_active").eq("school_id", schoolId).eq("day_of_week", dow).eq("is_active", true)),
        fetchAllPages(() => supabase.from("subject_attendance").select("teaching_schedule_id, status").eq("school_id", schoolId).eq("date", today)),
        supabase.from("spp_invoices").select("total_amount, status, paid_at, created_at").eq("school_id", schoolId).eq("status", "paid").order("paid_at", { ascending: false }).limit(8),
        supabase.from("cash_book_entries").select("direction, amount, entry_date, category, description, created_at").eq("school_id", schoolId).order("entry_date", { ascending: false }).limit(8),
        supabase.from("spp_settlements").select("*").eq("school_id", schoolId).order("requested_at", { ascending: false }).limit(10),
        supabase.from("parent_leave_requests").select("*, students(name, class)").eq("school_id", schoolId).eq("status", "pending").order("created_at", { ascending: false }).limit(20),
        supabase.from("school_announcements").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(20),
        supabase.from("spp_settlements").select("*").eq("school_id", schoolId).eq("status", "pending").order("requested_at", { ascending: false }),
        supabase.from("school_holidays").select("*").eq("school_id", schoolId).gte("date", format(startOfMonth(new Date(today+"T12:00:00")), "yyyy-MM-dd")).lte("date", format(endOfMonth(new Date(today+"T12:00:00")), "yyyy-MM-dd")),
      ]);

      for (const response of [schoolQ, studentsQ, classesQ, teachersQ, teacherLogsQ, studentLogsQ, schedulesQ, subjectAttQ, invoicesQ, cashQ, setlAllQ, leavesQ, annQ, setlPendingQ, holidaysQ]) { if (response.error) throw response.error; }


      const students = studentsQ.data || [];
      const classes = classesQ.data || [];
      const teacherProfiles = await fetchAllPages(() => supabase.from("profiles").select("user_id").eq("school_id", schoolId));
      if (activeSchool.current !== schoolId) return;
      if (schoolQ.data?.name) setSchoolName(schoolQ.data.name);
      const schoolUsers = new Set(teacherProfiles.data.map((p: any) => p.user_id));
      const teacherIds = new Set((teachersQ.data || []).filter((r: any) => schoolUsers.has(r.user_id)).map((r: any) => r.user_id));

      const teacherLogsAll = (teacherLogsQ.data || []).filter((l: any) => teacherIds.has(l.user_id));
      const teacherArrival = teacherLogsAll.filter((l: any) => (l.attendance_type ?? "datang") === "datang");
      const tHadir = teacherArrival.filter((l: any) => l.status === "hadir").length;
      const tIzin = teacherArrival.filter((l: any) => l.status === "izin").length;
      const tSakit = teacherArrival.filter((l: any) => l.status === "sakit").length;
      const tAlfa = teacherArrival.filter((l: any) => l.status === "alfa").length;
      const tBelum = Math.max(0, teacherIds.size - (tHadir + tIzin + tSakit + tAlfa));
      setTeacherAtt({ hadir: tHadir, izin: tIzin, sakit: tSakit, alfa: tAlfa, belum: tBelum });

      const studentLogs = (studentLogsQ.data || []).filter((l: any) => (l.attendance_type ?? "datang") === "datang");
      const studentsById = new Map(students.map((s: any) => [s.id,s]));
      const counted = new Set<string>();
      const uniqStudentPresent = new Set(studentLogs.filter((l: any) => l.status === "hadir").map((l: any) => l.student_id)).size;
      const rate = students.length > 0 ? Math.round((uniqStudentPresent / students.length) * 100) : 0;

      const byClass: Record<string, { hadir: number; total: number }> = {};
      const classSize: Record<string, number> = {};
      students.forEach((s: any) => { classSize[s.class || "-"] = (classSize[s.class || "-"] || 0) + 1; });
      Object.keys(classSize).forEach(c => { byClass[c] = { hadir: 0, total: classSize[c] }; });
      studentLogs.forEach((l: any) => {
        const st: any = studentsById.get(l.student_id);
        const cls = st?.class || "-";
        if (!byClass[cls]) byClass[cls] = { hadir: 0, total: classSize[cls] || 0 };
        if (l.status === "hadir" && !counted.has(l.student_id)) { byClass[cls].hadir += 1; counted.add(l.student_id); }
      });
      setClassAtt(Object.entries(byClass).map(([name, v]) => ({ name, hadir: v.hadir, total: v.total })).sort((a, b) => a.name.localeCompare(b.name)));

      const schedules = schedulesQ.data || [];
      const subjectAtt = subjectAttQ.data || [];
      const liveNow = schedules.filter((s: any) => s.start_time <= hhmm && s.end_time > hhmm);
      const subjectIds = Array.from(new Set(schedules.map((s: any) => s.subject_id).filter(Boolean)));
      const classIds = Array.from(new Set(schedules.map((s: any) => s.class_id).filter(Boolean)));
      const teacherProfileIds = Array.from(new Set(schedules.map((s: any) => s.teacher_id).filter(Boolean)));

      const [subjMap, clsMap, tchMap] = await Promise.all([
        subjectIds.length ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] as any[], error: null }),
        classIds.length ? supabase.from("classes").select("id, name").in("id", classIds) : Promise.resolve({ data: [] as any[], error: null }),
        teacherProfileIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", teacherProfileIds) : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      for (const response of [subjMap, clsMap, tchMap]) { if (response.error) throw response.error; }
      if (activeSchool.current !== schoolId) return;
      const sMap = new Map((subjMap.data || []).map((x: any) => [x.id, x.name]));
      const cMap = new Map((clsMap.data || []).map((x: any) => [x.id, x.name]));
      const tMap = new Map((tchMap.data || []).map((x: any) => [x.user_id, x.full_name]));

      const nowD = new Date();
      const currentClasses: any[] = [];
      const upcomingClasses: any[] = [];
      const doneClasses: any[] = [];
      schedules.forEach((s: any) => {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        const startMin = sh * 60 + sm, endMin = eh * 60 + em, curMin = Number(hhmm.slice(0,2)) * 60 + Number(hhmm.slice(3,5));
        const progress = Math.min(100, Math.max(0, ((curMin - startMin) / (endMin - startMin)) * 100));
        const hadir = subjectAtt.filter((a: any) => a.teaching_schedule_id === s.id && a.status === "hadir").length;
        const className = cMap.get(s.class_id) || "-";
        const total = classSize[className] || 0;
        const journalFilled = subjectAtt.some((a: any) => a.teaching_schedule_id === s.id);
        const item = {
          id: s.id, subject: sMap.get(s.subject_id) || "Pelajaran",
          teacher: tMap.get(s.teacher_id) || "-",
          className, classId: s.class_id, hadir, total,
          startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5),
          progress, journalFilled,
          status: curMin < startMin ? "upcoming" : curMin >= endMin ? "done" : "live",
        };
        if (item.status === "live") currentClasses.push(item);
        else if (item.status === "upcoming") upcomingClasses.push(item);
        else doneClasses.push(item);
      });
      setLiveClasses([...currentClasses, ...upcomingClasses, ...doneClasses]);

      const activeClassIds = new Set(schedules.map((s: any) => s.class_id));

      setStats({
        totalStudents: students.length,
        totalTeachers: teacherIds.size,
        teachersPresent: tHadir,
        studentsPresent: uniqStudentPresent,
        activeClasses: activeClassIds.size,
        attendanceRate: rate,
      });

      const cashEntries = cashQ.data || [];
      setFinance(summary.finance);
      setSettlements(setlAllQ.data || []);
      setMonthly((summary.monthly || []).map((m: any) => ({...m, month: format(new Date(m.key+"T12:00:00"), "MMM")})));

      const rankArr = Object.entries(byClass).map(([name, v]) => ({
        name,
        attendance: v.total ? Math.round((v.hadir / v.total) * 100) : 0,
        hadir: v.hadir, total: v.total,
      })).sort((a, b) => b.attendance - a.attendance);
      setRanking(rankArr);

      const cal = [
        ...(holidaysQ.data || []).map((h: any) => ({ date: h.date, label: h.label, type: "libur" })),
        ...(annQ.data || []).slice(0, 20).map((a: any) => ({ date: a.created_at.slice(0, 10), label: a.title, type: "agenda" })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      setCalendar(cal.slice(0, 30));

      setLeaves(leavesQ.data || []);
      setAnnouncements((annQ.data || []).filter((a: any) => a.type === "draft" || a.type === "pending"));
      setPendingSettlements(setlPendingQ.data || []);
      setWithdrawals([]);

      const notifList: any[] = [];
      const totalApprovals = (leavesQ.data?.length || 0) + (setlPendingQ.data?.length || 0);
      if (totalApprovals > 0) notifList.push({ key: "approvals", title: `${totalApprovals} pengajuan menunggu persetujuan`, tone: "warning" });
      const classesWithoutAtt = classes.length - Object.keys(byClass).filter(c => byClass[c].hadir > 0).length;
      if (classesWithoutAtt > 0) notifList.push({ key: "attclass", title: `${classesWithoutAtt} kelas belum melakukan absensi hari ini`, tone: "warning" });
      const teachersJournalDone = new Set((subjectAttQ.data || []).map((a: any) => a.teaching_schedule_id)).size;
      if (schedules.length - teachersJournalDone > 0) notifList.push({ key: "jurnal", title: `${schedules.length - teachersJournalDone} jadwal belum diisi jurnal`, tone: "info" });
      const paymentsToday = Number(summary.payments_today || 0);
      if (paymentsToday > 0) notifList.push({ key: "spp", title: `${paymentsToday} pembayaran SPP masuk hari ini`, tone: "success" });
      setNotifs(notifList);

      const tl: any[] = [];
      (studentLogsQ.data || []).slice(0, 8).forEach((l: any) => tl.push({ type: "attendance", label: `Absensi siswa: ${l.status}`, at: l.created_at || today, tone: "primary" }));
      (invoicesQ.data || []).filter((i: any) => i.paid_at).slice(0, 8).forEach((i: any) => tl.push({ type: "payment", label: `Pembayaran SPP Rp ${(i.total_amount || 0).toLocaleString("id-ID")}`, at: i.paid_at, tone: "success" }));
      (annQ.data || []).slice(0, 6).forEach((a: any) => tl.push({ type: "announcement", label: `Pengumuman: ${a.title}`, at: a.created_at, tone: "info" }));
      (cashEntries || []).slice(0, 6).forEach((c: any) => tl.push({ type: c.direction === "in" ? "cash_in" : "cash_out", label: `Kas ${c.direction === "in" ? "Masuk" : "Keluar"}: Rp ${(c.amount || 0).toLocaleString("id-ID")}`, at: c.created_at, tone: c.direction === "in" ? "success" : "warning" }));
      (setlAllQ.data || []).slice(0, 4).forEach((s: any) => tl.push({ type: "settlement", label: `Pencairan ${s.settlement_code} (${s.status})`, at: s.requested_at, tone: "info" }));
      tl.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
      setTimeline(tl.slice(0, 30));
      hasLoaded.current = schoolId;
      setError(null);

    } catch (e) {
      if (activeSchool.current !== schoolId) return;
      console.error("Principal load error", e);
      setError("Laporan belum dapat diperbarui. Periksa koneksi dan coba lagi. Angka tidak ditampilkan sebagai hasil lengkap ketika pengambilan data gagal.");
      toast.error("Gagal memuat data");
    } finally {
      if (loadingRequest.current === schoolId) loadingRequest.current = null;
      if (activeSchool.current === schoolId) setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !schoolId) { setLoading(false); return; }
    loadAll();
    // Auto refresh every 60s so kepsek dashboard selalu segar tanpa tombol manual
    const t = setInterval(() => { if (document.visibilityState === "visible") loadAll(); }, 120_000);
    return () => clearInterval(t);
  }, [authLoading, user, schoolId, loadAll]);

  return (
    <Ctx.Provider value={{
      loading, error, schoolName, now, stats, liveClasses, teacherAtt, classAtt, finance,
      settlements, monthly, ranking, calendar, timeline, notifs, leaves,
      announcements, pendingSettlements, withdrawals, refresh: loadAll, setLeaves,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePrincipalData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrincipalData must be used within PrincipalDataProvider");
  return ctx;
}
