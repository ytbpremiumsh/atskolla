import { describe, expect, it, vi } from "vitest";
import { invoiceBankState, checkInvoiceBank } from "./invoiceBankVerification";
const mock = vi.hoisted(() => ({ error: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const q = { select: () => q, eq: () => q, then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: mock.error ? new Error("offline") : null })) }; return q;
} } }));
describe("invoice verification gate", () => {
  it("requires an active verified bank, including when other accounts exist", () => {
    expect(invoiceBankState([])).toBe("none");
    expect(invoiceBankState([{ is_active: false, verification_status: "verified" }])).toBe("none");
    expect(invoiceBankState([{ is_active: true, verification_status: "pending" }])).toBe("pending");
    expect(invoiceBankState([{ is_active: true, verification_status: "rejected" }])).toBe("rejected");
    expect(invoiceBankState([{ is_active: true, verification_status: "verified", requires_review: true }])).toBe("pending");
    expect(invoiceBankState([{ is_active: true, verification_status: "verified", requires_review: false }, { is_active: true, verification_status: "pending" }])).toBe("verified");
  });
  it("fails closed when the school or verification status cannot be checked", async () => {
    expect(await checkInvoiceBank(null)).toBe("unavailable");
    mock.error = true;
    expect(await checkInvoiceBank("school")).toBe("unavailable");
  });
});
