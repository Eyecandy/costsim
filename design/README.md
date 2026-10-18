# Style preview

`style-preview.html` is a static page for showing a client colour palettes and visual styles for the U·SKOP calculator page. It is not part of the app: nothing in `src/` uses it and Vite does not bundle it. All numbers are hard-coded sample data.

## Open it

Double-click `style-preview.html` (no server, no build, no external requests). Use the switchers at the top:

- **Palette**: ten teal-based palettes T1 to T10, grouped by family. Analogous: T1 Sea Pine + Harbour, T2 Petrol + Glacier, T3 Pine + Jade + Seafoam, T4 Deep Navy + Mint + Stone Teal. Earthy: T5 Moss + Dune, T6 Clay + Umber + Sage, T7 Sage + Pebble + Terracotta, T8 Olive + Ochre + Umber. Mixed: T9 Pine + Harbour + Clay, T10 Petrol + Sea Green + Ochre.
  Each has the primary trio (Teal, Teal Mist, an off-white), three secondaries, an ink colour for text, and error and warning status colours.
- **Style**: Clean, Soft, Bold, Dark. Every palette works with every style.
- **View**: Single, Compare 2, Compare 4 (scaled-down copies side by side; vary palette or style) and Compare all 10 (compact overview in the chosen style). Click a preview to open it full size. In Single you can also check Tablet and Phone widths.

Each variant has a link, for example `style-preview.html#t6-soft` (long form `#palette=t6&style=soft`; compare: `#palette=t6&style=clean&view=compare4&vary=palette`; overview: `#palette=t1&style=soft&view=all10`). Use it as a screenshot target. The page prints cleanly (switchers are hidden, a caption names the variant).

How the colours are used: the off-white is the page tone, cards are white, Teal Mist is for tints, table headers, selected and key rows, Teal is the brand (swatch, P50 marker, totals), and the ink colour is the text colour and the Bold header band. Where the true Teal is below 4.5:1 with white text, buttons and links use the Teal Action colour (T1, T3 to T7, T9, T10); T2 and T8 use their own AA teal. The swatch strip always shows the true Teal.

Because the secondary colours are close in hue, the charts do not rely on colour alone: the S-curve uses a diamond marker with long dashes for P50 and a square marker with dots for P85; the tornado has direct "P10 lower" and "P90 higher" labels and the lower bars are drawn lighter; every bar has a printed value. T10 is the thinnest palette for charts because its three secondaries are all dark.

## Add or change a palette

The palettes are plain CSS rules. In the `<style>` block, copy one `[data-palette="..."]` rule and give it a new id (`t11`):

1. Set `--p1` (true brand teal), `--p2` (mist tint), `--p3` (off-white page tone), `--s1`..`--s3` (secondaries: dark, light, grey), `--deep` (ink, also the Bold header band), `--err` and `--warn` (status).
2. Set the neutrals: `--bg` (page, the off-white), `--surface` (cards), `--tint` (the mist), `--line`, `--text` (ink), `--text2`, `--muted`.
3. Set `--accent` (filled buttons, white text on it), `--accent-text` (links and teal text) and `--on-accent`.
4. Set the `--d-*` tokens for the Dark style, including lighter chart colours `--d-s1`..`--d-s3` and lighter status colours.
5. Add `{ id, label, name, family, names, status, ink, action, trueTealOk, note }` to the `PAL` array in the script at the bottom.
6. Check contrast: text 4.5:1 (including `--muted`, `--text2`, `--accent-text`, `--on-accent` on `--accent`, and `--err` as text), chart colours and `--warn` 3:1 against `--surface`. The ten palettes passed 1085 checks across all palette and style combinations.

Styles are the `.app[data-style="..."]` rules (radius, borders, shadows, header, buttons, type weight), driven by CSS variables.

## Notes

- The app uses the Geist typeface. The preview uses the system font stack, so letter shapes differ slightly.
- The Dark style neutrals, accent and chart colours are derived from each palette's ink and teal, since the palettes define only the light set.
- Status colours show up as the "Input has changed" warning notice and the invalid cell (with an icon and a message, never colour alone).
- The NO/EN toggle and links in the mock are decorative.
