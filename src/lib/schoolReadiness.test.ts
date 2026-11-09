import { describe, expect, it } from "vitest";
import { readSetupPages, studentReadiness, validTimeRange } from "./schoolReadiness";
const child = { name: "Anak A", student_id: "NIS-1", class: "7A", card_number: "1234567890123456", parent_name: "Wali", parent_phone: "081234567890" };
describe("school readiness", () => {
  it("accepts siblings sharing a guardian but rejects duplicate cards and NIS", () => {
    const children = [child, { ...child, name: "Anak B", student_id: "NIS-2", card_number: "1234567890123457" }];
    expect(studentReadiness(children, [{ name: "7A" }]).incomplete).toBe(0);
    const duplicates = studentReadiness([child, { ...child }], [{ name: "7A" }]);
    expect(duplicates.card).toBe(2);
    expect(duplicates.identity).toBe(2);
    expect(duplicates.guardian).toBe(0);
  });
  it("reports affected pupils once while exposing each missing requirement", () => {
    const issues = studentReadiness([{ ...child, class: "missing", card_number: null, parent_phone: "123" }], [{ name: "7A" }]);
    expect(issues).toEqual({ incomplete: 1, class: 1, card: 1, guardian: 1, identity: 0 });
  });
  it("rejects missing and backwards time ranges", () => {
    expect(validTimeRange("06:00:00", "08:00:00")).toBe(true);
    expect(validTimeRange("13:00", "12:00")).toBe(false);
    expect(validTimeRange(null, "08:00")).toBe(false);
    expect(validTimeRange("25:00", "26:00")).toBe(false);
  });
  it("includes pupils beyond the first page, and propagates later read failures", async () => {
    const ranges: number[] = [];
    const rows = await readSetupPages(async (from) => { ranges.push(from); return { data: Array.from({ length: from === 0 ? 500 : 2 }, (_, i) => ({ id: from + i })), error: null }; });
    expect(rows).toHaveLength(502);
    expect(ranges).toEqual([0, 500]);
    await expect(readSetupPages(async (from) => ({ data: from === 0 ? Array(500).fill(1) : null, error: from > 0 ? new Error("offline") : null }))).rejects.toThrow("offline");
  });
});
