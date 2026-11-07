import { describe, it, expect } from "vitest";
import { groupSplitByDay, nextBusinessDay } from "./splitSettlement";

describe("split settlement harian", () => {
  it("Jumat dicairkan Senin", () => {
    expect(nextBusinessDay("2026-11-06")).toBe("2026-11-09");
  });
  it("status pencairan per transaksi", async () => {
    const { payoutStatus } = await import("./splitSettlement");
    const now = new Date("2026-11-10T03:00:00Z");
    expect(payoutStatus({ doku_split: true, paid_at: "2026-11-10T02:00:00Z" }, now)).toBe("split_processing");
    expect(payoutStatus({ doku_split: true, paid_at: "2026-11-06T02:00:00Z" }, now)).toBe("split_processing");
    expect(payoutStatus({ payment_method: "offline_cash" }, now)).toBe("offline");
    expect(payoutStatus({ payment_method: "doku", settlement_id: "x" }, now)).toBe("manual_processing");
    expect(payoutStatus({ payment_method: "doku" }, now)).toBe("legacy");
  });
  it("tanggal berlalu tidak membuktikan dana diterima bank", () => {
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
    expect(days[1]).toMatchObject({ date: "2026-11-09", status: "processing" });
  });
});

describe("kode STL harian", () => {
  it("memakai singkatan bulan", () => {
    const [d] = groupSplitByDay([{ paid_at: "2026-11-06T02:00:00Z", total_amount: 1 }], new Date("2026-11-06T03:00:00Z"));
    expect(d.code).toBe("STL-NOV-20261106");
  });
});

// Only an explicit provider receipt can change the split state to transferred.
it("membutuhkan konfirmasi settlement dan waktu konfirmasi", async () => {
 const {payoutStatus}=await import("./splitSettlement");
 expect(payoutStatus({doku_split:true,settlement_status:"paid"})).toBe("split_processing");
 expect(payoutStatus({doku_split:true,settlement_status:"paid",settlement_confirmed_at:"2026-11-07T01:00:00Z"})).toBe("split_paid");
 expect(payoutStatus({settlement_id:"s",settlement_status:"processing"})).toBe("manual_processing");
 expect(payoutStatus({settlement_id:"s",settlement_status:"paid"})).toBe("manual_paid");
});
