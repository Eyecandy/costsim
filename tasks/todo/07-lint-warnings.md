# 07 Reduce the 36 lint warnings
Priority: medium     Size: M     Risk: low

## Why
The warning count is a ratchet (`--max-warnings 36` in `package.json`). They are real design debt: refs read or written during render, state set in effects, missing hook dependencies.

## What
- Fix them file by file; lower `--max-warnings` after each batch. Never raise it.
- Groups: `react-hooks/refs` (12), `set-state-in-effect` (14+), `exhaustive-deps` (9), memoization (1). Most sit in `useSimulationRun`, `useLazyShapleyAttribution`, `GuidedInlineValue`, `GuidedDefinitionTextarea`, `ScenarioPercentTable`.
- Behaviour must not change; effects that reset state on a key change can often become `key` props or derived values.

- **Unblocks Dependabot**: `eslint-plugin-react-hooks` 7.1.x reports 75 warnings and one error (`react-hooks/immutability`, `AnalysisLibraryNav.tsx` effect uses `openNewAnalysisDialog` before its declaration). It is held back in `.github/dependabot.yml`; when the code passes with 7.1.x, remove that ignore entry and bump the package.

## Progress (2026-10-18)
36 -> 32 warnings. Fixed (behaviour-neutral, browser-checked): `AuthProvider` user object memoized; `GuidedInputDialog` help content memoized; `ScenarioPercentTable` `isIncurredRowIndex` as `useCallback` (also cleared a React Compiler memoization bail-out).

## Remaining 32 and the plan per group
- **set-state-in-effect, reset-on-open dialogs (11)**: `SaveAndContinueLaterDialog`, `StartOngoingFromArchiveDialog`, `CreateNextCheckpointDialog`, `AddAlternativeDialog`, `SidebarEntityActionsMenu`, `ProjectProfileSection`, `ResultPreferencesPanel`, `AssumptionsEditor`, `DefineRowEditor`, `DefineRowPopover`, `ScenarioPercentTable` (2). Each resets draft state in an effect when `open` turns true, together with a focus timer or a fetch. Plan: split into an outer component (`if (!open) return null`) and an inner body whose `useState` starts from the props, so closing and reopening remounts it. Check per dialog that no prop is meant to re-reset while open, and keep the focus timers.
- **set-state-in-effect in `GuidedInlineValue` (2) and sync-from-props drafts**: replace "copy prop into draft when it changes" with the keyed-remount pattern or derive during render.
- **refs during render (11)**: `App.tsx` (3), `useGuidedFocusState`, `useSimulationRun` (3), `GuidedDefinitionTextarea` (3), `useLazyShapleyAttribution` (2). They keep "latest value" refs assigned in render. Plan: assign in `useLayoutEffect` or switch to a stable `useEffectEvent`-style callback; the risk is a child effect reading the ref before the parent's layout effect, so each needs the browser flow (run, Focus, library).
- **exhaustive-deps (6)**: `FocusModeShell` and `GuidedInputDialog` unmount cleanup read `focusRootRef.current` (today that is null at unmount, so capturing the element would start exiting fullscreen at unmount: decide on purpose); `useSimulationRun` effect (18 deliberately omitted deps); `useLazyShapleyAttribution` `queueVersion` is a deliberate re-evaluation trigger; `GuidedInlineValue`, `DefineRowEditor` sync effects.

## Check
- `npm run check`, then the browser flow for the file touched.

## Result
