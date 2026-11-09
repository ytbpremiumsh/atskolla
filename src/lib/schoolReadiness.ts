export type StudentSetupRow = { name: string; student_id: string; class: string; card_number: string | null; parent_name: string; parent_phone: string };
export type StudentIssues = { incomplete: number; class: number; card: number; guardian: number; identity: number };
const normalized = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("id-ID");
export function studentReadiness(students: StudentSetupRow[], classes: { name: string }[]): StudentIssues {
  const names = new Set(classes.map((c) => normalized(c.name)));
  const frequency = (values: string[]) => values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>());
  const ids = frequency(students.map((s) => normalized(s.student_id)));
  const cards = frequency(students.map((s) => (s.card_number ?? "").replace(/\s/g, "")));
  const result: StudentIssues = { incomplete: 0, class: 0, card: 0, guardian: 0, identity: 0 };
  for (const student of students) {
    const card = (student.card_number ?? "").replace(/\s/g, "");
    const phone = student.parent_phone.replace(/[\s()+.-]/g, "");
    const identity = !student.name.trim() || !normalized(student.student_id) || (ids.get(normalized(student.student_id)) ?? 0) > 1;
    const invalidClass = !normalized(student.class) || !names.has(normalized(student.class));
    const invalidCard = !/^\d{16}$/.test(card) || (cards.get(card) ?? 0) > 1;
    // Sharing one guardian phone across siblings is intentional and valid.
    const guardian = !student.parent_name.trim() || !/^(?:08\d{8,11}|628\d{8,11})$/.test(phone);
    result.identity += Number(identity); result.class += Number(invalidClass);
    result.card += Number(invalidCard); result.guardian += Number(guardian);
    result.incomplete += Number(identity || invalidClass || invalidCard || guardian);
  }
  return result;
}
export function validTimeRange(start: string | null, end: string | null): boolean {
  const parse = (value: string | null) => {
    const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value ?? "");
    return match && +match[1] < 24 && +match[2] < 60 ? +match[1] * 60 + +match[2] : null;
  };
  const a = parse(start), b = parse(end);
  return a !== null && b !== null && a < b;
}
export async function readSetupPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await read(offset, offset + 499);
    if (page.error) throw page.error;
    const data = page.data ?? [];
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
