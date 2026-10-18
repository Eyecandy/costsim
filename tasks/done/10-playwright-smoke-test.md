# 10 Add a Playwright smoke test
Priority: medium     Size: M     Risk: low

## Why
Every refactor so far needed a manual side-by-side browser run against `../costsim`. A small automated smoke test would catch most breakage in seconds.

## What
- Add Playwright (large browser download; confirm before installing).
- One test: seed `cost-simulator:v1:projects`, open `/app`, run a simulation, open Focus and step through, open the library and create an analysis.
- Run it in CI as a separate job.

## Check
- Test passes locally and in CI; fails when a button label or route is broken on purpose.

## Result
`@playwright/test` added (dev dependency only; no browser download locally, it drives the installed Chrome; CI installs Chromium). `e2e/smoke.spec.ts` has 3 flows that pass in about 10 s: seeded run shows results, Focus mode steps forward and back, library creates an analysis. `npm run test:e2e`; separate `e2e` job in `.github/workflows/ci.yml` (report uploaded on failure). Extend it with a flow per risky area when refactoring.
