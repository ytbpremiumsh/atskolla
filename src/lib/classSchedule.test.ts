import { describe, expect, it } from "vitest";
import { buildDayCells, buildTimeRows, conflictsFor, overlaps, timeMinutes, validRange, scheduleDayIndex, SCHEDULE_DAYS, type ScheduleEntry, type ScheduleForm } from "./classSchedule";
import { readFileSync } from 'node:fs';

describe('school and parent schedule weekday contract', () => {
  it('maps all seven calendar days to the school dashboard numbering', () => {
    for (let day = 0; day < 7; day++) {
      const date = new Date(2026, 10, 9 + day, 12);
      expect(scheduleDayIndex(date)).toBe(day);
      expect(SCHEDULE_DAYS[scheduleDayIndex(date)]).toBe(['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'][day]);
    }
  });
  it('keeps native APK day labels identical to the school dashboard', () => {
    const java = readFileSync('android-native/app/src/main/java/com/atskolla/parent/ScheduleDays.java', 'utf8');
    const names = [...java.matchAll(/"(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)"/g)].map(match => match[1]);
    expect(names).toEqual(SCHEDULE_DAYS);
    const activity = readFileSync('android-native/app/src/main/java/com/atskolla/parent/ParentActivity.java', 'utf8');
    expect(activity).toContain('ScheduleDays.fromIsoDay(day().getDayOfWeek().getValue())');
    expect(activity).toContain('String[] days=ScheduleDays.NAMES');
  });
});

const entry = (overrides: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
  id: "lesson-1", class_id: "class-a", teacher_id: "teacher-1", subject_id: "math", day_of_week: 0,
  start_time: "07:00:00", end_time: "08:20:00", is_active: true, room: "R.1", notes: null, ...overrides,
});
const form = (overrides: Partial<ScheduleForm> = {}): ScheduleForm => ({
  teacher_id: "teacher-1", subject_id: "math", class_id: "class-a", day_of_week: 0,
  start_time: "07:00", end_time: "08:20", room: "", notes: "", ...overrides,
});

describe("class schedule timetable", () => {
  it("uses stored times only, excluding invalid and inactive entries", () => {
    expect(buildTimeRows([])).toEqual([]);
    expect(buildTimeRows([entry(), entry({ id: "other", day_of_week: 1, end_time: "07:40" }), entry({ id: "inactive", start_time: "06:00", is_active: false }), entry({ id: "invalid", end_time: "06:00" })])).toEqual([{ start: 420, end: 460 }, { start: 460, end: 500 }]);
    expect(Number.isNaN(timeMinutes("24:00"))).toBe(true);
    expect(Number.isNaN(timeMinutes("08:60"))).toBe(true);
    expect(validRange(form({ end_time: "07:00" }))).toBe(false);
  });
  it("merges a long lesson into one cell spanning its actual intervals", () => {
    const lessons = [entry(), entry({ id: "short", day_of_week: 1, end_time: "07:40" })];
    const rows = buildTimeRows(lessons);
    const monday = buildDayCells(rows, lessons, 0);
    expect(monday[0]?.rowSpan).toBe(2);
    expect(monday[0]?.entries.map((item) => item.id)).toEqual(["lesson-1"]);
    expect(monday[1]).toBeNull();
    const tuesday = buildDayCells(rows, lessons, 1);
    expect(tuesday[0]?.rowSpan).toBe(1);
    expect(tuesday[1]?.entries).toEqual([]);
  });
  it("keeps blank slots usable for a class without any lessons", () => {
    const rows = buildTimeRows([entry()]);
    expect(buildDayCells(rows, [], 0)).toEqual([{ entries: [], rowSpan: 1 }]);
  });
  it("does not merge across a break or hide overlapping entries", () => {
    const a = entry({ end_time: "09:00" });
    const b = entry({ id: "overlap", start_time: "07:40", end_time: "08:20" });
    const rows = buildTimeRows([a, b]);
    const cells = buildDayCells(rows, [a, b], 0);
    expect(cells[1]?.entries.map((item) => item.id)).toEqual(["lesson-1", "overlap"]);
    expect(cells[0]?.rowSpan).toBe(1);
    expect(buildDayCells([{ start: 420, end: 460 }, { start: 480, end: 500 }], [a], 0).every((cell) => cell?.rowSpan === 1)).toBe(true);
  });
});

describe("schedule collision checks", () => {
  it("catches both class conflicts and teachers double-booked across classes", () => {
    const sameClass = entry({ teacher_id: "teacher-2" });
    const sameTeacher = entry({ id: "other-class", class_id: "class-b" });
    expect(conflictsFor(form(), [sameClass, sameTeacher])).toHaveLength(2);
    expect(conflictsFor(form({ class_id: "class-c", teacher_id: "teacher-3" }), [sameClass, sameTeacher])).toEqual([]);
  });
  it("allows adjacent slots, different days, inactive schedules and the edited row itself", () => {
    const a = entry();
    expect(overlaps(a, entry({ start_time: "08:20", end_time: "09:00" }))).toBe(false);
    expect(conflictsFor(form(), [a], a.id)).toEqual([]);
    expect(conflictsFor(form(), [entry({ day_of_week: 1 }), entry({ is_active: false })])).toEqual([]);
  });
});
