import type { CSSProperties } from "react"

export type ThemeId = "current" | "harbour" | "clay"

type Theme = {
  label: string
  /** CSS variables set on the lab page wrapper. App tokens (--background ...) are overridden so
   *  every shared component picks the theme up; --lab-* are used by the lab parts. */
  vars: Record<string, string>
}

const CURRENT_LAB_VARS = {
  "--lab-brand": "#1d868c",
  "--lab-action": "#1d868c",
  "--lab-tint": "rgba(29, 134, 140, 0.08)",
  "--lab-tint-strong": "rgba(29, 134, 140, 0.16)",
  "--lab-accent": "#4a86a6",
  "--lab-bar-bg": "#eef5f6",
  "--lab-bar-border": "#c9dfe1",
  "--lab-field-border": "#c9d2d4",
}

/** Add a theme here (and to ThemeId) to make it available to variants. Tokens come from the colour systems in design/. */
export const THEMES: Record<ThemeId, Theme> = {
  current: { label: "Current", vars: CURRENT_LAB_VARS },
  harbour: {
    label: "Harbour Blue",
    vars: {
      "--background": "#faf9f4",
      "--foreground": "#0f2c30",
      "--muted": "#eeede7",
      "--muted-foreground": "#5a6667",
      "--border": "#e3e1da",
      "--lab-brand": "#1d868c",
      "--lab-action": "#056a6f",
      "--lab-tint": "#e4f2f3",
      "--lab-tint-strong": "#cfe6e8",
      "--lab-accent": "#4a86a6",
      "--lab-bar-bg": "#e4f2f3",
      "--lab-bar-border": "#b9d8da",
      "--lab-field-border": "#d3d1c8",
    },
  },
  clay: {
    label: "Clay",
    vars: {
      "--background": "#faf8f3",
      "--foreground": "#2a211c",
      "--muted": "#efede7",
      "--muted-foreground": "#6a615c",
      "--border": "#e4e1da",
      "--lab-brand": "#1d868c",
      "--lab-action": "#056a6f",
      "--lab-tint": "#e4f2f3",
      "--lab-tint-strong": "#cfe6e8",
      "--lab-accent": "#955542",
      "--lab-bar-bg": "#f1e7df",
      "--lab-bar-border": "#dcc7ba",
      "--lab-field-border": "#d4d1c8",
    },
  },
}

export function themeStyle(id: ThemeId): CSSProperties {
  return { ...CURRENT_LAB_VARS, ...THEMES[id].vars } as CSSProperties
}
