import { describe, it, expect } from "vitest";
import { groupSplitByDay, nextBusinessDay } from "./splitSettlement";

describe("split settlement harian", () => {
  it("Jumat dicairkan Senin", () => {
    expect(nextBusinessDay("2026-11-06")).toBe("2026-11-09");
  });
  it("pembayaran hari ini masih diproses, kemarin (hari kerja) sudah paid", () => {
    const now = new Date("2026-11-10T03:00:00Z"); // Selasa 10:00 WIB
    const days = groupSplitByDay(
      [
        { paid_at: "2026-11-10T02:00:00Z", total_amount: 1000 },
        { paid_at: "2026-11-10T01:00:00Z", total_amount: 2000 },
        { paid_at: "2026-11-09T02:00:00Z", total_amount: 500 },
      ],
      now,
    );
    expect(days[0]).toMatchObject({ date: "2026-11-10", count: 2, total: 3000, status: "processing" });
    expect(days[1]).toMatchObject({ date: "2026-11-09", status: "paid" });
  });
});
