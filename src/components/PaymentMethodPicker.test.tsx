import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentMethodPicker } from "./PaymentMethodPicker";
afterEach(cleanup);
const methods = [{id:"QRIS",channel:"qris",label:"QRIS"},{id:"VIRTUAL_ACCOUNT_BNI",channel:"va",label:"BNI"},{id:"ONLINE_TO_OFFLINE_ALFA",channel:"retail",label:"Alfamart"}];
const props = {open:true,onOpenChange:vi.fn(),billAmount:100000,onConfirm:vi.fn(),paymentMethods:methods};
it("menyembunyikan metode nonaktif dan mengikuti perubahan saat dialog terbuka",()=>{
 const {rerender}=render(<PaymentMethodPicker {...props} enabledChannels={["qris"]}/>);
 expect(screen.getByRole("button",{name:/QRIS/})).toBeTruthy();
 expect(screen.queryByRole("button",{name:/Transfer Bank/})).toBeNull();
 rerender(<PaymentMethodPicker {...props} enabledChannels={["va"]}/>);
 expect(screen.queryByRole("button",{name:/QRIS/})).toBeNull();
 expect(screen.getByRole("button",{name:/Transfer Bank/}).getAttribute("aria-pressed")).toBe("true");
});
it("tidak menawarkan pembayaran jika semua metode nonaktif",()=>{
 render(<PaymentMethodPicker {...props} enabledChannels={[]}/>);
 expect(screen.queryByRole("button",{name:/QRIS/})).toBeNull();
 expect(screen.getByText("Pembayaran online sedang dinonaktifkan sekolah.")).toBeTruthy();
 expect(screen.getByRole("button",{name:/Lanjut/}).hasAttribute("disabled")).toBe(true);
});
it("logo dan pilihan bank/gerai mengikuti metode yang tersedia",()=>{
 const available=[{id:"VIRTUAL_ACCOUNT_BRI",channel:"va",label:"BRI"},{id:"ONLINE_TO_OFFLINE_INDOMARET",channel:"retail",label:"Indomaret"},{id:"VIRTUAL_ACCOUNT_BANK_CIMB",channel:"va",label:"CIMB Niaga"}];
 render(<PaymentMethodPicker {...props} enabledChannels={["va","retail"]} paymentMethods={available}/>);
 expect(screen.getByRole("img",{name:"BRI"})).toBeTruthy();
 expect(screen.getByRole("img",{name:"Indomaret"})).toBeTruthy();
 expect(screen.queryByRole("img",{name:"BNI"})).toBeNull();
 expect(screen.queryByRole("img",{name:"Alfamart"})).toBeNull();
 expect(screen.queryByRole("option",{name:"CIMB Niaga"})).toBeNull();
 expect(screen.queryByRole("option",{name:"BNI"})).toBeNull();
});
