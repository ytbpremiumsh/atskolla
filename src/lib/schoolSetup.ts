import { readSetupPages, studentReadiness, validTimeRange, type StudentIssues } from "./schoolReadiness";
import { supabase } from "@/integrations/supabase/client";
export interface SetupSnapshot {
  identity: boolean | null;
  attendanceReady: boolean | null;
  studentIssues: StudentIssues | null;
  teachers: number | null;
  unscheduledClasses: number | null;
  invalidSchedules: number | null;
  classes: number | null;
  students: number | null;
  team: number | null;
  treasurers: number | null;
  schedules: number | null;
  whatsapp: "connected" | "configured" | "missing" | null;
  bank: "linked" | "verified" | "pending" | "missing" | null;
}
export const emptySetup: SetupSnapshot = {
  identity: null,
  attendanceReady: null,
  studentIssues: null,
  teachers: null,
  unscheduledClasses: null,
  invalidSchedules: null,
  classes: null,
  students: null,
  team: null,
  treasurers: null,
  schedules: null,
  whatsapp: null,
  bank: null,
};
export async function fetchSchoolSetup(
  schoolId: string,
  userId: string,
  admin: boolean,
): Promise<SetupSnapshot> {
  const result = { ...emptySetup };
  const schools = supabase.from("schools").select("name,timezone,whatsapp,email,holiday_days").eq("id", schoolId).single().then((response) => response);
  const classes = readSetupPages((from, to) => supabase.from("classes").select("id,name").eq("school_id", schoolId).order("id").range(from, to));
  await Promise.allSettled([
    (async () => {
      const r = await schools;
      if (r.error) throw r.error;
      result.identity = !!(r.data.name?.trim() && r.data.timezone && (r.data.whatsapp?.trim() || r.data.email?.trim()));
    })(),
    (async () => { result.classes = (await classes).length; })(),
    (async () => {
      const rows = await readSetupPages((from, to) => supabase.from("students").select("name,student_id,class,card_number,parent_name,parent_phone").eq("school_id", schoolId).order("id").range(from, to));
      result.students = rows.length;
      result.studentIssues = studentReadiness(rows, await classes);
    })(),
    (async () => {
      const [school, settings] = await Promise.all([
        schools,
        supabase.from("dismissal_settings").select("attendance_start_time,attendance_end_time,departure_start_time,departure_end_time").eq("school_id", schoolId).maybeSingle(),
      ]);
      if (school.error || settings.error) throw school.error || settings.error;
      const days = school.data.holiday_days;
      result.attendanceReady = !!settings.data
        && Array.isArray(days) && new Set(days).size < 7 && days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        && validTimeRange(settings.data.attendance_start_time, settings.data.attendance_end_time)
        && validTimeRange(settings.data.departure_start_time, settings.data.departure_end_time);
    })(),
    (async () => {
      const rows = await readSetupPages((from, to) => supabase.from("teaching_schedules").select("class_id,subject_id,teacher_id,start_time,end_time,day_of_week").eq("school_id", schoolId).eq("is_active", true).order("id").range(from, to));
      result.schedules = rows.length;
      const [classRows, subjects] = await Promise.all([
        classes,
        readSetupPages((from, to) => supabase.from("subjects").select("id").eq("school_id", schoolId).eq("is_active", true).order("id").range(from, to)),
      ]);
      const classIds = new Set(classRows.map((c) => c.id)), subjectIds = new Set(subjects.map((subject) => subject.id));
      const valid = rows.filter((row) => classIds.has(row.class_id) && subjectIds.has(row.subject_id) && !!row.teacher_id && validTimeRange(row.start_time, row.end_time) && Number.isInteger(row.day_of_week) && row.day_of_week >= 0 && row.day_of_week <= 6);
      result.invalidSchedules = rows.length - valid.length;
      const scheduled = new Set(valid.map((row) => row.class_id));
      result.unscheduledClasses = classRows.filter((c) => !scheduled.has(c.id)).length;
    })(),
    (async () => {
      if (!admin) return;
      const p = { error: null, data: await readSetupPages((from, to) => supabase.from("profiles").select("user_id").eq("school_id", schoolId).order("user_id").range(from, to)) };
      if (p.error) throw p.error;
      if (!p.data?.length) {
        result.team = 0;
        result.treasurers = 0;
        result.teachers = 0;
        return;
      }
      const roleRows = [];
      for (let offset = 0; offset < p.data.length; offset += 100) {
        const rows = await readSetupPages((from, to) => supabase.from("user_roles").select("user_id,role").in("user_id", p.data.slice(offset, offset + 100).map((x) => x.user_id)).order("id").range(from, to));
        roleRows.push(...rows);
      }
      const r = { data: roleRows, error: null };
      result.teachers = new Set(roleRows.filter((row) => row.role === "teacher").map((row) => row.user_id)).size;
      if (r.error) throw r.error;
      result.treasurers = new Set(
        r.data?.filter((x) => x.role === "bendahara").map((x) => x.user_id),
      ).size;
      result.team = new Set(
        r.data
          ?.filter((x) => x.user_id !== userId)
          .filter((x) =>
            [
              "staff",
              "teacher",
              "bendahara",
              "principal",
              "school_admin",
            ].includes(x.role),
          )
          .map((x) => x.user_id),
      ).size;
    })(),
    (async () => {
      const r = await supabase
        .from("school_integrations")
        .select("gateway_type,mpwa_connected,is_active")
        .eq("school_id", schoolId)
        .eq("integration_type", "onesender")
        .maybeSingle();
      if (r.error) throw r.error;
      result.whatsapp = !r.data
        ? "missing"
        : r.data.gateway_type === "mpwa"
          ? r.data.mpwa_connected
            ? "connected"
            : "missing"
          : r.data.is_active
            ? "configured"
            : "missing";
    })(),
    (async () => {
      if (!admin) return;
      const r = await supabase
        .from("bendahara_bank_accounts")
        .select("verification_status,doku_bank_account_settlement_id,is_default,requires_review")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      if (r.error) throw r.error;
      result.bank = r.data?.some(
        (x) =>
          x.verification_status === "verified" && x.is_default === true && x.requires_review !== true &&
          !!x.doku_bank_account_settlement_id?.trim(),
      )
        ? "linked"
        : r.data?.some((x) => x.verification_status === "verified" && x.requires_review !== true)
          ? "verified"
          : r.data?.some((x) => x.verification_status === "pending" || (x.verification_status === "verified" && x.requires_review === true))
            ? "pending"
            : "missing";
    })(),
  ]);
  return result;
}
export function setupSteps(data: SetupSnapshot, admin: boolean) {
  return [
    {
      id: "identity",
      title: "Identitas sekolah",
      body: "Lengkapi kontak dan zona waktu sekolah.",
      url: "/school-settings",
      done: data.identity,
      allowed: admin,
    },
    {
      id: "classes",
      title: "Kelas",
      body:
        data.classes === null
          ? "Status belum dapat diperiksa."
          : `${data.classes} kelas tersedia. Siapkan kelas sebelum mengisi siswa dan jadwal.`,
      url: "/classes",
      done: data.classes === null ? null : data.classes > 0,
      allowed: true,
    },
    {
      id: "students",
      title: "Data siswa",
      body:
        data.students === null
          ? "Status belum dapat diperiksa."
          : data.students === 0 ? "Tambahkan siswa beserta kelas, nomor kartu, nama wali, dan WhatsApp wali."
          : data.studentIssues === null ? "Kelengkapan siswa belum dapat diperiksa. Klik Periksa ulang."
          : data.studentIssues.incomplete > 0
            ? `${data.studentIssues.incomplete} dari ${data.students} siswa perlu diperbaiki: ${data.studentIssues.class} kelas, ${data.studentIssues.card} nomor kartu, ${data.studentIssues.guardian} data wali, ${data.studentIssues.identity} identitas. Nomor WhatsApp yang sama untuk saudara diperbolehkan.`
            : `${data.students} siswa memiliki data lengkap. Uji akses wali dengan nomor kartu dan pastikan semua anak dalam satu wali tampil sebelum membagikan akses.`,
      url: "/students",
      done: data.students === null || data.studentIssues === null ? null : data.students > 0 && data.studentIssues.incomplete === 0,
      allowed: true,
    },
    {
      id: "team",
      title: "Guru / Staff",
      body: admin
        ? `${data.teachers ?? "—"} guru tersedia. Tambahkan guru dan staff sesuai tugas; tetapkan wali kelas bila digunakan. ${data.treasurers ? "Akun Bendahara tersedia untuk mengelola SPP dan Tagihan." : "Tambahkan Bendahara untuk mengaktifkan pembayaran SPP dan Tagihan jika digunakan."}`
        : "Akun guru, staf, dan pembagian peran dikelola Admin Sekolah.",
      url: "/staff",
      done: data.team === null || data.teachers === null ? null : data.teachers > 0,
      allowed: admin,
    },
    {
      id: "schedules",
      title: "Jadwal pelajaran",
      body: data.attendanceReady === false
        ? "Atur jam datang/pulang dan hari libur terlebih dahulu. Setelah itu, lengkapi jadwal per kelas dan uji metode absensi yang akan digunakan."
        : data.schedules === null || data.attendanceReady === null || data.invalidSchedules === null || data.unscheduledClasses === null
          ? "Kesiapan jadwal dan jam absensi belum dapat diperiksa. Klik Periksa ulang."
          : data.invalidSchedules > 0 ? `${data.invalidSchedules} jadwal perlu diperbaiki. Periksa kelas, mata pelajaran aktif, guru, hari, dan rentang waktu.`
          : data.unscheduledClasses > 0 ? `${data.unscheduledClasses} kelas belum memiliki jadwal aktif. Siapkan mapel dan guru, lalu isi jadwal satuan atau massal.`
          : "Jadwal per kelas dan jam absensi tersedia. Uji absensi datang dan pulang dengan kartu atau metode yang digunakan sekolah sebelum digunakan bersama siswa.",
      url: data.attendanceReady === false ? "/holidays" : "/jadwal",
      done: data.schedules === null || data.attendanceReady === null || data.invalidSchedules === null || data.unscheduledClasses === null ? null : data.schedules > 0 && data.attendanceReady && data.invalidSchedules === 0 && data.unscheduledClasses === 0,
      allowed: true,
    },
    {
      id: "whatsapp",
      title: "Konfigurasi WhatsApp",
      body:
        data.whatsapp === "connected"
          ? "Perangkat tercatat terhubung. Periksa riwayat pengiriman untuk memastikan pesan diterima."
          : data.whatsapp === "configured"
            ? "Gateway sudah dikonfigurasi; keberhasilan pengiriman belum dikonfirmasi oleh checklist ini."
            : "Hubungkan gateway/perangkat agar notifikasi dapat dikirim.",
      url: "/whatsapp",
      done:
        data.whatsapp === null
          ? null
          : data.whatsapp === "connected" || data.whatsapp === "configured",
      allowed: true,
    },
    {
      id: "bank",
      title: "Rekening pencairan",
      body:
        data.bank === "linked"
          ? "Rekening utama sudah terverifikasi dan pengaturan pencairan tersedia. Bendahara dapat menyiapkan tagihan; periksa rincian biaya, status pembayaran, dan bukti pembayaran sebelum dibagikan ke wali."
          : data.bank === "verified"
            ? "Rekening disetujui. Bendahara perlu menetapkan rekening utama dan menunggu pengaturan pencairan selesai sebelum pembayaran online digunakan."
            : data.bank === "pending"
              ? "Rekening menunggu verifikasi. Pengajuan selesai belum berarti pembayaran aktif. Setelah rekening siap, Bendahara membuat tagihan dan memeriksa nominal, biaya layanan, serta bukti pembayaran."
              : "Jika memakai pembayaran online, tambahkan Bendahara melalui Guru / Staff. Masuk sebagai Bendahara, ajukan rekening, lalu tunggu verifikasi sebelum membuat tagihan.",
      url: "/bendahara/withdraw?tab=pencairan",
      done: data.bank === null ? null : data.bank === "linked",
      allowed: admin,
      optional: true,
    },
  ];
}
