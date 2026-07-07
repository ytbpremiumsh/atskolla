import { supabase } from "@/integrations/supabase/client";

/**
 * Typed query helpers. Add new helpers here instead of scattering
 * ad-hoc `.from().select()` calls across pages.
 *
 * All helpers throw on Supabase errors so callers can wrap them in
 * React Query with a plain queryFn.
 */

export async function fetchSchoolById(schoolId: string) {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, slug, logo, timezone, holiday_mode, group_id")
    .eq("id", schoolId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchClassesBySchool(schoolId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, level, school_id")
    .eq("school_id", schoolId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchStudentsBySchool(
  schoolId: string,
  opts?: { className?: string | null; limit?: number },
) {
  let q = supabase
    .from("students")
    .select("id, name, class, gender, photo_url, card_number, school_id")
    .eq("school_id", schoolId)
    .order("name");
  if (opts?.className) q = q.eq("class", opts.className);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchAttendanceRange(
  schoolId: string,
  fromISO: string,
  toISO: string,
) {
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("id, student_id, date, status, time, method, created_at")
    .eq("school_id", schoolId)
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
