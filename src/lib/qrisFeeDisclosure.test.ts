import { describe,it,expect } from "vitest";
import { qrisFeeDisclosure,computeQrisFee } from "./paymentChannels";
describe("transparansi biaya QRIS",()=>{
 it("menjelaskan minimum dan ambang",()=>{const d=qrisFeeDisclosure(100000);expect(d.policy).toContain("1%");expect(d.threshold.replace(/\s/g,"")).toContain("Rp300.000");expect(d.calculation).toContain("Berlaku biaya minimum");expect(computeQrisFee(300000)).toBe(3000);});
 it("menjelaskan biaya di atas ambang",()=>{const d=qrisFeeDisclosure(1000000);expect(d.calculation.replace(/\s/g,"")).toContain("Rp10.000");expect(computeQrisFee(1000000)).toBe(10000);});
 it("mengikuti konfigurasi server dan nominal cicilan",()=>{const d=qrisFeeDisclosure(500000,.007);expect(d.policy).toContain("0,7%");expect(d.calculation.replace(/\s/g,"")).toContain("Rp3.500");});
 it("tidak menampilkan ambang tak hingga pada tarif nol",()=>{expect(qrisFeeDisclosure(100000,0).threshold).toContain("setiap nominal");});
});
