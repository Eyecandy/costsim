# 06 Move the remaining logic out of App.tsx
Priority: low     Size: M     Risk: medium

## Why
`App.tsx` is down from 4,459 lines but is still 1,087, mostly result storage (`apply*` functions), project editing handlers and library session wiring.

## What
- A `useLiveResults` hook for the result state and its `apply*` functions.
- A `useProjectEditing` hook for the project edit handlers.
- Keep call order identical to the current code.

## Check
- `npm run check`.
- Browser parity against `../costsim`: run, modes, Focus, library lifecycle (see `docs/refactor-tasks.md`, Phase 9d).

## Result
