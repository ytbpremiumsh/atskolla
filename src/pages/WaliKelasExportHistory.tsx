import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, Download, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "@/lib/toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { PremiumGate } from "@/components/PremiumGate";
import { PageHeader } from "@/components/PageHeader";

const STATUS_CODES: Record<string, string> = { hadir: "H", sakit: "S", izin: "I", alfa: "A" };
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface StudentRow {
  id: string;
  name: string;
  student_id: string;
  photo_url: string | null;
  days: Record<number, string>;
  totals: { H: number; S: number; I: number; A: number };
}

const STATUS_EXCEL_COLORS: Record<string, { bg: string; fg: string }> = {
  H: { bg: "#dcfce7", fg: "#16a34a" },
  S: { bg: "#dbeafe", fg: "#2563eb" },
  I: { bg: "#fef9c3", fg: "#ca8a04" },
  A: { bg: "#fecaca", fg: "#dc2626" },
};

const WaliKelasExportHistory = () => {
  const { user, profile } = useAuth();
  const features = useSubscriptionFeatures();


  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [students, setStudents] = useState<{ id: string; name: string; student_id: string; photo_url: string | null }[]>([]);
  const [datangLogs, setDatangLogs] = useState<any[]>([]);
  const [pulangLogs, setPulangLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [waliKelasName, setWaliKelasName] = useState("");
  const [rekapTab, setRekapTab] = useState<"datang" | "pulang">("datang");
  const tableRef = useRef<HTMLDivElement>(null);

  const isPremiumFeature = !features.canExportReport;
  const classNames = assignments.map(a => a.class_name);

  const selectedMonth = currentMonth.getMonth();
  const selectedYear = currentMonth.getFullYear();
  const setMonth = (m: string) => setCurrentMonth(new Date(selectedYear, parseInt(m), 1));
  const setYear = (y: string) => setCurrentMonth(new Date(parseInt(y), selectedMonth, 1));
  const years = Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  const isPulangMode = rekapTab === "pulang";

  useEffect(() => {
    if (!user) return;
    supabase.from("class_teachers").select("class_name, school_id").eq("user_id", user.id).then(({ data }) => {
      const assigns = data || [];
      setAssignments(assigns);
      if (assigns.length > 0) setSelectedClass(assigns[0].class_name);
    });
  }, [user]);

  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("name, address, city").eq("id", profile.school_id).maybeSingle().then(({ data }) => {
      if (data) { setSchoolName(data.name); setSchoolAddress((data as any).city || data.address || ""); }
    });
  }, [profile?.school_id]);

  useEffect(() => {
    if (!profile?.school_id || !selectedClass) return;
    supabase.from("class_teachers").select("user_id").eq("school_id", profile.school_id).eq("class_name", selectedClass).maybeSingle().then(({ data }) => {
      if (data?.user_id) {
        supabase.from("profiles").select("full_name").eq("user_id", data.user_id).maybeSingle().then(({ data: prof }) => {
          setWaliKelasName(prof?.full_name || "");
        });
      } else setWaliKelasName("");
    });
  }, [profile?.school_id, selectedClass]);

  useEffect(() => {
    if (!profile?.school_id || !selectedClass) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
        const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        const studentsRes = await supabase.from("students").select("id, name, student_id, photo_url").eq("school_id", profile.school_id!).eq("class", selectedClass).order("name");
        const studentData = studentsRes.data || [];
        setStudents(studentData);

        if (studentData.length > 0) {
          const ids = studentData.map(s => s.id);
          const [d, p] = await Promise.all([
            supabase.from("attendance_logs").select("student_id, date, status").eq("school_id", profile.school_id!).eq("attendance_type", "datang").gte("date", startDate).lte("date", endDate).in("student_id", ids),
            supabase.from("attendance_logs").select("student_id, date, status").eq("school_id", profile.school_id!).eq("attendance_type", "pulang").gte("date", startDate).lte("date", endDate).in("student_id", ids),
          ]);
          setDatangLogs(d.data || []);
          setPulangLogs(p.data || []);
        } else {
          setDatangLogs([]);
          setPulangLogs([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.school_id, selectedClass, selectedMonth, selectedYear]);

  const buildRows = (logs: any[], pulang = false): StudentRow[] => {
    return students.map(s => {
      const days: Record<number, string> = {};
      const totals = { H: 0, S: 0, I: 0, A: 0 };
      logs.filter(l => l.student_id === s.id).forEach(l => {
        const day = parseInt(l.date.split("-")[2]);
        if (pulang) { days[day] = "✓"; totals.H++; }
        else {
          const code = STATUS_CODES[l.status] || "";
          days[day] = code;
          if (code in totals) totals[code as keyof typeof totals]++;
        }
      });
      return { ...s, days, totals };
    });
  };

  const activeRows = useMemo(() => buildRows(isPulangMode ? pulangLogs : datangLogs, isPulangMode), [students, datangLogs, pulangLogs, isPulangMode]);

  const getCellBadge = (code: string) => {
    switch (code) {
      case "H": case "✓": return "bg-emerald-500 text-white";
      case "S": return "bg-violet-500 text-white";
      case "I": return "bg-amber-400 text-white";
      case "A": return "bg-red-500 text-white";
      default: return "";
    }
  };

  const exportExcel = () => {
    if (isPremiumFeature) { toast.error("Upgrade ke paket Basic untuk export"); return; }
    if (!activeRows.length) { toast.error("Tidak ada data"); return; }
    const titleLabel = isPulangMode ? "REKAP KEPULANGAN SISWA" : "ABSENSI SISWA";
    const ketCols = isPulangMode ? 1 : 4;
    const totalCols = 3 + daysInMonth + ketCols;

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>
      td, th { border: 1px solid #999; padding: 3px 4px; font-family: Arial; font-size: 9pt; text-align: center; }
      th { background: #4f46e5; color: white; font-weight: bold; }
      .name { text-align: left; min-width: 120px; }
      .title { font-size: 14pt; font-weight: bold; text-align: center; border: none; }
      .subtitle { font-size: 11pt; text-align: center; border: none; }
      .H { background: ${STATUS_EXCEL_COLORS.H.bg}; color: ${STATUS_EXCEL_COLORS.H.fg}; font-weight: bold; }
      .S { background: ${STATUS_EXCEL_COLORS.S.bg}; color: ${STATUS_EXCEL_COLORS.S.fg}; font-weight: bold; }
      .I { background: ${STATUS_EXCEL_COLORS.I.bg}; color: ${STATUS_EXCEL_COLORS.I.fg}; font-weight: bold; }
      .A { background: ${STATUS_EXCEL_COLORS.A.bg}; color: ${STATUS_EXCEL_COLORS.A.fg}; font-weight: bold; }
      .check { background: ${STATUS_EXCEL_COLORS.H.bg}; color: ${STATUS_EXCEL_COLORS.H.fg}; font-weight: bold; }
    </style></head><body><table>`;

    html += `<tr><td colspan="${totalCols}" class="title">${titleLabel}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" class="subtitle">BULAN : ${monthLabel.toUpperCase()}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" class="subtitle">Kelas : ${selectedClass}</td></tr>`;
    html += `<tr><td colspan="${totalCols}"></td></tr>`;
    html += `<tr><th rowspan="2">NO</th><th rowspan="2">NIS</th><th rowspan="2" class="name">NAMA SISWA</th>`;
    html += `<th colspan="${daysInMonth}">TANGGAL</th><th colspan="${ketCols}">KET</th></tr><tr>`;
    for (let d = 1; d <= daysInMonth; d++) html += `<th>${d}</th>`;
    if (isPulangMode) html += `<th class="H">✓</th></tr>`;
    else html += `<th class="H">H</th><th class="S">S</th><th class="I">I</th><th class="A">A</th></tr>`;

    activeRows.forEach((s, i) => {
      html += `<tr><td>${i + 1}</td><td>${s.student_id}</td><td class="name">${s.name}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const code = s.days[d] || "";
        const cls = code === "✓" ? "check" : code;
        html += `<td${cls ? ` class="${cls}"` : ""}>${code}</td>`;
      }
      if (isPulangMode) html += `<td class="H">${s.totals.H || ""}</td></tr>`;
      else html += `<td class="H">${s.totals.H || ""}</td><td class="S">${s.totals.S || ""}</td><td class="I">${s.totals.I || ""}</td><td class="A">${s.totals.A || ""}</td></tr>`;
    });

    html += `<tr><td colspan="${totalCols}"></td></tr><tr><td colspan="${totalCols}"></td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="text-align:right;border:none">${schoolAddress || schoolName}, ........................ ${selectedYear}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="text-align:right;border:none;font-weight:bold">WALI KELAS ${selectedClass}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="border:none"></td></tr><tr><td colspan="${totalCols}" style="border:none"></td></tr><tr><td colspan="${totalCols}" style="border:none"></td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="text-align:right;border:none;font-weight:bold">${waliKelasName ? `( ${waliKelasName} )` : "(..................................)"}</td></tr>`;
    html += `</table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isPulangMode ? "Kepulangan" : "Absensi"}-${selectedClass}-${monthLabel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel berhasil diunduh!");
  };

  const exportPDF = () => {
    if (isPremiumFeature) { toast.error("Upgrade ke paket Basic untuk export"); return; }
    if (!activeRows.length) { toast.error("Tidak ada data"); return; }
    const titleLabel = isPulangMode ? "REKAP KEPULANGAN SISWA" : "ABSENSI SISWA";
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text(titleLabel, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`BULAN : ${monthLabel.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Kelas : ${selectedClass}`, 14, 30);

    const head = isPulangMode
      ? [["NO", "NIS", "NAMA", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), "V"]]
      : [["NO", "NIS", "NAMA", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), "H", "S", "I", "A"]];
    const body = activeRows.map((s, i) => {
      const row: (string | number)[] = [i + 1, s.student_id, s.name];
      for (let d = 1; d <= daysInMonth; d++) { const v = s.days[d] || ""; row.push(v === "✓" ? "V" : v); }
      if (isPulangMode) row.push(s.totals.H);
      else row.push(s.totals.H, s.totals.S, s.totals.I, s.totals.A);
      return row;
    });

    const statusColors: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
      H: { bg: [220, 252, 231], fg: [22, 163, 74] },
      S: { bg: [219, 234, 254], fg: [37, 99, 235] },
      I: { bg: [254, 249, 195], fg: [202, 138, 4] },
      A: { bg: [254, 202, 202], fg: [220, 38, 38] },
    };

    (doc as any).autoTable({
      startY: 35, head, body,
      styles: { fontSize: 5.5, cellPadding: 1, halign: "center", lineWidth: 0.1, lineColor: [180, 180, 180] },
      headStyles: { fillColor: [79, 70, 229], fontSize: 5.5, textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 13 }, 2: { cellWidth: 28, halign: "left" } },
      didParseCell: (data: any) => {
        if (data.section === "body") {
          const cellText = String(data.cell.raw);
          const colIdx = data.column.index;
          const tc = 3 + daysInMonth;
          if (colIdx >= 3 && colIdx < tc) {
            if (cellText in statusColors) { data.cell.styles.fillColor = statusColors[cellText].bg; data.cell.styles.textColor = statusColors[cellText].fg; data.cell.styles.fontStyle = "bold"; }
            else if (cellText === "V") { data.cell.styles.fillColor = statusColors.H.bg; data.cell.styles.textColor = statusColors.H.fg; data.cell.styles.fontStyle = "bold"; }
          }
          if (colIdx >= tc) {
            if (isPulangMode) { data.cell.styles.textColor = statusColors.H.fg; data.cell.styles.fontStyle = "bold"; }
            else { const keys = ["H", "S", "I", "A"]; const k = keys[colIdx - tc]; if (k && statusColors[k]) { data.cell.styles.textColor = statusColors[k].fg; data.cell.styles.fontStyle = "bold"; } }
          }
        }
      },
      didDrawPage: () => {
        const pH = doc.internal.pageSize.getHeight();
        const pW = doc.internal.pageSize.getWidth();
        doc.setFontSize(9);
        doc.text(`${schoolAddress || schoolName}, ........................ ${selectedYear}`, pW - 14, pH - 35, { align: "right" });
        doc.text(`WALI KELAS ${selectedClass}`, pW - 14, pH - 30, { align: "right" });
        doc.text(waliKelasName ? `( ${waliKelasName} )` : "(..................................)", pW - 14, pH - 12, { align: "right" });
      },
    });

    doc.save(`${isPulangMode ? "Kepulangan" : "Absensi"}-${selectedClass}-${monthLabel}.pdf`);
    toast.success("PDF berhasil diunduh!");
  };


  if (assignments.length === 0 && !loading) {
    return (
      <PremiumGate featureLabel="Rekap Absensi Kelas" featureKey="canExportReport" requiredPlan="Basic">
        <div className="space-y-6">
          <PageHeader icon={ClipboardList} title="Rekap Absensi Kelas" subtitle="Rekap absensi umum wali kelas" />
          <Card className="border-0 shadow-card">
            <CardContent className="p-10 text-center text-muted-foreground">
              Anda belum ditugaskan sebagai wali kelas.
            </CardContent>
          </Card>
        </div>
      </PremiumGate>
    );
  }

  return (
    <PremiumGate featureLabel="Rekap Absensi Kelas" featureKey="canExportReport" requiredPlan="Basic">
      <div className="space-y-5">
        <PageHeader icon={ClipboardList} title="Rekap Absensi Kelas" subtitle="Rekap absensi umum (Datang/Pulang) untuk wali kelas Anda" />

        {/* Filter Bar */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Bulan</label>
            <Select value={String(selectedMonth)} onValueChange={setMonth}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tahun</label>
            <Select value={String(selectedYear)} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kelas</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled={isPremiumFeature} onClick={exportExcel} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Download className="h-4 w-4" /> Export Excel {isPremiumFeature && <Lock className="h-3 w-3" />}
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500 text-white text-[10px] font-bold">H</span> Hadir</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-violet-500 text-white text-[10px] font-bold">S</span> Sakit</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-amber-400 text-white text-[10px] font-bold">I</span> Izin</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-red-500 text-white text-[10px] font-bold">A</span> Alfa</div>
        </div>

        {/* Tabs */}
        <Tabs value={rekapTab} onValueChange={(v) => setRekapTab(v as "datang" | "pulang")}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="datang" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Rekap Kehadiran
            </TabsTrigger>
            <TabsTrigger value="pulang" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Rekap Kepulangan
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Recap Table */}
        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                Rekapitulasi — {monthLabel}{" "}
                <span className="text-muted-foreground font-normal text-sm">({activeRows.length} siswa)</span>
              </h2>
            </div>

            {loading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Memuat data...</div>
            ) : activeRows.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Tidak ada siswa di kelas ini</div>
            ) : (
              <div className="overflow-x-auto" ref={tableRef}>
                <table className="w-full text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th rowSpan={2} className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-10 sticky left-0 bg-card z-10">No</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-left font-semibold text-muted-foreground min-w-[180px]">Nama Siswa</th>
                      <th colSpan={daysInMonth} className="px-1 py-2 text-center font-bold text-primary uppercase text-[10px] tracking-wider">Tanggal</th>
                      {isPulangMode ? (
                        <th className="px-1 py-2 text-center font-bold text-primary uppercase text-[10px] tracking-wider">Ket</th>
                      ) : (
                        <th colSpan={5} className="px-1 py-2 text-center font-bold text-primary uppercase text-[10px] tracking-wider">Keterangan</th>
                      )}
                    </tr>
                    <tr className="border-b border-border bg-muted/30">
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="px-0.5 py-1.5 text-center font-medium text-muted-foreground w-7 text-[10px]">{i + 1}</th>
                      ))}
                      {isPulangMode ? (
                        <th className="px-1 py-1.5 text-center font-bold text-success w-7 text-[10px]">✓</th>
                      ) : (
                        <>
                          <th className="px-1 py-1.5 text-center font-bold text-emerald-600 w-7 text-[10px]">H</th>
                          <th className="px-1 py-1.5 text-center font-bold text-violet-600 w-7 text-[10px]">S</th>
                          <th className="px-1 py-1.5 text-center font-bold text-amber-600 w-7 text-[10px]">I</th>
                          <th className="px-1 py-1.5 text-center font-bold text-red-600 w-7 text-[10px]">A</th>
                          <th className="px-1 py-1.5 text-center font-bold text-primary w-10 text-[10px]">%</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map((s, i) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-3 text-center font-medium text-muted-foreground sticky left-0 bg-card z-10">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 shrink-0">
                              {s.photo_url && <AvatarImage src={s.photo_url} alt={s.name} />}
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{s.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-foreground truncate">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground">{s.student_id}</p>
                            </div>
                          </div>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const code = s.days[d + 1] || "";
                          const badgeClass = getCellBadge(code);
                          return (
                            <td key={d} className="px-0 py-2 text-center">
                              {code ? (
                                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold ${badgeClass}`}>
                                  {code === "✓" ? "H" : code}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted/40 border border-border/30" />
                              )}
                            </td>
                          );
                        })}
                        {isPulangMode ? (
                          <td className="px-1 py-2 text-center font-bold text-emerald-600">{s.totals.H || 0}</td>
                        ) : (() => {
                          const totalDays = s.totals.H + s.totals.S + s.totals.I + s.totals.A;
                          const pct = totalDays > 0 ? Math.round((s.totals.H / totalDays) * 100) : 0;
                          return (
                            <>
                              <td className="px-1 py-2 text-center font-bold text-emerald-600">{s.totals.H || 0}</td>
                              <td className="px-1 py-2 text-center font-bold text-violet-600">{s.totals.S || 0}</td>
                              <td className="px-1 py-2 text-center font-bold text-amber-600">{s.totals.I || 0}</td>
                              <td className="px-1 py-2 text-center font-bold text-red-600">{s.totals.A || 0}</td>
                              <td className={`px-1 py-2 text-center font-bold text-[10px] ${pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                {totalDays > 0 ? `${pct}%` : "-"}
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeRows.length > 0 && (
              <div className="p-6 border-t border-border">
                <div className="flex justify-end">
                  <div className="text-center text-xs text-muted-foreground space-y-1">
                    <p>{schoolAddress || schoolName}, ........................ {selectedYear}</p>
                    <p className="font-semibold text-foreground">WALI KELAS {selectedClass}</p>
                    <div className="h-16" />
                    <p className="font-semibold text-foreground border-b border-foreground inline-block min-w-[180px]">
                      {waliKelasName ? `( ${waliKelasName} )` : "(.................................)"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PremiumGate>
  );
};

export default WaliKelasExportHistory;
