import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { InvoiceBankGuardProvider, useInvoiceBankGuard } from "./InvoiceBankGuard";
const mock = vi.hoisted(() => ({ state: "pending", save: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ roles: ["bendahara"] }) }));
vi.mock("@/lib/invoiceBankVerification", () => ({ checkInvoiceBank: async () => mock.state }));
afterEach(() => { cleanup(); mock.save.mockClear(); });
function CreateInvoice() {
  const guard = useInvoiceBankGuard();
  return <button onClick={async () => { if (await guard("school")) mock.save(); }}>Buat tagihan</button>;
}
it.each(["pending", "none", "rejected", "unavailable"])("shows an explanatory popup and never writes an invoice for %s", async (state) => {
  mock.state = state;
  render(<MemoryRouter><InvoiceBankGuardProvider><CreateInvoice /></InvoiceBankGuardProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Buat tagihan" }));
  expect(await screen.findByRole("dialog")).toHaveAccessibleName("Tagihan belum dapat dibuat");
  expect(mock.save).not.toHaveBeenCalled();
});
it("allows creation only after live verification succeeds", async () => {
  mock.state = "verified";
  render(<MemoryRouter><InvoiceBankGuardProvider><CreateInvoice /></InvoiceBankGuardProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Buat tagihan" }));
  await waitFor(() => expect(mock.save).toHaveBeenCalledOnce());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
