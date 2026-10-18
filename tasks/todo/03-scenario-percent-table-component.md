# 03 Slim down the ScenarioPercentTable component
Priority: medium     Size: L     Risk: high

## Why
`ScenarioPercentTable.tsx` is 1,705 lines, almost all one component wiring the Glide data grid: columns, cell rendering, edit, paste, selection, correlation / impact / define modes, row actions.

## What
- Move the column and cell-content builders into pure functions in `domain/` or `scenario-tables/table/`, with unit tests.
- Extract paste, selection and edit handlers into hooks next to the table.
- Keep the grid props and callbacks identical.

## Check
- `npm run check`.
- Browser parity against `../costsim`: DOM text and canvas pixel hashes in all modes (default, Define, Correlation, Impact), row add / delete / clear, paste, archived (read-only) view. Canvas cell editing and slider dragging need a manual pass; the automated Chrome cannot type into the canvas.

## Result
