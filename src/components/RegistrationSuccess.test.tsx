import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { RegistrationSuccess } from "./RegistrationSuccess";
afterEach(cleanup);
it("keeps the new school login link visible and copies it without automatic redirection", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  render(
    <RegistrationSuccess
      schoolName="Sekolah Contoh"
      loginUrl="https://contoh.atskolla.com/admin"
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Sekolah berhasil didaftarkan" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Masuk dan siapkan sekolah" }),
  ).toHaveAttribute("href", "https://contoh.atskolla.com/admin");
  fireEvent.click(screen.getByRole("button", { name: "Salin alamat login" }));
  expect(writeText).toHaveBeenCalledWith("https://contoh.atskolla.com/admin");
});
