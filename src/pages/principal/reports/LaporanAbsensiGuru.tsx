import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ReportShell, useMonthRange } from "./_common";
import { useState } from "react";
import TeacherAttendanceRecap from "@/pages/TeacherAttendanceRecap";

export default function LaporanAbsensiGuru() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const { first, last } = useMonthRange();
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);

  return (
    <ReportShell
      title="Rekap Absensi Guru"
      subtitle="Format bulanan H/S/I/A dengan tab Rekap Kehadiran & Kepulangan"
      icon={GraduationCap}
      from={from} to={to} onFromChange={setFrom} onToChange={setTo}
      onDownload={() => { /* export handled inside recap */ }}
      datesOptional
      hideFilters
    >
      <TeacherAttendanceRecap schoolId={schoolId} hideHeader />
    </ReportShell>
  );
}
