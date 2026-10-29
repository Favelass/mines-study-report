import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readSessions } from '../dist/sessions.js';
import { makeReport, weekStart } from '../dist/report.js';

const header = 'date,course,minutes,focus,notes\n';
const text = header + '2026-10-25,TFSD,30,2,Git\n2026-10-26,TFSD,90,4,Maven\n2026-10-27,Math,60,5,\n';
const sessions = readSessions(text);
const settings = { weeklyGoal: 120 };

test('CSV parsing handles BOM, quoted commas and multiline notes', () => {
  const items = readSessions('\ufeff' + header + '2026-10-26,"Math, algebra",60,4,"a\nb"\r\n');
  assert.equal(items[0].course, 'Math, algebra');
  assert.equal(items[0].notes, 'a\nb');
});

test('real calendar dates are required', () => {
  assert.throws(() => readSessions(header + '2026-02-29,TFSD,20,3,\n'), /Invalid data/);
  assert.equal(readSessions(header + '2028-02-29,TFSD,20,3,\n').length, 1);
});

test('missing, repeated and unknown headers are rejected', () => {
  for (const bad of ['date,course,focus\n', 'date,course,minutes,focus,focus\n', 'date,course,minutes,focus,extra\n']) {
    assert.throws(() => readSessions(bad), /headers/);
  }
});

test('duration and focus are checked without accepting blank values', () => {
  for (const [minutes, focus] of [['0', '3'], ['20.5', '4'], ['1441', '4'], ['30', '6'], ['', '3']]) {
    assert.throws(() => readSessions(header + `2026-10-26,TFSD,${minutes},${focus},\n`));
  }
});

test('totals and focus use session durations', () => {
  const report = makeReport(sessions, settings);
  assert.equal(report.minutes, 180);
  assert.equal(report.sessions, 3);
  assert.equal(report.averageFocus, 4);
  assert.equal(report.courses.find(item => item.name === 'TFSD').minutes, 120);
});

test('weeks start on Monday, including around New Year', () => {
  assert.equal(weekStart('2026-10-25'), '2026-10-19');
  assert.equal(weekStart('2026-10-26'), '2026-10-26');
  assert.equal(weekStart('2027-01-01'), '2026-12-28');
  assert.deepEqual(makeReport(sessions, settings).weeks.map(week => week.remainingMinutes), [90, 0]);
});

test('course and date filters are inclusive', () => {
  const report = makeReport(sessions, { ...settings, from: '2026-10-26', until: '2026-10-26', course: 'TFSD' });
  assert.equal(report.sessions, 1);
  assert.equal(report.minutes, 90);
});

test('invalid intervals and weekly goals are rejected', () => {
  assert.throws(() => makeReport(sessions, { ...settings, from: '2026-11-01', until: '2026-10-01' }));
  assert.throws(() => makeReport(sessions, { ...settings, until: '2026-02-30' }));
  assert.throws(() => makeReport(sessions, { weeklyGoal: 0 }));
});

test('header-only CSV and an empty selection give empty reports', () => {
  assert.equal(makeReport(readSessions(header), settings).averageFocus, 0);
  assert.deepEqual(makeReport(sessions, { ...settings, course: 'Unknown' }).weeks, []);
});

test('CLI prints valid JSON with the expected totals', () => {
  const output = execFileSync(process.execPath, ['dist/cli.js', 'examples/sessions.csv', '--course', 'TFSD', '--json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(output).minutes, 270);
});

test('CLI exits with an error for a missing file or bad option', () => {
  for (const args of [['missing.csv'], ['examples/sessions.csv', '--weekly-goal', '0'], ['examples/sessions.csv', '--invalid']]) {
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /error/i);
  }
});
