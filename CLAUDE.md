# CLAUDE.md

Conventions for this repo (`costsim-new`). Keep this file short and true; update it when a rule changes.
The layout and dependency rules are also summarised in `README.md`.

## What this is
U·SKOP: a Monte Carlo cost-risk simulator. React + TypeScript + Vite, Tailwind v4, Vitest. UI language is Norwegian (default) and English.
`costsim-new` is a restructured copy of the friend's `costsim`. **Never edit `../costsim` or `../costsim-react`**: they are the reference copies.

## Commands
- `npm run dev`: dev server. `npm run build`: typecheck + production build.
- `npm run check`: typecheck, lint (max-warnings ratchet), tests, layer rules, build. Run before every commit. CI (`.github/workflows/ci.yml`) runs the same steps.
- `npm run typecheck`, `npm run lint` (`lint:fix`), `npm test` (`test:watch`), `npm run check:deps`.
- `npm run test:bench`: slow Shapley benchmarks (`*.bench.test.ts`, about 2 minutes), excluded from `npm test` because a single test over 60 s trips Vitest's worker heartbeat.

## Layers (enforced by `npm run check:deps`, config in `.dependency-cruiser.cjs`)
```
domain/        framework-free logic. No React, no storage, no UI. Imports only domain, config, i18n.
persistence/   localStorage / sessionStorage / URL adapters. Uses domain.
workers/       Web Worker entry files. Uses domain.
shared/        UI building blocks and helpers used by several features (ui/, auth/). Never imports features or app.
features/<x>/  one folder per product feature (components, hooks, tests). Features do not import each other,
               except guided-input, which composes focus-mode, scenario-tables and workspace.
app/           the shell: App, routing, login/landing pages, app/workspace/ (pieces of the workspace screen).
pdf/           PDF report model and rendering.
```
Nothing imports `app/`. No circular imports. Imports always use the `@/` alias (`@/domain/simulation/stats`).

## Where things go
- Pure calculation or data shaping: `domain/<area>/`. Reads or writes browser storage or the URL: `persistence/`.
- A component or hook used by one feature: that feature's folder. Used by two or more: `shared/`.
- User-visible text: a key in `src/i18n/messages.ts`, read with `useI18n().t(...)`. Keep the `no` and `en` objects identical in shape. No hard-coded Norwegian/English strings in components.
- Environment variables: declared in `src/vite-env.d.ts`, documented in `.env.example`. Every `VITE_` value ends up in the public bundle: nothing secret. `VITE_APP_PASSWORD` is a gate, not real authentication.

## Code style
- Prettier formats everything except Markdown (no semicolons, double quotes, width 100, trailing commas). A pre-commit hook (Husky + lint-staged) runs Prettier and `eslint --fix` on staged files; `npm run format` formats the repo.
- Files: components `PascalCase.tsx`, hooks `useThing.ts`, everything else `camelCase.ts`. Named exports only (`App` is the one default export). Props types are called `XxxProps`.
- TypeScript is strict. No `any`, `@ts-ignore`, `as unknown as`. Avoid `!` unless the line before guarantees non-null.
- No empty `catch`. Either handle it, log it, or write `// intentional: <why>`.
- Components stay presentational where possible: put state and effects in hooks (`useXxx`) next to the component, and calculations in `domain/`.
- React hooks: keep hook call order stable; effects declare all dependencies. Extracted hooks are called at the position of the code they replaced.

## Tests
- Vitest, test file next to the code (`thing.test.ts`). Prefer behavioural tests (call the function, render the component).
- Many older tests read source files as text (`readFileSync`, `readSrc`, `readAppSource`). Do not add new ones. They locate files through `src/test-utils/repoRoot.ts` and read the workspace screen through `src/test-utils/appSource.ts` (hook files first, then `App.tsx`, then components); moving code means updating those paths or patterns.
- Tests run with `VITE_APP_VARIANT=pilot` (set in `vitest.config.ts`), i.e. all features on. Line endings are LF (`.gitattributes`); several tests depend on it.

## Workflow
- Behaviour-preserving changes unless asked otherwise. After each step: typecheck, lint (no new errors), tests, `check:deps`, build.
- Risky UI changes get a browser parity check against the original: run `../costsim` on port 5192 and this app on 5191, seed `localStorage["cost-simulator:v1:projects"]`, run the same flow in both and compare page text with digits masked (results are random). Screenshots of the results page time out in the automated Chrome; use DOM text.
- Commit and push at sensible milestones (end of a phase or a coherent step), not after every small edit. Commits are authored by the user with no co-author trailer. Keep `docs/refactor-tasks.md` updated with date and time.
- Do not add new documentation files unprompted; extend this file or the README instead.

## Known debt (see `docs/refactor-tasks.md` for the live list)
- Large files still to split: `GuidedInputDialog`, `ResultsPanel`, `ScenarioPercentTable`, `useLibraryAnalysisSession`, `useGuidedFocusSession`, `AnalysisLibraryNav`, `i18n/messages.ts`.
- Lint: 0 errors, 36 warnings (12 `refs` and 14 `set-state-in-effect` from the React-Compiler rules flagging older patterns, 9 `exhaustive-deps`, 1 memoization). `--max-warnings` in `package.json` holds that number: lower it when you fix some, never raise it.
