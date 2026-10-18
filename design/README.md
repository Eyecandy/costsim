# Style preview

`style-preview.html` is a static page for showing a client colour systems and visual styles for the U·SKOP calculator page. It is not part of the app: nothing in `src/` uses it and Vite does not bundle it. All numbers are hard-coded sample data.

## Open it

Double-click `style-preview.html` (no server, no build, no external requests). Use the switchers at the top:

- **Palette**: ten teal-based colour systems, grouped by family. Analogous: T1 Harbour Blue, T2 Petrol Blue, T3 Jade, T4 Seafoam. Earthy: T5 Moss, T6 Clay, T7 Sage, T8 Ochre. Mixed: T9 Terracotta, T10 Umber. Teal `#1d868c` is the base primary in all of them.
- **Style**: Clean, Soft, Bold, Dark. Every palette works with every style.
- **View**: Single, Compare 2, Compare 4 (scaled-down copies side by side; vary palette or style) and Compare all 10 (compact overview in the chosen style). Click a preview to open it full size. In Single you can also check Tablet and Phone widths.

The strip under the switchers shows four large swatches for the selected palette: Teal (brand), Accent, Off-white and Ink. "Show all tokens" (closed by default) opens the full primary and accent scales, neutrals, status colours and chart series. Palette chips and compare captions show the same four small swatches. The mock page itself uses all tokens.

Each variant has a link, for example `style-preview.html#t6-soft` (long form `#palette=t6&style=soft`; compare: `#palette=t6&style=clean&view=compare4&vary=palette`; overview: `#palette=t1&style=soft&view=all10`). Palette ids are `t1` to `t10`. Use the link as a screenshot target. The page prints cleanly (switchers are hidden, a caption names the variant).

## How the colours are used

- **Page and surfaces**: neutral 50 (off-white) is the page, white is cards, neutral 100 is table headers and soft fields, neutral 200 and 300 are hairlines and input borders. Text is neutral 900 (ink), 800 (body) and 600 (secondary).
- **Primary**: Teal 600 is the action step for filled buttons and links (white on Teal 500 is 4.34:1, just under AA). Teal 500 is the brand wordmark. Teal 100 (Mist) marks selection, changed cells and key rows. Teal 800 is the Bold header band and card heads.
- **Accent** (Harbour Blue, Petrol Blue, Jade, Seafoam, Moss, Clay, Sage, Ochre, Terracotta, Umber): tags in the project profile, the incurred-costs bar and one of the chart series.
- **Status**: the warning notice ("Input has changed"), the invalid cell with its message, the info panel and the saved state use the palette's text and tint pairs, always with an icon or text. T9 needs this most: its error red is close to the terracotta accent, so the invalid cell carries an icon and a message.
- **Charts**: series 1 to 4 from the palette. The S-curve line is series 1, P50 (diamond, long dashes) is series 2, P85 (square, dots) is series 3. The tornado uses series 3 for the lower side and series 1 for the higher side, with direct "P10 lower" and "P90 higher" labels. In the waterfall, increases are series 1, reductions series 3, the reserve series 4 (dashed edge) and totals series 2; every bar has a printed value.
- **Dark style**: derived from the primary scale (900 page, 800 cards) and lightened series and status colours.

## Add a palette from the JSON

The palettes come from `palettes.json` (made by the palette agent), one entry per id with a `tokens` map such as `--color-primary-600` and `--color-series-1`.

1. In the `<style>` block, copy one `[data-palette="..."]` rule, give it a new id (for example `t9`), and paste in the palette's `tokens` map. Keep every token name: the page reads only `--color-primary-*`, `--color-accent-*`, `--color-neutral-*`, `--color-surface`, `--color-<success|warning|error|info>-text` and `-tint`, and `--color-series-1..4`.
2. Add the `--d-*` tokens used by the Dark style (page, surface, tint, line, text, accent, lighter series and status colours). Copy them from an existing rule and adjust: they are derived from the primary scale (900 and 800 for page and cards, 400 for the accent, series and status lightened).
3. Add `{ id, label, name, family, vibe, prim, acc, neu, ser }` to the `PAL` array in the script at the bottom (`prim`, `acc` and `neu` are `[step, name]` lists, `ser` is `[order, source]`).
4. Check contrast: text 4.5:1 (including neutral 600, Teal 600 on the page and cards, status text on page, cards and its own tint, button text), chart series and the accent bar 3:1 against the card. The ten palettes in the file passed 1675 checks across all palette and style combinations.

Styles are the `.app[data-style="..."]` rules (radius, borders, shadows, header, buttons, type weight), driven by CSS variables.

## Notes

- The app uses the Geist typeface. The preview uses the system font stack, so letter shapes differ slightly.
- T10 has the weakest chart distinction (its first series are close in lightness), so the charts rely on dashes, markers, direct labels and printed values.
- Series 1 to 3 read apart without extra cues. From series 4 on, and in print or grayscale, add dashes, markers or direct labels, as the charts here do.
- The NO/EN toggle and links in the mock are decorative.
