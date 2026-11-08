import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import { SchoolSetupPanel } from "./SchoolSetupGuide";
import { emptySetup } from "@/lib/schoolSetup";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
afterEach(cleanup);
it("keeps setup destinations and unknown statuses accessible in the compact checklist", () => {
  render(
    <MemoryRouter>
      <SchoolSetupPanel
        admin
        data={{ ...emptySetup, identity: false, classes: 0, students: 0 }}
        onRefresh={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: /^Identitas sekolah:/ })).toHaveAttribute(
    "href", "/school-settings",
  );
  expect(screen.getByRole("list", { name: "Tahapan persiapan" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Jadwal pelajaran:/ })).toHaveAccessibleName(
    expect.stringContaining("Belum terkonfirmasi"),
  );
});
it("takes operators to an actionable school menu instead of admin-only settings", () => {
  render(
    <MemoryRouter>
      <SchoolSetupPanel
        admin={false}
        data={{ ...emptySetup, identity: false, classes: 0 }}
        onRefresh={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: /^Kelas:/ })).toHaveAttribute(
    "href",
    "/classes",
  );
  expect(
    screen.queryByRole("link", { name: /^Rekening pencairan:/ }),
  ).not.toBeInTheDocument();
});
it("shows only the first incomplete stage guidance and merges treasurer into Guru / Staff", () => {
  const data = { ...emptySetup, identity: true, classes: 1, students: 1, team: 0, treasurers: 0 };
  const { rerender } = render(
    <MemoryRouter><SchoolSetupPanel admin data={data} onRefresh={() => {}} /></MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: /^Guru \/ Staff:/ })).toHaveAttribute("aria-current", "step");
  expect(screen.getByText(/Tambahkan guru dan staff sesuai tugas/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tambah Bendahara" })).toHaveAttribute("href", "/bendahara-manage");
  expect(screen.queryByText("Atur mapel, guru, dan jam per kelas.")).not.toBeInTheDocument();
  rerender(<MemoryRouter><SchoolSetupPanel admin data={{ ...data, team: 1 }} onRefresh={() => {}} /></MemoryRouter>);
  expect(screen.getByRole("link", { name: /^Jadwal pelajaran:/ })).toHaveAttribute("aria-current", "step");
  expect(screen.getByText("Atur mapel, guru, dan jam per kelas.")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tambah Bendahara" })).not.toBeInTheDocument();
});
it("allows finishing after account submission without claiming provider verification, and hides the card", () => {
  const data = { ...emptySetup, identity: true, classes: 1, students: 1, team: 1, schedules: 1, whatsapp: "connected" as const, bank: "pending" as const };
  render(<MemoryRouter><SchoolSetupPanel admin data={data} onRefresh={() => {}} /></MemoryRouter>);
  expect(screen.queryByText("Link wali")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Selesai" })).toBeInTheDocument();
  expect(screen.getByText(/Verifikasi rekening diproses terpisah/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
  expect(screen.queryByRole("region", { name: "Persiapan sekolah" })).not.toBeInTheDocument();
});
it.each([0, 1])("guides admins through the treasurer role instead of opening bank entry (treasurers=%s)", (treasurers) => {
  const data = { ...emptySetup, identity: true, classes: 1, students: 1, team: 1, schedules: 1, whatsapp: "connected" as const, bank: "missing" as const, treasurers };
  render(<MemoryRouter><SchoolSetupPanel admin data={data} onRefresh={() => {}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Lanjutkan: Rekening" }));
  expect(screen.getByRole("dialog")).toHaveAccessibleName(treasurers === 0 ? "Tambahkan Bendahara terlebih dahulu" : "Ajukan melalui akun Bendahara");
  expect(screen.getByText(/keluar dari akun Admin dan masuk menggunakan akun Bendahara/)).toBeInTheDocument();
  if (treasurers === 0) {
    expect(screen.getByRole("link", { name: "Tambah Bendahara" })).toHaveAttribute("href", "/bendahara-manage");
  } else {
    expect(screen.queryByRole("link", { name: "Tambah Bendahara" })).not.toBeInTheDocument();
  }
  expect(screen.queryByRole("link", { name: /Lanjutkan: Rekening/ })).not.toBeInTheDocument();
});
