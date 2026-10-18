# 08 Make the confirm dialog focus its confirm button
Priority: low     Size: S     Risk: low

## Why
`shared/ui/button.tsx` takes `ref` as a plain prop (React 19 style). React 18 drops it, so `ConfirmDialog`'s `confirmBtnRef.current?.focus()` never runs. The original `costsim` behaves the same way, so fixing it changes dialog behaviour on purpose.

## What
- Wrap `Button` in `forwardRef`.
- Update the `ConfirmDialog` test that had the focus assertion removed.
- Decide for each dialog whether auto-focusing confirm is wanted (destructive confirms should arguably focus Cancel).

## Check
- `npm run check`.
- Browser: every confirm dialog (delete, archive, finish ongoing, discard) with keyboard only.

## Result
