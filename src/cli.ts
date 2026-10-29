#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import { readSessions } from './sessions.js';
import { makeReport, formatReport } from './report.js';

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const program = new Command()
  .name('study-report')
  .description('Summarise study sessions from a CSV file')
  .version(metadata.version)
  .argument('<file>', 'CSV file to analyse')
  .option('--from <date>', 'First date to include, YYYY-MM-DD')
  .option('--until <date>', 'Last date to include, YYYY-MM-DD')
  .option('--course <name>', 'Only include this course (case sensitive)')
  .option('--weekly-goal <minutes>', 'Weekly target for the selected sessions', '600')
  .option('--json', 'Print the report as JSON')
  .action(async (file: string, flags: {from?: string; until?: string; course?: string; weeklyGoal: string; json?: boolean}) => {
    const sessions = readSessions(await readFile(file, 'utf8'));
    const report = makeReport(sessions, { ...flags, weeklyGoal: /^\d+$/.test(flags.weeklyGoal) ? Number(flags.weeklyGoal) : NaN });
    process.stdout.write(flags.json ? JSON.stringify(report, null, 2) + '\n' : formatReport(report) + '\n');
  });

try {
  await program.parseAsync();
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
