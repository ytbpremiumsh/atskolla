import { supabase } from "@/integrations/supabase/client";
export interface SetupSnapshot {
  identity: boolean | null;
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
  await Promise.allSettled([
    (async () => {
      const r = await supabase
        .from("schools")
        .select("name,timezone,whatsapp,email")
        .eq("id", schoolId)
        .single();
      if (r.error) throw r.error;
      result.identity = !!(
        r.data.name &&
        r.data.timezone &&
        (r.data.whatsapp || r.data.email)
      );
    })(),
    ...(
      [
        ["classes", "classes"],
        ["students", "students"],
        ["teaching_schedules", "schedules"],
      ] as const
    ).map(async ([table, key]) => {
      const r = table === "teaching_schedules"
        ? await supabase.from("teaching_schedules").select("id", {count:"exact",head:true}).eq("school_id",schoolId).eq("is_active",true)
        : await supabase.from(table).select("id", {count:"exact",head:true}).eq("school_id",schoolId);
      if (r.error) throw r.error;
      result[key] = r.count ?? 0;
    }),
    (async () => {
      if (!admin) return;
      const p = await supabase
        .from("profiles")
        .select("user_id")
        .eq("school_id", schoolId);
      if (p.error) throw p.error;
      if (!p.data?.length) {
        result.team = 0;
        result.treasurers = 0;
        return;
      }
      const r = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in(
          "user_id",
          p.data.map((x) => x.user_id),
        );
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
        .select("verification_status,doku_bank_account_settlement_id")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      if (r.error) throw r.error;
      result.bank = r.data?.some(
        (x) =>
          x.verification_status === "verified" &&
          x.doku_bank_account_settlement_id,
      )
        ? "linked"
        : r.data?.some((x) => x.verification_status === "verified")
          ? "verified"
          : r.data?.some((x) => x.verification_status === "pending")
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
          : `${data.students} siswa tersedia. Periksa kelas, nomor kartu, dan WhatsApp wali.`,
      url: "/students",
      done: data.students === null ? null : data.students > 0,
      allowed: true,
    },
    {
      id: "team",
      title: "Guru / Staff",
      body: admin
        ? `${data.team ?? "—"} akun tim selain akun Anda. Tambahkan guru dan staff sesuai tugas. Tambahkan Bendahara untuk mengaktifkan pembayaran SPP dan Tagihan.`
        : "Akun tim dan pembagian peran dikelola Admin Sekolah.",
      url: "/staff",
      done: data.team === null ? null : data.team > 0,
      allowed: admin,
    },
    {
      id: "schedules",
      title: "Jadwal pelajaran",
      body: `${data.schedules ?? "—"} jadwal tersedia. Siapkan mapel dan guru, lalu isi satuan atau massal.`,
      url: "/jadwal",
      done: data.schedules === null ? null : data.schedules > 0,
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
          ? "Rekening pencairan sekolah sudah siap digunakan. Status ini bukan bukti dana telah diterima."
          : data.bank === "verified"
            ? "Rekening disetujui ATSkolla; pengaturan pencairan masih diproses."
            : "Dikelola Admin/Bendahara jika sekolah menggunakan pembayaran online.",
      url: "/bendahara/withdraw?tab=pencairan",
      done: data.bank === null ? null : data.bank === "linked",
      allowed: admin,
      optional: true,
    },
  ];
}
