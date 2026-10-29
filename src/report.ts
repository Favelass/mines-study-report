import { isDate, type Session } from './sessions.js';

export interface ReportOptions {
  from?: string;
  until?: string;
  course?: string;
  weeklyGoal: number;
}

export interface Group {
  name: string;
  sessions: number;
  minutes: number;
  averageFocus: number;
}

export interface StudyReport {
  sessions: number;
  minutes: number;
  averageFocus: number;
  courses: Group[];
  weeks: (Group & { remainingMinutes: number })[];
}

export function weekStart(date: string): string {
  const day = new Date(date + 'T00:00:00Z');
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}

function averageFocus(sessions: Session[]): number {
  const minutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  if (minutes === 0) return 0;
  return Math.round(sessions.reduce((sum, session) => sum + session.minutes * session.focus, 0) / minutes * 100) / 100;
}

function groupSessions(sessions: Session[], key: (session: Session) => string): Group[] {
  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const name = key(session);
    const group = groups.get(name) ?? [];
    group.push(session);
    groups.set(name, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([name, items]) => ({
      name,
      sessions: items.length,
      minutes: items.reduce((sum, item) => sum + item.minutes, 0),
      averageFocus: averageFocus(items)
    }));
}

export function makeReport(sessions: Session[], options: ReportOptions): StudyReport {
  if ((options.from && !isDate(options.from)) || (options.until && !isDate(options.until))) {
    throw new Error('Date filters must use real dates in YYYY-MM-DD format');
  }
  if (options.from && options.until && options.from > options.until) {
    throw new Error('The start date must not be after the end date');
  }
  if (!Number.isInteger(options.weeklyGoal) || options.weeklyGoal < 1) {
    throw new Error('The weekly goal must be a positive integer in minutes');
  }
  const selected = sessions.filter(session =>
    (!options.from || session.date >= options.from) &&
    (!options.until || session.date <= options.until) &&
    (!options.course || session.course === options.course)
  );
  const weeks = groupSessions(selected, session => weekStart(session.date));
  return {
    sessions: selected.length,
    minutes: selected.reduce((sum, session) => sum + session.minutes, 0),
    averageFocus: averageFocus(selected),
    courses: groupSessions(selected, session => session.course),
    weeks: weeks.map(week => ({ ...week, remainingMinutes: Math.max(0, options.weeklyGoal - week.minutes) }))
  };
}

export function formatReport(report: StudyReport): string {
  const lines = [
    `Sessions: ${report.sessions}`,
    `Total study time: ${report.minutes} minutes`,
    `Average focus (weighted by minutes): ${report.averageFocus}/5`,
    '',
    'By course:'
  ];
  for (const course of report.courses) {
    lines.push(`  ${course.name}: ${course.minutes} minutes in ${course.sessions} session(s)`);
  }
  lines.push('', 'By week (Monday):');
  for (const week of report.weeks) {
    lines.push(`  ${week.name}: ${week.minutes} minutes, ${week.remainingMinutes} minutes below goal`);
  }
  if (report.sessions === 0) lines.push('No sessions match the selected filters.');
  return lines.join('\n');
}
