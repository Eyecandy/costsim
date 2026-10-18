# 01 Split the ResultsPanel JSX
Priority: high     Size: L     Risk: medium

## Why
`ResultsPanel.tsx` is still 1,482 lines, about 1,000 of them JSX. The Focus-step branch and the normal branch repeat the same sections (key figures, development, S-curve, tornado, contribution, export) with small differences.

## What
- Build one view-model object (the derived data, preferences, handlers and states the sections read) in the component.
- Move each section into its own component under `features/results/panel/` that takes the view-model; render it from both branches.
- Keep the DOM and `data-*` attributes identical (many source-text tests and the Focus flow depend on them).

## Check
- `npm run check`.
- Browser parity against `../costsim`: normal results page, every Focus Results step, section toggles, enlarged chart dialogs, share link, AI brief, PDF.

## Result
