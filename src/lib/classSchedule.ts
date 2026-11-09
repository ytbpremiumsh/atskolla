/** TeachingSchedule and LiveSchedule store Monday as 0, through Sunday as 6. */
export const SCHEDULE_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

/** Date.getDay() uses Sunday=0; teaching_schedules uses Monday=0. */
export function scheduleDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export interface ScheduleEntry {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  notes: string | null;
  is_active: boolean;
}
export interface ScheduleForm {
  teacher_id: string;
  subject_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  notes: string;
}
export type TimeRow = { start: number; end: number };
export type ScheduleCell = { entries: ScheduleEntry[]; rowSpan: number } | null;

export function timeMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(time);
  if (!match) return NaN;
  const hour = Number(match[1]), minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : NaN;
}
export function formatMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function validRange(entry: Pick<ScheduleForm, "start_time" | "end_time">) {
  const start = timeMinutes(entry.start_time), end = timeMinutes(entry.end_time);
  return Number.isFinite(start) && Number.isFinite(end) && start < end;
}
export function overlaps(a: Pick<ScheduleEntry, "start_time" | "end_time">, b: Pick<ScheduleEntry, "start_time" | "end_time">) {
  return validRange(a) && validRange(b) && timeMinutes(a.start_time) < timeMinutes(b.end_time) && timeMinutes(b.start_time) < timeMinutes(a.end_time);
}
export function conflictsFor(candidate: ScheduleForm, entries: ScheduleEntry[], ignoreId?: string) {
  return entries.filter((entry) => entry.is_active !== false && entry.id !== ignoreId && entry.day_of_week === candidate.day_of_week &&
    (entry.class_id === candidate.class_id || entry.teacher_id === candidate.teacher_id) && overlaps(entry, candidate));
}
export function buildTimeRows(entries: ScheduleEntry[]): TimeRow[] {
  const valid = entries.filter((entry) => entry.is_active !== false && validRange(entry));
  const boundaries = [...new Set(valid.flatMap((entry) => [timeMinutes(entry.start_time), timeMinutes(entry.end_time)]))].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, i) => ({ start, end: boundaries[i + 1] }))
    .filter((row) => valid.some((entry) => timeMinutes(entry.start_time) <= row.start && timeMinutes(entry.end_time) >= row.end));
}
export function buildDayCells(rows: TimeRow[], entries: ScheduleEntry[], day: number): ScheduleCell[] {
  const daily = entries.filter((entry) => entry.is_active !== false && entry.day_of_week === day && validRange(entry));
  const matches = rows.map((row) => daily.filter((entry) => timeMinutes(entry.start_time) <= row.start && timeMinutes(entry.end_time) >= row.end));
  const cells: ScheduleCell[] = [];
  for (let i = 0; i < rows.length; i++) {
    const current = matches[i];
    let span = 1;
    if (current.length === 1) {
      while (i + span < rows.length && rows[i + span - 1].end === rows[i + span].start &&
        matches[i + span].length === 1 && matches[i + span][0].id === current[0].id) span++;
    }
    cells[i] = { entries: current, rowSpan: span };
    for (let j = 1; j < span; j++) cells[i + j] = null;
    i += span - 1;
  }
  return cells;
}
