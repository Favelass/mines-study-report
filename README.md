# Mines Study Report

I made a small command-line tool to analyse study sessions. The input is a CSV file. The tool checks the values, calculates totals by course and by week, and compares the weekly time with a target. It can print a text report or JSON.

## Requirements

Use Node.js 24 and npm 11. The build was checked with Node.js 24.22.1 and npm 11.6.2. No API key or external service is needed to run the program. The example data is invented.

## Install, build and run

```bash
git clone https://github.com/Favelass/mines-study-report.git
cd mines-study-report
npm ci --ignore-scripts
npm run build
npm start -- examples/sessions.csv
```

`npm ci` installs the versions in `package-lock.json`. `npm run build` removes the previous output and compiles TypeScript to JavaScript with `tsc`. The generated files go into `dist/`.

Examples:

```bash
npm start -- examples/sessions.csv --course TFSD
npm start -- examples/sessions.csv --from 2026-10-26 --until 2026-10-29
npm start -- examples/sessions.csv --weekly-goal 300 --json
npm start -- --help
```

## Input format

The required headers are `date,course,minutes,focus`. The `notes` header is optional. Columns can be reordered. Duplicate and unknown headers are rejected.

```csv
date,course,minutes,focus,notes
2026-10-26,TFSD,60,4,Build tools
2026-10-27,Mathematics,45,3,Exercises
```

Dates must be real dates in `YYYY-MM-DD` format. Duration is an integer from 1 to 1440 minutes. Focus is an integer from 1 to 5. CSV quoting, Windows line endings and a UTF-8 BOM are supported. Invalid input gives an error and a nonzero exit code.

Weeks start on Monday in UTC. Only weeks containing selected sessions are shown. Date filters include both boundaries. The weekly target applies to the selected sessions, even when a filter selects only part of a week. The focus average is weighted by duration: a 90-minute session has three times the weight of a 30-minute session. Session rows are counted separately, including identical rows.

## Tests

```bash
npm test
```

This rebuilds the project and runs the Node.js test runner. The tests check CSV quoting, invalid headers, leap years, durations, weighted averages, filters, weekly grouping and command-line errors. No extra test framework is needed.

## Dependency management

The runtime dependencies are `csv-parse` for CSV parsing, `zod` for validation and `commander` for command-line options. TypeScript and the Node.js type definitions are development dependencies. Exact direct versions are saved in `package.json`; the full resolved graph and integrity hashes are saved in `package-lock.json`.

```bash
npm ls --all
npm audit
npm sbom --sbom-format cyclonedx > sbom.cdx.json
```

An audit checks published vulnerability advisories. A clean result is useful, but does not prove the code has no security problems.

## Version and package

The version is stored in `package.json` and read by the CLI at runtime. To demonstrate a version change without creating a Git tag:

```bash
npm version patch --no-git-tag-version
npm start -- --version
```

This updates both the manifest and the lockfile. Do this in a disposable copy if you want to keep version 1.0.0.

To build a distributable package:

```bash
npm pack
```

The `prepack` task compiles the source first. The archive contains compiled JavaScript, type declarations, source maps, the example data, this README, the licence and `package.json`. Tests and local dependencies are excluded. Nothing is published to the npm registry by `npm pack`.

To test the package in a separate empty directory, replace the archive path with your own path:

```bash
npm init -y
npm install /absolute/path/mines-study-report-1.0.0.tgz
npx --no-install study-report --help
```

## Project structure

- `src/sessions.ts`: CSV parsing and input validation.
- `src/report.ts`: filters, calculations and text output.
- `src/cli.ts`: command-line interface.
- `test/report.test.mjs`: automated tests against the compiled code.
- `tsconfig.json`: strict TypeScript configuration and output settings.
- `package.json`: project metadata, dependencies, scripts and package contents.

The project is intentionally small, but it handles real input validation, several report options and packaging. It can later be extended with linting and generated API documentation for course 5.

## Licence

MIT.
