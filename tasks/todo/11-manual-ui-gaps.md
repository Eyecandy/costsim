# 11 Manually check the UI paths automation could not reach
Priority: medium     Size: S     Risk: low

## Why
The browser comparisons used DOM text, canvas hashes and scripted clicks. A few things cannot be driven that way, so they were never compared with the original.

## What
Do these by hand in both apps (`costsim` on 5192, this app on 5191) and note any difference:
- Correlation mode: select two cost items, set a value, apply, remove a saved group.
- Cost and driver grid: type into cells, paste from Excel, add and delete rows.
- Guided Input: drag the P10 / M / P90 sliders; type a definition and blur.
- Real browser fullscreen for Focus mode and Guided Input.
- Error boundary: force a render error and check the fallback screen.
- Open the downloaded PDF and look at it.

## Check
- Write findings into this card's Result section.

## Result
