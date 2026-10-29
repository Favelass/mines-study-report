import { parse } from 'csv-parse/sync';
import { z } from 'zod';

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

const sessionSchema = z.object({
  date: z.string().refine(isDate, 'Use a real date in YYYY-MM-DD format'),
  course: z.string().trim().min(1).max(100),
  minutes: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1440)),
  focus: z.string().regex(/^[1-5]$/).transform(Number),
  notes: z.string().default('')
}).strict();

export type Session = z.infer<typeof sessionSchema>;

export function readSessions(text: string): Session[] {
  let columns: string[] = [];
  const rows = parse(text, {
    bom: true,
    columns: (headers: string[]) => {
      columns = headers;
      return headers;
    },
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];
  const required = ['date', 'course', 'minutes', 'focus'];
  const allowed = [...required, 'notes'];
  if (required.some(name => !columns.includes(name)) ||
      columns.some(name => !allowed.includes(name)) ||
      new Set(columns).size !== columns.length) {
    throw new Error('CSV headers must be date,course,minutes,focus with optional notes');
  }
  return rows.map((row, index) => {
    const result = sessionSchema.safeParse(row);
    if (!result.success) {
      const detail = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      throw new Error(`Invalid data record ${index + 1}: ${detail}`);
    }
    return result.data;
  });
}
