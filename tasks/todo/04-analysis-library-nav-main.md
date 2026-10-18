# 04 Slim down the AnalysisLibraryNav component
Priority: low     Size: M     Risk: medium

## Why
`AnalysisLibraryNav.tsx` is 1,044 lines in one component: folder tree, analysis lists, drag state, rename / delete / move dialogs.

## What
- Extract dialog state and handlers into `useLibraryNavDialogs`.
- Extract the folder and analysis section rendering into components under `nav/`.

## Check
- `npm run check`.
- Browser parity against `../costsim`: sidebar in the workspace and on the library page; folder create, rename, delete; move analysis; trash and restore; the button sweeps used for `AnalysisLibraryPage`.

## Result
