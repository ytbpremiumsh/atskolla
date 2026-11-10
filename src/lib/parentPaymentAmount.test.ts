import {it,expect} from "vitest";
import {parentPaymentRequest} from "./parentPaymentAmount";
import {computeQrisFee} from "./paymentChannels";
it("pelunasan memakai sisa yang sama pada picker dan permintaan server",()=>{const r=parentPaymentRequest("full",980000,1000000);expect(r).toEqual({action:"spp_pay_installment",amount:980000,fromChoice:true});expect(computeQrisFee(r.amount)).toBe(9800);expect(r.amount+computeQrisFee(r.amount)).toBe(989800);});
it("cicilan memakai nominal pilihan",()=>{expect(parentPaymentRequest("installment",10000,1000000).amount).toBe(10000);});
it("tagihan biasa tetap memakai nominal invoice",()=>{expect(parentPaymentRequest(null,980000,1000000)).toEqual({action:"spp_pay",amount:1000000,fromChoice:false});});
it("sisa nol tidak kembali ke total awal",()=>{expect(parentPaymentRequest("full",0,1000000).amount).toBe(0);});
