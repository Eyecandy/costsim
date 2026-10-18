# 00 Make costsim modular and best practice
Priority: high     Size: L     Risk: medium

## Why
`costsim` was one 4,459-line `App.tsx` with no conventions, lint, CI or component tests.

## What
- Layered `src/` (domain, persistence, workers, shared, features, app, pdf) enforced by dependency-cruiser.
- ESLint, Prettier, Husky, strict TypeScript, CI, Dependabot, `CLAUDE.md`.
- Error boundary, typed i18n keys, lazy-loaded routes, security headers.
- Behavioural component tests with a coverage floor.
- Splits of the largest hooks and components, each compared with the original in the browser.

## Check
- `npm run check`: 0 lint errors, 36 warnings, 1,367 tests, no layer violations, build.

## Result
Pushed to `origin/main`; the full log with dates, sizes and what was compared is in `docs/refactor-tasks.md`. Open work is on this board.
