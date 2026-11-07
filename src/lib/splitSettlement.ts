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
    // This requires an explicit provider confirmation, never elapsed time.
    return inv.settlement_status === "paid" && inv.settlement_confirmed_at ? "split_paid" : "split_processing";
  }
  if (inv.settlement_id) return inv.settlement_status === "paid" ? "manual_paid" : "manual_processing";
  return "legacy";
};

export const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  split_paid: "Sudah Ditransfer",
  split_processing: "Menunggu Konfirmasi Bank",
  manual_processing: "Pencairan Diproses",
  manual_paid: "Sudah Dicairkan",
  legacy: "Saldo Lama",
  offline: "Diterima Langsung",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

export type SplitDay = {
  code: string;
  date: string;
  settleDate: string;
  count: number;
  total: number;
  status: "paid" | "processing";
  items: any[];
};

export const groupSplitByDay = (items: any[], now: Date = new Date()): SplitDay[] => {

  const map = new Map<string, any[]>();
  for (const it of items) {
    if (!it.paid_at) continue;
    const k = wibDateKey(it.paid_at);
    map.set(k, [...(map.get(k) || []), it]);
  }
  return [...map.entries()]
    .map(([date, list]) => {
      const settleDate = nextBusinessDay(date);
      return {
        code: `STL-${MONTHS[Number(date.slice(5, 7)) - 1]}-${date.replace(/-/g, "")}`,
        date,
        settleDate,
        count: list.length,
        total: list.reduce((s, x) => s + Number(x.total_amount ?? 0), 0),
        status: (list.every(i => payoutStatus(i, now) === "split_paid") ? "paid" : "processing") as SplitDay["status"],
        items: list,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};
