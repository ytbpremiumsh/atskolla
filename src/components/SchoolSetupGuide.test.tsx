import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import { SchoolSetupPanel } from "./SchoolSetupGuide";
import { emptySetup } from "@/lib/schoolSetup";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
afterEach(cleanup);
it("guides new schools to their next incomplete step and preserves unknown states", () => {
  render(
    <MemoryRouter>
      <SchoolSetupPanel
        admin
        data={{ ...emptySetup, identity: false, classes: 0, students: 0 }}
        onRefresh={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Lanjutkan" })).toHaveAttribute(
    "href",
    "/school-settings",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getAllByText("Belum terkonfirmasi").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Ringkas" }));
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
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
  expect(screen.getByRole("link", { name: "Lanjutkan" })).toHaveAttribute(
    "href",
    "/classes",
  );
  expect(
    screen.queryByRole("link", { name: "Buka rekening pencairan" }),
  ).not.toBeInTheDocument();
});
