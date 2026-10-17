/** Shared breathing room below INPUT / OUTPUT column headers (~16px). */
export const COLUMN_HEADER_BOTTOM_GAP_CLASS = "mb-4"

/**
 * Normal Input row: Project Profile (left) + primary Focus entry (~75% on md+).
 * Lead track holds the profile; trailing track starts at ~3/4 across.
 * Below md: profile grows, Focus sits as an end-aligned auto column.
 */
export const PROJECT_PROFILE_FOCUS_ROW_CLASS =
  "grid w-full min-w-0 items-start gap-x-3 gap-y-2 grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"

/** Cell for the primary Focus mode button beside Project Profile. */
export const PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS =
  "flex min-w-0 justify-end pt-0.5 md:justify-start"
