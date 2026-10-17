/**
 * Authoritative project visual identity (deterministic by project order index).
 *
 * On-screen values live in CSS as `--scurve-line-1…4` (see `src/index.css`).
 * Hex values approximate the light-theme tokens for PDF / non-CSS contexts.
 *
 * Project 1 is blue. Colors are identity only — not semantic status.
 */

export const PROJECT_COLOR_COUNT = 4

export const PROJECT_COLOR_CSS_VARS = [
  "--scurve-line-1",
  "--scurve-line-2",
  "--scurve-line-3",
  "--scurve-line-4",
] as const

export type ProjectColorCssVar = (typeof PROJECT_COLOR_CSS_VARS)[number]

/** Light-theme hex approximations of `--scurve-line-*` (oklch → sRGB). */
export const PROJECT_COLOR_HEX = [
  "#47739b", // Project 1 — blue (oklch 0.54 0.08 248)
  "#669369", // Project 2 — muted green
  "#a35f58", // Project 3 — muted coral
  "#755a82", // Project 4 — muted purple
] as const

export type ProjectColorHex = (typeof PROJECT_COLOR_HEX)[number]

/** Wrap project order index into the 0…3 palette slot. */
export function projectColorIndex(projectIndex: number): number {
  const n = Math.trunc(projectIndex)
  if (!Number.isFinite(n)) return 0
  return ((n % PROJECT_COLOR_COUNT) + PROJECT_COLOR_COUNT) % PROJECT_COLOR_COUNT
}

/** CSS custom-property name for charts/legends/tabs (`var(--scurve-line-N)`). */
export function getProjectColorCssVar(projectIndex: number): ProjectColorCssVar {
  return PROJECT_COLOR_CSS_VARS[projectColorIndex(projectIndex)]!
}

/** Solid hex for PDF and other non-CSS consumers. */
export function getProjectColorHex(projectIndex: number): ProjectColorHex {
  return PROJECT_COLOR_HEX[projectColorIndex(projectIndex)]!
}
