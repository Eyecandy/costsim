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
| 2026-10-17 | 22:38 | Update this task log; push to `origin/main` (up to b1eaa56) | b1eaa56 |
| 2026-10-17 | 22:46 | `App`: `FocusSession` (focus-mode shell with input and results views; 48 props became 31 by taking the two state objects) | f9cc9f9 |
| 2026-10-17 | 22:52 | `App`: `InputPanels` (cost items and drivers; 37 props became 10) | 7a843c7 |
| 2026-10-17 | 22:56 | `App`: `GuidedInputHost` (guided-input dialog and its table patches; 11 props) | 8b7bc62 |
| 2026-10-17 | 22:50-22:57 (approx) | Browser check of the three steps above against the values recorded from original `costsim`: simulation results page (text hash, element counts), editing-mode toggles, all 6 guided screens, run from guided input to focus results. All identical. | - |
| 2026-10-17 | 23:26 | Phase 1: `CLAUDE.md`, `engines`/`packageManager`/`.nvmrc`, `typecheck`/`lint:fix`/`test:watch` scripts, env typing + `.env.example`, `.editorconfig`, VS Code files, `.gitignore`; removed unused deps (`lodash`, `marked`, `react-responsive-carousel`, `autoprefixer`, empty `tailwind.config.js`). Only CSS change: legacy `-moz-column-gap` prefix gone. | 69cc018 |
| 2026-10-18 | 00:05 | Phase 2: 80 lint errors to 0 (underscore-unused convention, dead code removed, 15 non-component exports moved out of component files with a reusable split tool, `prefer-const`); compiler-only React rules kept as warnings under a `--max-warnings 45` ratchet; TypeScript `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noImplicitOverride`, `noUncheckedIndexedAccess` on; CI workflow, Dependabot, PR template; tests pinned to the `pilot` variant (that was the "failing" test); benchmarks moved to `npm run test:bench` (they tripped the Vitest worker timeout). A fresh-clone `npm ci` + `npm run check` passes. | d3326b5 |
| 2026-10-18 | 00:10 (approx) | `shadcn` moved to devDependencies and `npm audit fix`: production audit from 25 findings to 0. | following commit |
| 2026-10-18 | ~00:40 | Phase 3: Prettier (one-time format of 315 files; only 2 source-text tests needed loosening), Husky + lint-staged pre-commit hook, `format`/`format:check` scripts. Markdown excluded. | 8a08b2f |
| 2026-10-18 | ~01:30 | Phase 4: ESLint with typescript-eslint strict + stylistic, jsx-a11y, type-aware promise rules, unused-disable errors, no `localStorage`/`sessionStorage` outside `persistence/`; 14 dialog backdrops made accessible (close on backdrop click via `target === currentTarget`); Dependabot ignores major bumps. Lint ratchet 36 warnings. | 2d79c41 |
| 2026-10-18 | ~02:30 | Phase 5a: `ErrorBoundary`, `logError`, global `error`/`unhandledrejection` handlers; silent catches in `useLibraryAnalysisSession` now log; storage moved into `persistence/` (language, auth session, library navigation); typed i18n keys (`MessageKey`, `Translate`) with a compile-time parity check; hard-coded strings moved to messages; `<html lang>` follows the UI language. | 377862e |
| 2026-10-18 | 02:35 | Phase 5b (part): merged duplicated helpers (`clamp`, `nearZeroToZero`, `resolvePairRho`, `projectHasMeaningfulTableInput`), shared PDF chart geometry (`pdf/shared/chartGeometry.ts`, tested). | ffdb0d7 |
| 2026-10-18 | 02:40 | Phase 6 outcome: React 19 NOT done on purpose. Stable `@glideapps/glide-data-grid` 6.0.3 only supports React up to 18 (the 6.0.4 alpha supports 19 but also needs `marked` 16). Aligned types with the runtime instead: `@types/react` / `@types/react-dom` 18. | c5f3b5d |
| 2026-10-18 | 02:44 | Phase 7: `App` and `AnalysisLibraryPage` lazy-loaded; main chunk about 20 kB (App 705 kB, PDF renderer 1.49 MB loaded on demand). Found and removed a static import chain that pulled `@react-pdf/renderer` into the main chunk. Security headers and long cache for `/assets/*` in `vercel.json` (no CSP: needs a real Vercel preview). | db27ceb |
| 2026-10-18 | 02:15-02:48 (approx) | Full browser comparison of phases 3-7 against original `costsim` (same seeded data, digits masked): landing page, simulation results, editing modes, all 6 guided screens, run from guided input to focus results and Escape, add/delete alternative, library create, actions menu, rename, save-later and delete dialogs, backdrop click (inside keeps open, backdrop closes), language switch. All identical. Only difference, intentional: `<html lang>` follows the UI language in the new app (original is always `en`). Error boundary was not exercised in the browser (unit-tested only). | - |
| 2026-10-18 | 03:00 | Phase 5b: `enterFullscreenQuietly` / `exitFullscreenQuietly` in `persistence/browserFullscreen.ts` replace the repeated fullscreen call blocks in `FocusModeShell` and `GuidedInputDialog`; unmount cleanup for the action-notice timers and the "saved" flash timer. Left as they are on purpose: the two `focusRootRef.current` cleanup warnings, index keys on static lists (histogram bins, header items), `__resetFullDocumentLoadCountForTests` (needs the module-private counter). | 139225f |
| 2026-10-18 | 03:08 | Phase 8: jsdom + Testing Library + user-event + jest-dom, `src/test-utils/setup.ts`, `npm run test:coverage` (v8, floor 38 % statements, 77 % branches, 82 % functions). New behavioural tests: `ErrorBoundary`, `ProjectTabs`, `ConfirmDialog`, `RenameAnalysisDialog`, `I18nProvider` (`<html lang>`, persistence), `useActionNotices` (fake timers, unmount cleanup). 1,367 tests. | e6f23ea |
| 2026-10-18 | 03:15 | Phase 9a: `i18n/messages.ts` split into `messages.no.ts` + `messages.en.ts` (types and parity check stay in `messages.ts`); source-text tests read them through `readMessagesSource()`. Phase 9b: `aiBrief` types and constants to `aiBriefTypes.ts` (`aiBrief.ts` 1,073 to 747 lines). | 9dae77e, 95d5d92 |
| 2026-10-18 | 03:25-04:20 (approx) | Full browser comparison against original `costsim` (same seeded data, both apps in Chrome): all 11 routes (landing, login, app, library views, unknown paths, bad share/analysis ids); every button in the workspace crawled (click, snapshot, Escape): Metodeguide, Om modellen, new alternative, profile, Focus mode, guided input, correlation/impact, result view, enlarged charts, PDF (PDF blob generated, stubbed download), share link, AI brief (identical after number normalisation); library lifecycle: create, fill, run, archive, start ongoing, next checkpoint, run, archive checkpoint, tab switching, finish ongoing (identical page hashes at each step), library page: folder create/menu, all/filter/sort views, move, rename, delete to trash, restore, permanent delete, folder delete; share links created in one app open identically in the other; backdrop-click and Escape behaviour of 16 dialogs; landing/login buttons and language switch. All identical. Only differences: `<html lang>` follows the UI language (intentional), and the console shows the known `Button` ref warning (same code path in the original). Not exercised in the browser: ErrorBoundary (unit-tested), real browser fullscreen, real PDF file download (stubbed). | - |

