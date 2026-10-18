# Style preview

`style-preview.html` is a static page for showing a client colour palettes and visual styles for the U·SKOP calculator page. It is not part of the app: nothing in `src/` uses it and Vite does not bundle it. All numbers are hard-coded sample data.

## Open it

Double-click `style-preview.html` (no server, no build, no external requests). Use the switchers at the top:

- **Palette**: A Teal (current, tidied), B Blue, C Terracotta, D Green. Each has three primary colours (brand, dark, tint) and three secondary colours from the same colour family, plus two status colours (error, warning) that sit outside the six.
- **Style**: Clean, Soft, Bold, Dark. Every palette works with every style.
- **View**: Single, Compare 2, Compare 4 (scaled-down copies side by side; vary palette or style). In Single you can also check Tablet and Phone widths.

Each variant has a link, for example `style-preview.html#palette=blue&style=soft` (short form `#blue-soft`; compare: `#palette=blue&style=clean&view=compare4&vary=palette`). Palette ids: `teal`, `blue`, `terra`, `green`. Use the link as a screenshot target. The page prints cleanly (switchers are hidden, a caption names the variant).

Because the secondary colours are close in hue, the charts do not rely on colour alone: the S-curve uses a diamond marker with long dashes for P50 and a square marker with dots for P85; the tornado has direct "P10 lower" and "P90 higher" labels; every bar has a printed value.

## Add or change a palette

1. In the `<style>` block, copy one `[data-palette="..."]` rule and give it a new id. Set the six colours `--p1`..`--p3` (primary: brand, dark, tint) and `--s1`..`--s3` (secondary, used by the charts: dark, light, grey), the status colours `--err` and `--warn`, the neutrals (`--bg` page, `--surface` cards, `--tint`, `--line`, `--text`, `--text2`, `--muted`), the button pair (`--accent`, `--on-accent`), the link and heading colour `--accent-text`, and the `--d-*` set used by the Dark style (including lighter chart colours `--d-s1`..`--d-s3`).
2. Add `{ id, name, names, status, note }` to the `PAL` array in the script at the bottom (`names` are the six colour names, `status` the two status names).
3. Check contrast: text 4.5:1 (including `--muted`, `--text2`, `--accent-text`, `--on-accent` on `--accent`, and `--err` as text), chart colours and `--warn` 3:1 against `--surface`. The palettes in the file passed 429 checks across all palette and style combinations.

Styles are the `.app[data-style="..."]` rules (radius, borders, shadows, header, buttons, type weight), driven by CSS variables.

## Notes

- The app uses the Geist typeface. The preview uses the system font stack, so letter shapes differ slightly.
- In palette A the brand teal `#1d868c` stays as the primary swatch, but buttons and teal text use Teal Deep `#156a70`: white on `#1d868c` is 4.34:1, just below the 4.5:1 AA threshold.
- Status colours show up as the "Input has changed" warning notice and the invalid cell (with an icon and a message, never colour alone).
- The NO/EN toggle and links in the mock are decorative.
