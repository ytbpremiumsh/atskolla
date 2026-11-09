import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptySetup, setupSteps, fetchSchoolSetup } from "./schoolSetup";
const mock = vi.hoisted(() => ({ failed: "", calls: [] as string[], treasurer: false, bankRows: [] as Record<string, unknown>[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      mock.calls.push(table);
      const b = {
        select: () => b,
        order: () => b,
        range: () => b,
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
                            holiday_days: [0, 6],
                            timezone: "Asia/Jakarta",
                            whatsapp: "",
                            email: "",
                          }
                        : table === "bendahara_bank_accounts" ? mock.bankRows
                        : table === "profiles" && mock.treasurer
                          ? [{ user_id: "user" }]
                        : table === "user_roles" && mock.treasurer
                          ? [{ user_id: "user", role: "bendahara" }]
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
  mock.treasurer = false;
  mock.bankRows = [];
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
  it("counts a current-user treasurer without counting them as an additional team member", async () => {
    mock.treasurer = true;
    const snapshot = await fetchSchoolSetup("school", "user", true);
    expect(snapshot.team).toBe(0);
    expect(snapshot.treasurers).toBe(1);
    expect(setupSteps(snapshot, true).some((step) => step.id === "payments")).toBe(false);
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
  it("does not complete student or teacher steps merely because unrelated records exist", () => {
    const steps = setupSteps({ ...emptySetup, students: 10, studentIssues: { incomplete: 1, class: 0, card: 0, guardian: 1, identity: 0 }, team: 2, teachers: 0, treasurers: 1 }, true);
    expect(steps.find((step) => step.id === "students")?.done).toBe(false);
    expect(steps.find((step) => step.id === "team")?.done).toBe(false);
  });
  it("requires configured attendance and coverage of all classes for schedules", () => {
    const data = { ...emptySetup, schedules: 3, attendanceReady: false, unscheduledClasses: 1, invalidSchedules: 0 };
    expect(setupSteps(data, true).find((step) => step.id === "schedules")).toMatchObject({ done: false, url: "/holidays" });
    expect(setupSteps({ ...data, attendanceReady: true }, true).find((step) => step.id === "schedules")?.done).toBe(false);
    expect(setupSteps({ ...data, attendanceReady: true, unscheduledClasses: 0 }, true).find((step) => step.id === "schedules")?.done).toBe(true);
  });
  it("requires an approved primary bank account with no review pending before marking it ready", async () => {
    mock.bankRows = [{ verification_status: "verified", is_default: false, doku_bank_account_settlement_id: "BNK-example", requires_review: false }];
    expect((await fetchSchoolSetup("school", "user", true)).bank).toBe("verified");
    mock.bankRows[0].is_default = true;
    expect((await fetchSchoolSetup("school", "user", true)).bank).toBe("linked");
    mock.bankRows[0].requires_review = true;
    expect((await fetchSchoolSetup("school", "user", true)).bank).toBe("pending");
    mock.bankRows[0].verification_status = "rejected";
    expect((await fetchSchoolSetup("school", "user", true)).bank).toBe("missing");
  });

});