`App.tsx`: 4,459 lines at start, 1,208 after the last App commit above.

## Phase 9 follow-up (2026-10-18 14:00)
- `useGuidedFocusSession` split: 1,221 -> 582 lines. New hooks in `app/workspace/`: `useCorrelationEditing`, `useGuidedHandoff`, `useEditingModeToggles`, `useCorrelationGroupEditing`, `useFocusResultSteps`, `useFocusSessionResume`. Called at the original positions, so hook and effect order is unchanged. `readAppSource()` lists the orchestrator hook last; 4 source-text tests got new slice anchors. `npm run check` green (36 warnings, 1,367 tests). Browser parity vs `costsim`: toggles, Focus steps, correlation/impact handoffs and return, run, Results steps, Back to input, phase navigation, reload, Close all identical. Not browser-checked: correlation group apply (canvas grid), focus resume with a library analysis.

## Phase 9d (2026-10-18 15:00)
- `useLibraryAnalysisSession` split: 1,873 -> 1,060 lines. New in `features/analysis-library/session/`: `sessionTypes.ts` (result/input types, `LibrarySessionArgs`, `LibraryDocMeta`, `LiveArchiveState`; re-exported from the hook so importers are unchanged), `sessionSupport.ts` (pure Shapley/preferences helpers), `sessionContext.ts` (shared state/refs shape), `useArchiveCommands.ts`, `useOngoingCheckpointCommands.ts`. The command hooks get the session's refs, setters and helpers through one context object and are called at the original positions. Refs/setters passed in need to be in the dependency arrays (stable, so no behaviour change; applied from the exhaustive-deps suggestions) or the React Compiler lint adds 58 warnings. `readLibrarySessionSource()` (test-utils) feeds the 11 source-text tests. `npm run check` green (36 warnings, 1,367 tests). Browser parity vs `costsim`: Ongoing lifecycle (create, run, archive CP1/CP2, create next, select checkpoint, delete tip draft, finish), Single lifecycle (run, archive, rename, start ongoing, new version, trash), Focus resume after reload: all identical.

