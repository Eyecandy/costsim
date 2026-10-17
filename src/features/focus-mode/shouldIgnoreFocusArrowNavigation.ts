import { shouldIgnoreGuidedArrowNavigation } from "@/domain/guided/shouldIgnoreGuidedArrowNavigation"

/**
 * Whether Left/Right should be ignored while a Focus session is active.
 * Reuses Guided editable-control rules and also skips overlays that own
 * keyboard interaction (expanded charts, Result Settings, menus, confirms).
 */
export function shouldIgnoreFocusArrowNavigation(
  target: EventTarget | null,
): boolean {
  if (shouldIgnoreGuidedArrowNavigation(target)) return true
  if (typeof document === "undefined") return false

  // Expanded chart / Result Settings open — own the keyboard until closed.
  if (document.querySelector("[data-expanded-chart-dialog]")) return true
  if (document.querySelector("[data-result-preferences-panel]")) return true
  // Confirm overlays (PDF cutoff, archive, etc.) outside Focus chrome.
  if (document.querySelector("[data-confirm-dialog]")) return true

  if (target == null || !(target instanceof Element)) return false

  return (
    target.closest("[data-expanded-chart-dialog]") != null ||
    target.closest("[data-result-preferences-panel]") != null ||
    target.closest("[data-result-preferences-trigger]") != null ||
    target.closest("[data-result-preferences-backdrop]") != null ||
    target.closest('[role="menu"]') != null ||
    target.closest('[role="listbox"]') != null ||
    target.closest('[role="combobox"]') != null ||
    target.closest("[data-confirm-dialog]") != null
  )
}

/** @deprecated Use shouldIgnoreFocusArrowNavigation — same behavior. */
export const shouldIgnoreFocusResultsArrowNavigation =
  shouldIgnoreFocusArrowNavigation
