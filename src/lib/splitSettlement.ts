// Payment confirmation is distinct from bank settlement. Dates never prove receipt.

export const wibDateKey = (iso: string): string => {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

export const nextBusinessDay = (dateKey: string): string => {
  const d = new Date(dateKey + "T00:00:00Z");
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
};

export type PayoutStatus = "split_paid" | "split_processing" | "manual_paid" | "manual_processing" | "legacy" | "offline";

const OFFLINE = ["offline_cash", "offline_transfer"];

/** Status pencairan satu invoice lunas, konsep Split Settlement. */
export const payoutStatus = (inv: any, now: Date = new Date()): PayoutStatus => {
  if (OFFLINE.includes(String(inv.payment_method || ""))) return "offline";
  if (inv.doku_split) {
    // Requires a recorded provider or authorized operator confirmation, never elapsed time.
    return inv.settlement_status === "paid" && inv.settlement_confirmed_at ? "split_paid" : "split_processing";
  }
  if (inv.settlement_status === "paid" && inv.settlement_confirmed_at) return "manual_paid";
  if (inv.settlement_id) return inv.settlement_status === "paid" ? "manual_paid" : "manual_processing";
  return "legacy";
};

/** Preserve invoice confirmation; linked settlement is a fallback for legacy payouts. */
export const invoicePayoutStatus = (invoice: any, settlements: any[]): PayoutStatus =>
  payoutStatus({ ...invoice, settlement_status: invoice.settlement_status ?? settlements.find(s => s.id === invoice.settlement_id)?.status });

export const schoolReceiptAmount = (invoice: any): number =>
  invoice.payment_fee_model === "school_gateway_admin_v1"
    ? Math.max(0, Number(invoice.total_amount ?? 0) - Number(invoice.gateway_fee_estimate ?? 0))
    : invoice.doku_split
      ? Number(invoice.total_amount ?? 0)
      : Number(invoice.net_amount ?? invoice.total_amount ?? 0);

export const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  split_paid: "Sudah Ditransfer",
  split_processing: "Menunggu Konfirmasi Bank",
  manual_processing: "Pencairan Diproses",
  manual_paid: "Sudah Dicairkan",
  legacy: "Pencairan belum tercatat",
  offline: "Diterima Langsung",
};

/** Full UUID encoded losslessly; no truncation or collision-prone name initials. */
export const schoolSettlementKey = (schoolId: string): string => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) throw new Error("Identitas sekolah tidak valid");
  return BigInt("0x" + schoolId.replace(/-/g, "")).toString(36).toUpperCase().padStart(25, "0");
};

export type SplitDay = {
  code: string;
  date: string;
  settleDate: string;
  count: number;
  total: number;
  status: "paid" | "processing";
  items: any[];
};

export const groupSplitByDay = (items: any[], schoolId: string, now: Date = new Date()): SplitDay[] => {

  if (!schoolId) return [];
  const schoolKey = schoolSettlementKey(schoolId);
  const map = new Map<string, any[]>();
  for (const it of items) {
    if (!it.paid_at || (it.school_id && it.school_id !== schoolId)) continue;
    const k = wibDateKey(it.paid_at);
    map.set(k, [...(map.get(k) || []), it]);
  }
  return [...map.entries()]
    .map(([date, list]) => {
      const settleDate = nextBusinessDay(date);
      return {
        code: `STL-${schoolKey}-${date.replace(/-/g, "")}`,
        date,
        settleDate,
        count: list.length,
        total: list.reduce((s, x) => s + schoolReceiptAmount(x), 0),
        status: (list.every(i => payoutStatus(i, now) === "split_paid") ? "paid" : "processing") as SplitDay["status"],
        items: list,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};

/** Jadwal operasional, bukan bukti transfer atau perubahan saldo. */
export const payoutSchedule = (paymentDate: string, now: Date = new Date()) => {
  const date = nextBusinessDay(paymentDate);
  const updateAt = new Date(`${date}T13:00:00+07:00`);
  return { date, updateAt, estimatedSent: now.getTime() >= updateAt.getTime() };
};
