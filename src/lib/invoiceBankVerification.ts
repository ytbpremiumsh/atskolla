import { supabase } from "@/integrations/supabase/client";
export type InvoiceBankState = "none" | "pending" | "rejected" | "verified" | "unavailable";
export function invoiceBankState(rows: { is_active: boolean; verification_status: string; requires_review?: boolean | null }[]): InvoiceBankState {
  const active = rows.filter((row) => row.is_active === true);
  if (active.some((row) => row.verification_status === "verified" && row.requires_review !== true)) return "verified";
  if (active.some((row) => row.verification_status === "pending" || (row.verification_status === "verified" && row.requires_review === true))) return "pending";
  if (active.some((row) => row.verification_status === "rejected")) return "rejected";
  return "none";
}
export async function checkInvoiceBank(schoolId?: string | null): Promise<InvoiceBankState> {
  if (!schoolId) return "unavailable";
  try {
    const { data, error } = await supabase.from("bendahara_bank_accounts")
      .select("is_active,verification_status,requires_review").eq("school_id", schoolId).eq("is_active", true);
    if (error || !data) return "unavailable";
    return invoiceBankState(data);
  } catch { return "unavailable"; }
}
