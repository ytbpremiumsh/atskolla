import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptySetup, setupSteps, fetchSchoolSetup } from "./schoolSetup";
const mock = vi.hoisted(() => ({ failed: "", calls: [] as string[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      mock.calls.push(table);
      const b = {
        select: () => b,
        eq: () => b,
        neq: () => b,
        in: () => b,
        single: () => b,
        maybeSingle: () => b,
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(
            resolve(
              table === mock.failed
                ? { error: { message: "offline" }, data: null, count: null }
                : {
                    error: null,
                    count: 0,
                    data:
                      table === "schools"
                        ? {
                            name: "School",
                            timezone: "Asia/Jakarta",
                            whatsapp: "",
                            email: "",
                          }
                        : table === "school_integrations"
                          ? {
                              gateway_type: "mpwa",
                              mpwa_connected: false,
                              is_active: false,
                            }
                          : [],
                  },
            ),
          ),
      };
      return b;
    },
  },
}));
beforeEach(() => {
  mock.failed = "";
  mock.calls = [];
});
describe("school preparation guidance", () => {
  it("does not report failed/unknown checks as complete or treat optional banking as operational readiness", () => {
    const steps = setupSteps(emptySetup, true);
    expect(steps.every((s) => s.done === null)).toBe(true);
    expect(steps.find((s) => s.id === "bank")?.optional).toBe(true);
  });
  it("limits admin-only links for operators and distinguishes provider verification from approval", () => {
    const steps = setupSteps(
      { ...emptySetup, bank: "verified", whatsapp: "configured" },
      false,
    );
    expect(steps.filter((s) => !s.allowed).map((s) => s.id)).toEqual([
      "identity",
      "team",
      "bank",
    ]);
    expect(steps.find((s) => s.id === "bank")?.done).toBe(false);
    expect(steps.find((s) => s.id === "whatsapp")?.body).toContain(
      "belum dikonfirmasi",
    );
  });
  it("keeps a failed count unknown while completing independent reads and skips privileged operator queries", async () => {
    mock.failed = "classes";
    const snapshot = await fetchSchoolSetup("school", "user", false);
    expect(snapshot.classes).toBeNull();
    expect(snapshot.students).toBe(0);
    expect(snapshot.identity).toBe(false);
    expect(snapshot.whatsapp).toBe("missing");
    expect(mock.calls).not.toContain("user_roles");
    expect(mock.calls).not.toContain("bendahara_bank_accounts");
  });
});
