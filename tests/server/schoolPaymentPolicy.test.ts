import {it,expect} from "vitest";
import {DOKU_METHODS,paymentQuote,schoolNetSettlement,requireSchoolPaymentChannel,paymentCostConfig} from "../../supabase/functions/_shared/schoolPaymentPolicy";
it("biaya gateway dari sekolah dan admin tetap utuh",()=>{
 const quote=paymentQuote(100000,3000,"QRIS");expect(quote).toMatchObject({gross:103000,fee:721,school:99279,admin:3000});expect(quote.gross-quote.fee-quote.school).toBe(3000);
 expect(schoolNetSettlement("BANK",quote.school)).toEqual([{bank_account_settlement_id:"BANK",value:99279,type:"FIX"}]);
});
it("tarif QRIS rendah mengikuti total yang dibayar, bukan pokok",()=>{expect(paymentQuote(97000,3000,"QRIS").fee).toBe(555);expect(paymentQuote(97001,3000,"QRIS").fee).toBe(700);});
it("VA dan retail hanya memakai tarif final terkonfirmasi",()=>{expect(()=>paymentQuote(100000,3000,"VIRTUAL_ACCOUNT_BCA")).toThrow("belum dikonfirmasi");const q=paymentQuote(100000,3000,"VIRTUAL_ACCOUNT_BCA",{VIRTUAL_ACCOUNT_BCA:4995});expect(q.school).toBe(95005);expect(q.gross-q.fee-q.school).toBe(3000);});
it("menolak saldo yang tidak cukup untuk biaya gateway",()=>{expect(()=>paymentQuote(500,3000,"QRIS")).toThrow("tidak cukup");});
it("metode dinonaktifkan sekolah ditolak di server",async()=>{const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{enabled_channels:["qris"]}})})})})};expect(await requireSchoolPaymentChannel(db,"school",null)).toBe("qris");await expect(requireSchoolPaymentChannel(db,"school","va")).rejects.toThrow("dinonaktifkan");});
it("tarif tidak tersedia gagal tertutup",async()=>{const db={from:()=>({select:()=>({in:async()=>({error:new Error("offline")})})})};await expect(paymentCostConfig(db)).rejects.toThrow("belum tersedia");});

 it("BSI memakai kode DOKU sendiri dan tidak memakai tarif CIMB",()=>{ expect(DOKU_METHODS.find(m=>m.label==="BSI")?.id).toBe("VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI"); expect(()=>paymentQuote(100000,3000,"VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",{VIRTUAL_ACCOUNT_BANK_CIMB:4000})).toThrow(); });
