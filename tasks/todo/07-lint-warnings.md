# 07 Reduce the 36 lint warnings
Priority: medium     Size: M     Risk: low

## Why
The warning count is a ratchet (`--max-warnings 36` in `package.json`). They are real design debt: refs read or written during render, state set in effects, missing hook dependencies.

## What
- Fix them file by file; lower `--max-warnings` after each batch. Never raise it.
- Groups: `react-hooks/refs` (12), `set-state-in-effect` (14+), `exhaustive-deps` (9), memoization (1). Most sit in `useSimulationRun`, `useLazyShapleyAttribution`, `GuidedInlineValue`, `GuidedDefinitionTextarea`, `ScenarioPercentTable`.
- Behaviour must not change; effects that reset state on a key change can often become `key` props or derived values.

- **Unblocks Dependabot**: `eslint-plugin-react-hooks` 7.1.x reports 75 warnings and one error (`react-hooks/immutability`, `AnalysisLibraryNav.tsx` effect uses `openNewAnalysisDialog` before its declaration). It is held back in `.github/dependabot.yml`; when the code passes with 7.1.x, remove that ignore entry and bump the package.

## Check
- `npm run check`, then the browser flow for the file touched.

## Result
