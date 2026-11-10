import { describe, it, expect } from "vitest";
import { groupSplitByDay, nextBusinessDay, schoolSettlementKey } from "./splitSettlement";

const school = "11111111-1111-4111-8111-111111111111";

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
      school, now,
    );
    expect(days[0]).toMatchObject({ date: "2026-11-10", count: 2, total: 3000, status: "processing" });
    expect(days[1]).toMatchObject({ date: "2026-11-09", status: "processing" });
  });
});

describe("kode STL harian", () => {
  it("memakai identitas sekolah dan tanggal", () => {
    const [d] = groupSplitByDay([{ paid_at: "2026-11-06T02:00:00Z", total_amount: 1 }], school, new Date("2026-11-06T03:00:00Z"));
    expect(d.code).toBe(`STL-${schoolSettlementKey(school)}-20261106`);
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

it("estimasi berubah pukul 13 WIB tanpa mengubah status transfer", async () => {
  const { payoutSchedule } = await import("./splitSettlement");
  expect(payoutSchedule("2026-11-06", new Date("2026-11-09T05:59:59Z"))).toMatchObject({date:"2026-11-09",estimatedSent:false});
  expect(payoutSchedule("2026-11-06", new Date("2026-11-09T06:00:00Z"))).toMatchObject({estimatedSent:true});
  expect(payoutSchedule("2026-11-07").date).toBe("2026-11-09");
  expect(payoutSchedule("2026-11-08").date).toBe("2026-11-09");
});

it("kode berbeda antar sekolah, stabil dan menolak campuran sekolah", () => {
 const other = "11111111-1111-4111-8111-111111111112";
 const rows = [{school_id:school,paid_at:"2026-11-07T02:00:00Z",total_amount:2000},{school_id:other,paid_at:"2026-11-07T02:00:00Z",total_amount:5000}];
 const [a] = groupSplitByDay(rows,school); const [b] = groupSplitByDay(rows,other);
 expect(a.code).not.toBe(b.code); expect(a.total).toBe(2000); expect(b.total).toBe(5000);
 expect(groupSplitByDay(rows,school)[0].code).toBe(a.code);
 expect(groupSplitByDay(rows,"")).toEqual([]);
});

it("dana menunggu transfer mengecualikan transaksi yang terkonfirmasi berhasil", async () => {
 const {payoutStatus}=await import("./splitSettlement");
 const items=[{doku_split:true,total_amount:36000,settlement_status:"paid",settlement_confirmed_at:"2026-11-09T07:00:00Z"},{doku_split:true,total_amount:2000,settlement_status:"paid",settlement_confirmed_at:"2026-11-09T07:00:00Z"},{doku_split:true,total_amount:1000}];
 const pending=items.filter(i=>payoutStatus(i)==="split_processing");
 expect(pending).toHaveLength(1);expect(pending.reduce((sum,i)=>sum+i.total_amount,0)).toBe(1000);
 expect(items.filter(i=>payoutStatus(i)==="split_paid")).toHaveLength(2);
});

it("saldo mempertahankan konfirmasi invoice meskipun tidak ada baris settlement", async () => {
 const {invoicePayoutStatus,schoolReceiptAmount}=await import("./splitSettlement");
 const paid={doku_split:true,total_amount:36000,settlement_status:"paid",settlement_confirmed_at:"2026-11-09T07:00:00Z"};
 expect(invoicePayoutStatus(paid,[])).toBe("split_paid");
 expect(invoicePayoutStatus({...paid,settlement_id:"x"},[{id:"x",status:"processing"}])).toBe("split_paid");
 expect(invoicePayoutStatus({settlement_id:"x"},[{id:"x",status:"paid"}])).toBe("manual_paid");
 expect(invoicePayoutStatus({doku_split:true},[])).toBe("split_processing");
 expect(schoolReceiptAmount({payment_fee_model:"school_gateway_admin_v1",total_amount:100000,gateway_fee_estimate:721})).toBe(99279);
 expect(schoolReceiptAmount({total_amount:10000,net_amount:9445})).toBe(9445);
});

it("transaksi split lama menggunakan nominal sekolah, bukan saldo internal nol", async () => {
 const {schoolReceiptAmount,payoutStatus}=await import("./splitSettlement");
 expect(schoolReceiptAmount({doku_split:true,total_amount:1000,net_amount:0})).toBe(1000);
 expect(schoolReceiptAmount({doku_split:false,total_amount:1000,net_amount:0})).toBe(0);
 expect(payoutStatus({doku_split:false,total_amount:1000,settlement_status:"paid",settlement_confirmed_at:"2026-11-10T09:00:00Z"})).toBe("manual_paid");
 const [day]=groupSplitByDay([{doku_split:true,payment_fee_model:"school_gateway_admin_v1",paid_at:"2026-11-10T02:00:00Z",total_amount:100000,gateway_fee_estimate:721}],school);
 expect(day.total).toBe(99279);
});
