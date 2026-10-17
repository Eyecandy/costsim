import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Maximize2, Minimize2, X } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/i18n/useI18n"
import {
  canRequestFullscreen,
  exitFullscreenIfNeeded,
  isElementFullscreen,
  requestElementFullscreen,
  subscribeFullscreenChange,
} from "@/lib/browserFullscreen"
import { cn } from "@/lib/utils"
import { shouldIgnoreFocusArrowNavigation } from "@/lib/shouldIgnoreFocusArrowNavigation"
import {
  FOCUS_SESSION_CARD_CLASS,
  FOCUS_SESSION_CARD_FULLSCREEN_CLASS,
  FOCUS_SESSION_CONTENT_CLASS,
  FOCUS_SESSION_FOOTER_CLASS,
  FOCUS_SESSION_HEADER_AUX_CLASS,
  FOCUS_SESSION_HEADER_CLASS,
  FOCUS_SESSION_HEADER_TITLE_CLASS,
} from "@/lib/focusSessionFrame"

export type FocusModeShellHandle = {
  /** Outer fullscreen-capable host element (stable across Input → Results). */
  getHostElement: () => HTMLElement | null
  /** Content mount node for Guided Focus Input (inside the host). */
  getContentElement: () => HTMLElement | null
  requestFullscreen: () => void
  exitFullscreen: () => void
}

export type FocusModeShellProps = {
  /**
   * When true, show the Focus overlay chrome.
   * When false but `keepMounted`, keep the host in the DOM (dormant) so a
   * user gesture can request fullscreen before React re-renders to open.
   */
  open: boolean
  /** Keep the host element mounted while Guided may still enter Focus. */
  keepMounted?: boolean
  /**
   * @deprecated Session chrome is always owned by the shell. Kept optional for
   * call-site compatibility; no longer gates header/footer.
   */
  variant?: "hostOnly" | "results"
  title?: string
  subtitle?: ReactNode
  /** Optional help control beside the title (Input: GuidedPhaseInfo). */
  headerHelp?: ReactNode
  /**
   * Reserved auxiliary row under the title (Guided progress when Input).
   * Always rendered for stable header geometry — empty when unused.
   */
  headerAuxiliary?: ReactNode
  headerActions?: ReactNode
  onExitFocus: () => void
  children?: ReactNode
  footer?: ReactNode
  status?: ReactNode
  surfaceAttr?: string
  /** Focus session: same as Previous footer control. */
  onNavigatePrevious?: () => void
  /** Focus session: same as Next footer control. */
  onNavigateNext?: () => void
  /** When false, Right arrow is a no-op (final step). */
  canNavigateNext?: boolean
  /** When false, Left arrow is a no-op at the first step boundary (optional). */
  canNavigatePrevious?: boolean
}

/**
 * Presentation-only Focus chrome. Owns the stable fullscreen host and the
 * shared header / content / footer so Input ↔ Results does not remount chrome.
 */
export const FocusModeShell = forwardRef<
  FocusModeShellHandle,
  FocusModeShellProps
