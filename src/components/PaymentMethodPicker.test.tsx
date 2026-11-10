import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentMethodPicker } from "./PaymentMethodPicker";
afterEach(cleanup);
const methods = [{id:"QRIS",channel:"qris",label:"QRIS"},{id:"VIRTUAL_ACCOUNT_BCA",channel:"va",label:"BCA"},{id:"ONLINE_TO_OFFLINE_ALFA",channel:"retail",label:"Alfamart"}];
const props = {open:true,onOpenChange:vi.fn(),billAmount:100000,onConfirm:vi.fn(),paymentMethods:methods};
it("menyembunyikan metode nonaktif dan mengikuti perubahan saat dialog terbuka",()=>{
 const {rerender}=render(<PaymentMethodPicker {...props} enabledChannels={["qris"]}/>);
 expect(screen.getByRole("button",{name:/QRIS/})).toBeTruthy();
 expect(screen.queryByRole("button",{name:/Virtual Account/})).toBeNull();
 rerender(<PaymentMethodPicker {...props} enabledChannels={["va"]}/>);
 expect(screen.queryByRole("button",{name:/QRIS/})).toBeNull();
 expect(screen.getByRole("button",{name:/Virtual Account/}).getAttribute("aria-pressed")).toBe("true");
});
it("tidak menawarkan pembayaran jika semua metode nonaktif",()=>{
 render(<PaymentMethodPicker {...props} enabledChannels={[]}/>);
 expect(screen.queryByRole("button",{name:/QRIS/})).toBeNull();
 expect(screen.getByText("Pembayaran online sedang dinonaktifkan sekolah.")).toBeTruthy();
 expect(screen.getByRole("button",{name:/Lanjut/}).hasAttribute("disabled")).toBe(true);
});
