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
