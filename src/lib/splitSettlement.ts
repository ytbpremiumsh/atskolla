// Mengelompokkan pembayaran split otomatis per hari (WIB) dan memperkirakan
// status pencairan: dana dianggap masuk rekening pada hari kerja berikutnya (T+1).

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

export type SplitDay = {
  date: string;
  settleDate: string;
  count: number;
  total: number;
  status: "paid" | "processing";
  items: any[];
};

export const groupSplitByDay = (items: any[], now: Date = new Date()): SplitDay[] => {
  const today = wibDateKey(now.toISOString());
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
        date,
        settleDate,
        count: list.length,
        total: list.reduce((s, x) => s + Number(x.net_amount ?? x.total_amount ?? 0), 0),
        status: (today >= settleDate ? "paid" : "processing") as SplitDay["status"],
        items: list,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};