>(function FocusModeShell(
  {
    open,
    keepMounted = false,
    title = "",
    subtitle,
    headerHelp,
    headerAuxiliary,
    headerActions,
    onExitFocus,
    children,
    footer,
    status,
    surfaceAttr = "data-focus-mode-surface",
    onNavigatePrevious,
    onNavigateNext,
    canNavigateNext = true,
    canNavigatePrevious = true,
  },
  ref,
) {
  const { t } = useI18n()
  const titleId = useId()
  const focusRootRef = useRef<HTMLDivElement | null>(null)
  const contentSlotRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const focusToggleRef = useRef<HTMLButtonElement | null>(null)
  const [browserFullscreen, setBrowserFullscreen] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      getHostElement: () => focusRootRef.current,
      getContentElement: () => contentSlotRef.current,
      requestFullscreen: () => {
        const root = focusRootRef.current
        if (!root || !canRequestFullscreen(root)) return
        void requestElementFullscreen(root).catch(() => {})
      },
      exitFullscreen: () => {
        void exitFullscreenIfNeeded(focusRootRef.current).catch(() => {})
        setBrowserFullscreen(false)
      },
    }),
    [],
  )

  const focusNeutralSessionTarget = () => {
    // Prefer a neutral content target so step navigation does not leave
    // Fullscreen/Close focused (which shows :focus-visible / ghost hover-like
    // chrome). Close remains reachable via Tab.
    contentSlotRef.current?.focus?.({ preventScroll: true })
  }

  useEffect(() => {
    if (!open) return
    // After Input ↔ Results content swaps, restore neutral focus after paint.
    const id = window.requestAnimationFrame(() => {
      focusNeutralSessionTarget()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, title, footer])

  useEffect(() => {
    // Contained Focus sizes with vw/vh and centers in the viewport. When the
    // page behind toggles ResultsPanel (Input ↔ Results), the body scrollbar
    // can appear/disappear and shift the whole card — including the toolbar.
    // Fullscreen is unaffected (card uses % of the FS element). Lock scroll
    // for the whole Focus session so that toggle cannot move the anchor.
    if (!open) return
    const body = document.body
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`
    }
    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [open])

  useEffect(() => {
    const sync = () => {
      setBrowserFullscreen(isElementFullscreen(focusRootRef.current))
    }
    sync()
    return subscribeFullscreenChange(sync)
  }, [open, keepMounted])

  useEffect(() => {
    return () => {
      void exitFullscreenIfNeeded(focusRootRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (isElementFullscreen(focusRootRef.current)) {
        return
      }
      event.preventDefault()
      onExitFocus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onExitFocus])

  useEffect(() => {
    if (!open) return
    if (!onNavigatePrevious && !onNavigateNext) return
    const root = focusRootRef.current
    if (!root) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      if (event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (shouldIgnoreFocusArrowNavigation(event.target)) return
      // Session-scoped: accept events from inside the host, or from body
      // after content swaps (focus can land on document.body).
      const target = event.target
      const inHost =
        target instanceof Node &&
        (root.contains(target) ||
          target === document.body ||
          target === document.documentElement)
      if (!inHost) return
      event.preventDefault()
      let didNavigate = false
      if (event.key === "ArrowLeft") {
        if (!canNavigatePrevious) return
        onNavigatePrevious?.()
        didNavigate = true
      } else {
        if (!canNavigateNext) return
        onNavigateNext?.()
        didNavigate = true
      }
      if (!didNavigate) return
      // Double rAF: wait until after React commits so the browser’s focus
      // fallback (often Close) is overwritten by neutral focus.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusNeutralSessionTarget()
        })
      })
    }

    // Window listener so navigation does not depend on a focused descendant
    // after Input ↔ Results content swaps.
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    open,
    onNavigatePrevious,
    onNavigateNext,
    canNavigateNext,
    canNavigatePrevious,
  ])

  const enterBrowserFullscreen = () => {
    const root = focusRootRef.current
    if (!root || !canRequestFullscreen(root)) return
    void requestElementFullscreen(root).catch(() => {})
  }

  const exitBrowserFullscreen = () => {
    void exitFullscreenIfNeeded(focusRootRef.current).catch(() => {})
    setBrowserFullscreen(false)
    window.requestAnimationFrame(() => {
      focusToggleRef.current?.focus()
    })
  }

  const handleClose = () => {
    void exitFullscreenIfNeeded(focusRootRef.current).catch(() => {})
    setBrowserFullscreen(false)
    onExitFocus()
  }

  if (!open && !keepMounted) return null
  if (typeof document === "undefined") return null

  const dormant = !open && keepMounted

  return createPortal(
    <div
      ref={focusRootRef}
      className={cn(
        "flex items-center justify-center",
        dormant
          ? "pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
          : browserFullscreen
            ? "h-full min-h-full w-full bg-background p-4 sm:p-8"
            : // Same dimmed-app backdrop as Guided Input Focus (not opaque white).
              "fixed inset-0 z-[210] bg-black/40 p-3 sm:p-6",
      )}
      role="presentation"
      data-focus-mode-overlay=""
      data-focus-session-host=""
      data-focus-backdrop={
        !dormant && !browserFullscreen ? "dimmed" : undefined
      }
      data-focus-host-dormant={dormant ? "true" : undefined}
      data-focus-browser-fullscreen={
        !dormant && browserFullscreen ? "true" : undefined
      }
    >
      <div
        role={dormant ? undefined : "dialog"}
        aria-modal={dormant ? undefined : true}
        aria-labelledby={dormant ? undefined : titleId}
        className={cn(
          "relative flex max-w-full flex-col overflow-hidden",
          dormant
            ? "h-full w-full"
            : cn(
                // Shared Focus frame: same contained card for Input + Results.
                // Only browserFullscreen enlarges the card.
                "rounded-lg border border-border/60 bg-background shadow-md",
                browserFullscreen
                  ? FOCUS_SESSION_CARD_FULLSCREEN_CLASS
                  : FOCUS_SESSION_CARD_CLASS,
              ),
        )}
        data-focus-frame-contract={dormant ? undefined : "session"}
        onClick={(e) => e.stopPropagation()}
        {...(dormant ? {} : { [surfaceAttr]: "" })}
      >
        {/*
          Stable session toolbar (Input placement is the visual reference):
          Fullscreen + Close stay flush to the card’s top-right for every Focus
          phase. Result Settings (and any other phase extras) are absolutely
          parked to the left of that pair so they never change its anchor.
        */}
        {!dormant ? (
          <div
            className="pointer-events-none absolute top-4 right-5 z-20 sm:right-8"
            data-focus-session-toolbar=""
          >
            <div
              className="pointer-events-auto relative flex items-center gap-0.5"
              data-focus-session-toolbar-common=""
            >
              {headerActions ? (
                <div
                  className="pointer-events-auto absolute top-0 right-full mr-0.5 flex items-center"
                  data-focus-session-toolbar-extra=""
                >
                  {headerActions}
                </div>
              ) : null}
              <button
                ref={focusToggleRef}
                type="button"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                  className: "text-muted-foreground hover:text-foreground",
                })}
                aria-label={
                  browserFullscreen
                    ? t("inputs.guidedExitFocusMode")
                    : t("inputs.guidedFocusMode")
                }
                title={
                  browserFullscreen
                    ? t("inputs.guidedExitFocusMode")
                    : t("inputs.guidedFocusMode")
                }
                aria-pressed={browserFullscreen}
                onClick={() => {
                  if (browserFullscreen) exitBrowserFullscreen()
                  else enterBrowserFullscreen()
                }}
                data-focus-mode-fullscreen-toggle=""
              >
                {browserFullscreen ? (
                  <Minimize2 className="size-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Maximize2 className="size-4" strokeWidth={2} aria-hidden />
                )}
              </button>
              <button
                ref={closeBtnRef}
                type="button"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                  className: "text-muted-foreground hover:text-foreground",
                })}
                aria-label={t("common.close")}
                title={t("common.close")}
                onClick={handleClose}
                data-focus-mode-close=""
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        {!dormant ? (
          <div className={FOCUS_SESSION_HEADER_CLASS} data-focus-mode-header="">
            <div
              className={FOCUS_SESSION_HEADER_TITLE_CLASS}
              data-focus-mode-header-titles=""
            >
              {subtitle ? (
                <div
                  className="font-sans text-[12px] font-medium text-muted-foreground"
                  data-focus-mode-subtitle=""
                >
                  {subtitle}
                </div>
              ) : (
                <div
                  className="min-h-[1.25rem]"
                  data-focus-mode-subtitle-slot=""
                  aria-hidden
                />
              )}
              <div className="flex min-w-0 items-center gap-1.5">
                <h2
                  id={titleId}
                  className="m-0 font-sans text-[15px] font-medium tracking-tight text-foreground"
                >
                  {title}
                </h2>
                {headerHelp}
              </div>
            </div>
            <div
              className={FOCUS_SESSION_HEADER_AUX_CLASS}
              data-focus-mode-header-aux=""
            >
              {headerAuxiliary ?? null}
            </div>
          </div>
        ) : null}

        {!dormant && status ? (
          <div
            className="shrink-0 border-b border-border/40 px-5 py-3 sm:px-8"
            data-focus-mode-status=""
          >
            {status}
          </div>
        ) : null}

        <div
          ref={contentSlotRef}
          tabIndex={dormant ? undefined : -1}
          className={cn(
            dormant
              ? "relative min-h-0 flex-1 overflow-hidden outline-none"
              : FOCUS_SESSION_CONTENT_CLASS,
          )}
          data-focus-mode-body=""
          data-focus-host-content=""
        >
          {!dormant ? children : null}
        </div>

        {!dormant && footer ? (
          <div className={FOCUS_SESSION_FOOTER_CLASS} data-focus-mode-footer="">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
})
