# 02 Slim down the GuidedInputDialog component
Priority: medium     Size: L     Risk: high

## Why
The phase pieces are out, but `GuidedInputDialog.tsx` is still 1,377 lines: step state, resume/focus effects, fullscreen handling, key handling, body and footer rendering in one `forwardRef` component.

## What
- Extract the step and resume logic (`stepIndex`, resume effects, `goNext` / `goPrevious`, imperative handle) into a `useGuidedSteps` hook, called where the code is now (hook order matters).
- Extract footer and body rendering (`renderFooter`, `renderBody`) into components.
- Leave fullscreen and focus-shell wiring for last; it is the riskiest part.

## Check
- `npm run check`.
- Browser parity against `../costsim`: every Focus Input step, handoffs (Add cost items, Add drivers, Adjust correlation / impact), Back to guided review, reload-resume, Escape and backdrop handling.

## Result
