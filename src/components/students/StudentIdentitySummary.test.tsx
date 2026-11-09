import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudentIdentitySummary } from "./StudentIdentitySummary";
const mock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: mock }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("copies the exact card value, preserving leading zeroes", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  render(<StudentIdentitySummary student={{ card_number: "0012345678901234", student_id: "STD-001", class: "TKJ 1", parent_name: "Wali" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Salin nomor kartu" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("0012345678901234"));
  expect(mock.success).toHaveBeenCalled();
});
it("explains clipboard failures without leaving the page", async () => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
  render(<StudentIdentitySummary student={{ card_number: "1234567890123456" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Salin nomor kartu" }));
  await waitFor(() => expect(mock.error).toHaveBeenCalled());
  expect(screen.getByRole("region", { name: "Ringkasan identitas siswa" })).toBeInTheDocument();
});
