/**
 * Shared Focus session outer-frame classes.
 *
 * Normal Focus (Input, Simulation, Results, Next Steps) uses the same
 * contained card as Guided Input — never a Results-only larger variant.
 * Browser fullscreen is the only explicit size upgrade.
 */

/** Contained Focus card (non-fullscreen). Matches Guided modal dimensions. */
export const FOCUS_SESSION_CARD_CLASS = "h-[min(92vh,48rem)] w-[min(96vw,60rem)]"

/** Focus card while the session host is in browser fullscreen. */
export const FOCUS_SESSION_CARD_FULLSCREEN_CLASS = "h-[min(100%,56rem)] w-[min(100%,80rem)]"

/**
 * Shared Focus header chrome (Input + Results).
 * Equal horizontal padding so the aux/phase-nav row can truly center.
 * Title block adds its own right reserve for the absolute FS/X toolbar.
 */
export const FOCUS_SESSION_HEADER_CLASS =
  "flex shrink-0 flex-col gap-1 border-b border-border/50 px-5 py-4 sm:px-8" as const

/**
 * Left title stack (project context + section title).
 * Extra right padding clears the absolute session toolbar.
 */
export const FOCUS_SESSION_HEADER_TITLE_CLASS = "min-w-0 space-y-1 pr-20 sm:pr-24" as const

/**
 * Reserved auxiliary row under the title — phase overview + item progress.
 * Keeps Input/Results header height stable when aux content is absent.
 */
export const FOCUS_SESSION_HEADER_AUX_CLASS =
  "m-0 w-full min-h-[1.25rem] font-sans text-[12px] tabular-nums text-muted-foreground" as const

/**
 * Shared Focus content frame (Input + Results).
 * Shell owns outer padding/scroll; embedded Guided must not duplicate it.
 */
export const FOCUS_SESSION_CONTENT_CLASS =
  "relative min-h-0 flex-1 overflow-auto px-5 py-6 outline-none sm:px-8 sm:py-8" as const

/**
 * Shared Focus footer chrome (Input embedded + Results shell).
 * Keeps Previous/Next at the same left/right anchors across phases.
 */
export const FOCUS_SESSION_FOOTER_CLASS =
  "flex shrink-0 items-center justify-between gap-3 border-t border-border/50 px-5 py-3 sm:px-8" as const

/**
 * Lightweight Focus footer nav action — Previous, Next, and Close share this.
 * Ghost text-action weight; not a filled primary CTA.
 */
export const FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS =
  "h-9 px-3 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40" as const

/**
 * Equal-width Next Steps action affordances (centered label).
 * Column width is shared so labels of different length still align.
 */
export const FOCUS_NEXT_STEPS_ACTION_CLASS =
  "h-8 w-full justify-center px-3 text-center text-[12px]" as const

export const FOCUS_NEXT_STEPS_ACTION_COL_CLASS = "w-full shrink-0 sm:w-44" as const