## Phase 9e (2026-10-18 17:00)
- `ResultsPanel` split: 2,288 -> 1,482 lines. New in `features/results/panel/`: `panelTypes.ts` (props, expanded-chart type, notice timeout), `attributionUi.ts` (pure Contribution state per project), `useResultsDerivedData.ts` (maps, series, tornado layouts), `useResultsExportActions.ts` (share link, PDF, AI brief with their notices, timers and cleanup). The 1,000-line JSX (Focus step branch and normal branch) is still in `ResultsPanel.tsx`; splitting it needs a shared view-model prop. `readResultsPanelSource()` (test-utils) feeds the 37 source-text tests. Two compiler lint warnings that the component never reported before (it bailed out as a whole) are suppressed with reasons to keep the ratchet at 36. Browser parity vs `costsim`: share link, AI brief (identical once decimals are normalised), PDF (blob + filename), 5 expanded chart dialogs, all section toggles, Focus Results steps: identical.

## Not done yet (2026-10-18 04:20)
- Phase 9 splits left: `GuidedInputDialog` (2.5k lines), `ProjectReportDocument` (2.1k), `ScenarioPercentTable` (1.9k), `AnalysisLibraryNav` (1.5k), `AnalysisLibraryPage` (1.2k), `localAnalysisLibraryRepository` (1.0k). These touch hook order and need a browser parity check after each.
- 36 lint warnings (React Compiler rules `refs` / `set-state-in-effect`, some `exhaustive-deps`): fix when the files are split.
- `Button` ref under React 18 (see `CLAUDE.md` known debt): `ConfirmDialog` never focuses its confirm button, same as the original.
- React 19: needs your decision (data grid 6.0.4 alpha, or wait for a stable release).
- Optional: one Playwright smoke test (not added: large browser download).

Checks after each commit: `tsc -b` clean, lint no worse than the previous commit (88 at start, 80 now), tests 1,332 of 1,333 pass, `check:deps` clean.

## Open

| Task | Notes |
|---|---|
| `ResultsColumn` (112 lines, 29 props) and the duplicated `ResultsPanel` props in `App` and `FocusSession` | Skipped on purpose: would move 112 lines but need 29 props. Better solved by a shared host that builds the props once. |
| Split `useGuidedFocusSession` (about 1,100 lines) | Possible later: editing modes, guided handoffs, focus session as separate hooks. |
| Remaining logic in `App.tsx` (about 700 lines) | Result store (`apply*` functions), project editing handlers, library session wiring. Candidates for a `useLiveResults` and a `useProjectEditing` hook. |
| Browser-check flows not yet covered | Archive, checkpoints / ongoing, PDF, share link, correlation group apply / summaries. |
| Lint warnings: 45 (12 `refs`, 14 `set-state-in-effect`, 9 `exhaustive-deps`, 9 stale `eslint-disable`, 1 memoization) | Ratchet in `package.json`; lower the number as they are fixed. |
