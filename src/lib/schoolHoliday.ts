import { getLocalDateString } from "@/lib/dateLocal";
import { supabase } from "@/integrations/supabase/client";

export type HolidayStatus = {
  isHoliday: boolean;
  reason: string | null;
  mode: boolean;
  modeLabel: string | null;
};

const DAY_LABELS: Record<number, string> = {
  0: "Minggu", 1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat", 6: "Sabtu",
};

export async function fetchSchoolHolidayStatus(schoolId: string, when: Date = new Date()): Promise<HolidayStatus> {
  const sRes = await supabase.from("schools").select("holiday_mode, holiday_mode_label, holiday_days, timezone").eq("id", schoolId).maybeSingle();
  const s = sRes.data;
  const date = getLocalDateString(s?.timezone || "Asia/Jakarta", when);
  const hRes = await supabase.from("school_holidays").select("date, label").eq("school_id", schoolId).eq("date", date).eq("is_holiday", true).limit(1).maybeSingle();
  const mode = !!s?.holiday_mode;
  const modeLabel = s?.holiday_mode_label || null;
  if (mode) {
    return { isHoliday: true, reason: `Mode Libur aktif${modeLabel ? ` — ${modeLabel}` : ""}`, mode, modeLabel };
  }
  const days: number[] = Array.isArray(s?.holiday_days) ? s.holiday_days : [];
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (days.includes(dow)) {
    return { isHoliday: true, reason: `Hari ${DAY_LABELS[dow]} adalah hari libur mingguan sekolah`, mode, modeLabel };
  }
  if (hRes.data) {
    const label = hRes.data.label;
    return { isHoliday: true, reason: `Tanggal merah sekolah${label ? ` — ${label}` : ""}`, mode, modeLabel };
  }
  return { isHoliday: false, reason: null, mode, modeLabel };
}

/** Return the saved row; a zero-row RLS update must never look successful. */
export async function saveSchoolHolidaySettings(schoolId: string, patch: {
  holiday_mode?: boolean; holiday_mode_label?: string | null; holiday_days?: number[];
}) {
  if (!schoolId) throw new Error("Sekolah belum terhubung ke akun ini.");
  const { data, error } = await supabase.from("schools").update(patch).eq("id", schoolId)
    .select("holiday_mode, holiday_mode_label, holiday_days").single();
  if (error) throw new Error(error.code === "PGRST116" ? "Perubahan tidak tersimpan. Gunakan akun Admin Sekolah yang sesuai." : error.message);
  if (!data) throw new Error("Pengaturan belum tersimpan. Silakan coba kembali.");
  return data;
}
