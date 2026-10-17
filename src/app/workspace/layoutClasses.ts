import { cn } from "@/shared/utils"

/** App branding + nav — sticks at viewport top (py-3 + logo line-height ≈ 3.1875rem). */
export const APP_HEADER_CLASSNAME = cn(
  "sticky top-0 z-50 min-w-0 shrink-0",
  "bg-background/95 backdrop-blur-sm",
  "mb-[7.84rem] md:mb-[8.96rem]",
)

/** Sticky offset for controls directly below the app header row. */
export const STICKY_BELOW_APP_HEADER_CLASS = "top-[3.1875rem]"

/** Sticky strip above project tabs and simulation control (identical layout/stacking). */
export const STICKY_CONTROL_STRIP_CLASSNAME = cn(
  "sticky z-40 min-w-0 shrink-0 isolate pt-2",
  STICKY_BELOW_APP_HEADER_CLASS,
  "bg-background",
)

/** Right results column — sticks on md+ while the page scrolls (e.g. long left table). */
export const RESULTS_COLUMN_CLASS = cn(
  "flex min-w-0 flex-col gap-0 md:sticky md:z-30 md:self-start md:bg-background",
  STICKY_BELOW_APP_HEADER_CLASS,
)

/** Bottom breathing room under Single Analysis tabs (mirrors simulation notice zone). */
export const STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS =
  "pb-[calc(0.6375rem+4.25rem)]"

/**
 * Project Profile sits in the left column only (Single Analysis). Modest top
 * gap under the tabs (`mt-4`), space below (`mb-5`), and mirror the closed
 * block height onto Results (md+) so Cost Items and the Results card tops
 * align. Collapsed profile ≈ title + one summary line (~2.5rem including
 * line boxes). Primary Focus mode sits on this same row.
 */
export const PROJECT_PROFILE_SECTION_SPACING_CLASS = "mt-4 mb-5"
export const RESULTS_ALIGN_WITH_COST_ITEMS_CLASS =
  "md:pt-[calc(1rem+2.5rem+1.25rem)]"

/**
 * Ongoing Analysis (md+): three shared grid rows. Sticky timeline and simulation
 * strips are their own grid items (via `md:contents` wrappers), so the sticky
 * containing block is the tall workspace grid — they stay sticky through Cost
 * Items, Drivers, and Results. Cost Items and Results share row 3.
 *
 * Row 1: checkpoint timeline | simulation strip (both sticky)
 * Row 2: Project Profile     | (empty)
 * Row 3: Cost Items/Drivers  | Results
 *
 * Shared `md:gap-y-7` is the single desktop spacing between rows (modest room
 * under both sticky controls and before Cost Items / Results). Mobile keeps
 * stacked left/right columns via non-contents flex wrappers.
 *
 * Row 1 height is set by the taller simulation strip (button + notice zone).
 * Both sticky cells use `md:self-stretch` so they share that same effective
 * height — equal sticky bottom gutter without extra pad or negative margins.
 */
export const ONGOING_WORKSPACE_LAYOUT_CLASS = cn(
  "grid grid-cols-1 gap-8 md:grid-cols-2 md:grid-rows-[auto_auto_auto] md:items-start md:gap-x-8 md:gap-y-7",
)
export const ONGOING_WORKSPACE_LEFT_CLASS = "flex min-w-0 flex-col gap-6 md:contents"
export const ONGOING_WORKSPACE_RIGHT_CLASS = "flex min-w-0 flex-col gap-0 md:contents"
/** Sticky timeline cell — stretch to shared row-1 height (simulation side). */
export const ONGOING_TIMELINE_CELL_CLASS = cn(
  STICKY_CONTROL_STRIP_CLASSNAME,
  "min-w-0 md:col-start-1 md:row-start-1 md:self-stretch",
)
export const ONGOING_PROJECT_PROFILE_CELL_CLASS =
  "min-w-0 md:col-start-1 md:row-start-2"
export const ONGOING_COST_CELL_CLASS =
  "min-w-0 pb-7 md:col-start-1 md:row-start-3"
/** Sticky simulation cell — same stretch so both controls share row height. */
export const ONGOING_SIMULATION_CELL_CLASS = cn(
  STICKY_CONTROL_STRIP_CLASSNAME,
  "min-w-0 md:col-start-2 md:row-start-1 md:self-stretch",
)
export const ONGOING_RESULTS_CELL_CLASS = cn(
  "min-w-0 pb-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none",
  "md:col-start-2 md:row-start-3",
)

/** Padded zone under run button; inline notices render inside this area. */
export const SIMULATION_NOTICE_ZONE_CLASS = cn(
  "mt-[0.1125rem] flex min-h-[calc(0.6375rem+4.25rem)] shrink-0 flex-col gap-1",
)

export const SIMULATION_NOTICE_TEXT_CLASS =
  "font-sans text-xs leading-snug text-muted-foreground"

/** Text tint for the color word in validation notices (aligned with invalid cell highlights). */
export const NOTICE_WORD_RED_CLASS = "text-[#c24141]"
/** Accent tint for the “green/grønne” word when changed fields are shown (matches changed-cell accent). */
export const NOTICE_WORD_GREEN_CLASS = "text-[#1d868c]"

/** Project tab: name differs from last simulation snapshot (matches changed-cell tint). */
export const STALE_PROJECT_TAB_BG_CLASS = "bg-[rgba(29,134,140,0.05)]"
