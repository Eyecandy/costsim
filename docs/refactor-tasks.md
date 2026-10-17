# Refactor task log (costsim-new)

Times are local (+02:00), taken from git commits unless marked "approx". Newest entries go at the bottom of each section.

## Done

| Date | Time | Task | Commit |
|---|---|---|---|
| 2026-10-17 | 18:44 | Baseline commit before any change (5 failing tests, 88 lint errors recorded) | ede83c8 |
| 2026-10-17 | 18:47 | Fix vitest config import so tests can start | 17fa834 |
| 2026-10-17 | 18:49 | Add dependency-cruiser layer rules (warn mode) and `check` scripts | 109776e |
| 2026-10-17 | 19:01 | Tests find the project root through one `repoRoot` helper | 0239b44 |
| 2026-10-17 | 19:14-19:26 | Split flat `lib/` into `domain/{simulation,results,analysis,guided}` and `persistence/` (5 commits) | a21e6c4..47033ed |
| 2026-10-17 | 19:30 | Take storage/reset side effects out of `domain/` | 9684d39 |
| 2026-10-17 | 19:33 | Move shared simulation types out of the worker entry; `simulation.ts` to `domain/`, workers to `workers/` | 20de486 |
| 2026-10-17 | 19:35 | Move `GuidedPhaseInfoContent` type so logic no longer imports UI | 89618e8 |
| 2026-10-17 | 19:43 | Extract pure table-mode predicates from `ScenarioPercentTable` | 4d3ddf4 |
| 2026-10-17 | 19:50 | Break the three import cycles | 53145b1 |
| 2026-10-17 | 19:54-19:59 | Group React code into `features/`, `app/`, `shared/`; remove empty folders; move auth to `shared/auth` (3 commits) | 77b10d2..43b7061 |
| 2026-10-17 | 20:00 | Layer rules describe the real layering and fail the build on violations | 05b1094 |
| 2026-10-17 | 20:01 | Replace Vite-template README with layout, layer rules, test notes | 92548e5 |
| 2026-10-17 | 20:04 | Pin line endings to LF (fixes four CRLF-sensitive tests) | a86b013 |
| 2026-10-17 | 20:10 (approx) | Push to `origin/main` (github.com/Eyecandy/costsim), 20 commits | - |
| 2026-10-17 | 20:19 | `ResultsPanel`: PDF rendering moved to `pdfExport.tsx`, loaded on demand | ef2abad |
| 2026-10-17 | 20:52 | Tests read the workspace screen through `readAppSource()` | 566432f |
| 2026-10-17 | 20:57 | `App`: layout constants, pure helpers, `PrimaryFocusModeEntry` to `app/workspace` | 9a8d469 |
| 2026-10-17 | 21:04 | `App`: sidebar, action-notice, dialog-state, stale-input-diff hooks | d31da51 |
| 2026-10-17 | 21:15 | `App`: `RenameAnalysisDialog`, `WorkspaceDialogs` | 69d742c |
| 2026-10-17 | 21:19 | `App`: `AnalysisHeader` | 55d322e |
| 2026-10-17 | 21:25 | `App`: `ProjectTabs` | cb43b5b |
| 2026-10-17 | 21:30 | `App`: `SimulationStrip` | f9bb057 |
| 2026-10-17 | 21:39 | `App`: `useSimulationRun` (worker lifecycle, progress, run handlers) | 45c39a3 |
| 2026-10-17 | 21:45-22:05 (approx) | Browser check against original `costsim` (same seeded data): run + results, add/delete alternative, library analysis header, rename, delete and save-later dialogs, focus mode open/Escape. All identical. | - |
| 2026-10-17 | 21:56 | README: describe `app/workspace` | d0e03ac |
| 2026-10-17 | 22:07 | Add this task log | a227000 |
| 2026-10-17 | 22:10 (approx) | Push to `origin/main` (up to a227000) | - |
| 2026-10-17 | 22:18 | `App`: `useGuidedFocusState` (impact / define / correlation / guided / focus state and refs). Stable setters added to hook dependency arrays so `exhaustive-deps` stays quiet. | 1097398 |
| 2026-10-17 | 22:21 | `App`: hoist derived validity / result values above the guided and focus logic (no behaviour change) | c7a80b6 |
| 2026-10-17 | 22:33 | `App`: `useGuidedFocusSession` (about 1,100 lines of guided input, focus mode and editing-mode logic, 10 parameters). Tests read the workspace files before `App.tsx`. | 66c6846 |
| 2026-10-17 | 22:25-22:37 (approx) | Browser check of the step above against original `costsim`: editing-mode toggles (Definer, Korrelasjon, Påvirkning), all 6 guided-input screens, run from guided input and landing on focus results, Escape. All identical (same text hash per screen, same button counts). | - |

`App.tsx`: 4,459 lines at start, 2,054 after the last commit above.

Checks after each commit: `tsc -b` clean, lint no worse than the previous commit (88 at start, 80 now), tests 1,332 of 1,333 pass, `check:deps` clean.

## Open

| Task | Notes |
|---|---|
| `InputPanels` and `FocusSession` components | Props can now collapse into `guidedFocusState` and a few values (hooks exist). Biggest remaining JSX in `App.tsx`. |
| Split `useGuidedFocusSession` (about 1,100 lines) | Possible later: editing modes, guided handoffs, focus session as separate hooks. |
| Browser-check flows not yet covered | Archive, checkpoints / ongoing, PDF, share link, correlation group apply / summaries. |
| Pre-existing: `checkpointComparison.test.ts` expects `"17 (12.4 %)"`, code returns `"Locked"` | Real logic mismatch, not caused by the refactor. |
| Pre-existing: 80 lint errors | Mostly `react-hooks/refs`, `set-state-in-effect`, `only-export-components`. |
