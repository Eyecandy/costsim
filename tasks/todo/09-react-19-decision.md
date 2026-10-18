# 09 Decide on React 19
Priority: low     Size: M     Risk: medium

## Why
The app runs React 18. `@glideapps/glide-data-grid` 6.0.3 supports up to 18; only the 6.0.4 alpha supports 19, and it also needs `marked` 16.

## What
Pick one:
- Wait for a stable data-grid release with React 19 support, or
- Try the alpha on a branch: upgrade `react`, `react-dom`, `@types/react`, fix type fallout (`useRef` argument, ref props), run the full browser parity pass.

## Check
- `npm run check` and the full parity run (routes, workspace, Focus, library, PDF).

## Result
