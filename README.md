# Cost simulator

Monte Carlo cost-risk simulator. React + TypeScript + Vite, Tailwind, Vitest.

```
npm run dev         # dev server
npm run check       # tsc + eslint + tests + layer rules (run before committing)
npm run check:deps  # only the layer rules
npm test            # vitest
```

## Where things live

```
src/
  domain/        framework-free logic: simulation, analysis, results, guided workflow
    simulation/  Monte Carlo, Shapley, tornado, correlation, shared result types
    analysis/    projects, checkpoints, ongoing/archived snapshots
    results/     key figures, S-curve/waterfall presentation, table rows, AI brief
    guided/      guided input + focus session logic
  persistence/   localStorage / sessionStorage / share-link adapters (uses domain)
  workers/       Web Worker entry files (uses domain)
  features/      one folder per product feature: components, hooks and their tests
    analysis-library/  results/  guided-input/  scenario-tables/
    focus-mode/  checkpoints/  workspace/
  shared/        UI building blocks and helpers used by several features (ui/, auth/)
  app/           the shell: App, routing, landing and login pages
    workspace/   pieces of the workspace screen (App.tsx composes them): dialogs, header, tabs,
                 simulation strip, and the hooks for simulation runs, notices and dialog state
  pdf/           PDF report model and rendering
  i18n/  config/ translations and app variant flags
```

Imports always use the `@/` alias (`@/domain/simulation/stats`).

### Where do I put X?

- Pure calculation or data shaping, no React, no storage: `domain/<area>/`.
- Reads or writes localStorage / sessionStorage / the URL: `persistence/`.
- A component or hook used by one feature: that feature's folder.
- Used by two or more features: `shared/`.

### Layer rules

`npm run check:deps` enforces the direction of dependencies (see `.dependency-cruiser.cjs`):
`domain` imports no React and no storage; `persistence` and `workers` only use `domain`;
`shared` never imports a feature; features do not import each other (the one exception is
`guided-input`, which composes `focus-mode`, `scenario-tables` and `workspace`); nothing imports `app`;
and there are no circular imports.

## Tests

Tests sit next to the code they cover. Many of them read component source files as text
and assert on the contents. They locate files through `repoRoot` (`src/test-utils/repoRoot.ts`)
with paths like `"src/app/App.tsx"`, so moving a file means updating those path strings.
