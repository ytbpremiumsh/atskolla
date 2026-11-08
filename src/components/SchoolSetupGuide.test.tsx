import { cleanup, render, screen } from "@testing-library/react";
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
