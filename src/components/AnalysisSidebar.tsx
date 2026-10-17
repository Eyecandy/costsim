import { useEffect, useId, useState } from "react"
import { Menu, Pin, PinOff } from "lucide-react"

import { AnalysisLibraryNav } from "@/components/AnalysisLibraryNav"
import { useI18n } from "@/i18n/useI18n"
import {
  loadSidebarPinned,
  saveSidebarPinned,
} from "@/lib/sidebarUiPreferences"
import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH_PX = 240
const MD_MIN_WIDTH = 768

type AnalysisSidebarProps = {
  activeAnalysisId?: string | null
  /** Refresh sidebar lists when library documents change (e.g. after archive). */
  libraryEpoch?: string | number | null
  /** Controlled mobile/menu open request from parent (e.g. header button). */
  mobileOpenRequest?: number
  /** Notifies parent when pin preference changes (for closed-rail content offset). */
  onPinnedChange?: (pinned: boolean) => void
  /**
   * Flush pending draft autosave before navigating to a Library destination
   * from an open analysis.
   */
  beforeLeaveWorkspace?: () => void | Promise<void>
}

export function AnalysisSidebar({
  activeAnalysisId = null,
  libraryEpoch = null,
  mobileOpenRequest = 0,
  onPinnedChange,
  beforeLeaveWorkspace,
}: AnalysisSidebarProps) {
  const { t } = useI18n()
  const panelId = useId()
  const [pinned, setPinned] = useState(() => loadSidebarPinned())
  const [open, setOpen] = useState(false)
  const [isMdUp, setIsMdUp] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(min-width: ${MD_MIN_WIDTH}px)`).matches
      : true,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD_MIN_WIDTH}px)`)
    const onChange = () => setIsMdUp(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Mobile: open when parent bumps the request counter.
  useEffect(() => {
    if (mobileOpenRequest > 0) {
      setOpen(true)
    }
  }, [mobileOpenRequest])

  // Escape closes temporary overlay.
  useEffect(() => {
    if (!open || (pinned && isMdUp)) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, pinned, isMdUp])

  const effectivelyPinned = pinned && isMdUp
  const overlayOpen = open && !effectivelyPinned

  const setPinnedPreference = (next: boolean) => {
    setPinned(next)
    saveSidebarPinned(next)
    onPinnedChange?.(next)
    if (next) setOpen(true)
  }

  useEffect(() => {
    onPinnedChange?.(pinned)
    // Sync initial pin preference to parent once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openSidebar = () => setOpen(true)
  const closeSidebar = () => setOpen(false)

  const nav = (
    <AnalysisLibraryNav
      activeAnalysisId={activeAnalysisId}
      libraryEpoch={libraryEpoch}
      beforeLeaveWorkspace={beforeLeaveWorkspace}
      onNavigated={() => {
        if (!effectivelyPinned) setOpen(false)
      }}
      className="px-2 py-3"
    />
  )

  return (
    <>
      {/* Desktop pinned column — participates in layout, does not overlay. */}
      {effectivelyPinned ? (
        <aside
          className="sticky top-0 z-30 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border/50 bg-background md:flex"
          style={{ width: SIDEBAR_WIDTH_PX }}
          aria-label={t("library.sidebarLabel")}
        >
          <div className="flex h-10 shrink-0 items-center justify-end border-b border-border/40 px-2">
            <PinButton
              pinned
              label={t("library.unpinSidebar")}
              onClick={() => setPinnedPreference(false)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
        </aside>
      ) : null}

      {/* Collapsed trigger (desktop unpinned, closed) — click only, no hover-open. */}
      {!effectivelyPinned && isMdUp && !open ? (
        <div className="fixed left-0 top-0 z-[70] flex h-full w-9 flex-col items-start pl-2">
          <button
            type="button"
            className="mt-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            aria-label={t("library.openSidebar")}
            aria-expanded={false}
            aria-controls={panelId}
            onClick={openSidebar}
          >
            <Menu className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {/* Overlay drawer (desktop unpinned open, or any mobile open) */}
      {overlayOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            aria-label={t("library.closeSidebar")}
            onClick={closeSidebar}
          />
          <aside
            id={panelId}
            className={cn(
              "fixed left-0 top-0 z-[90] flex h-full w-[min(240px,88vw)] flex-col border-r border-border/50 bg-background shadow-md",
              "transition-opacity duration-150 ease-out",
            )}
            aria-label={t("library.sidebarLabel")}
          >
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/40 px-2">
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 md:hidden"
                aria-label={t("library.closeSidebar")}
                onClick={closeSidebar}
              >
                <Menu className="size-4" aria-hidden />
              </button>
              <span className="hidden md:block" />
              {isMdUp ? (
                <PinButton
                  pinned={false}
                  label={t("library.pinSidebar")}
                  onClick={() => setPinnedPreference(true)}
                />
              ) : (
                <span className="size-7" />
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
          </aside>
        </>
      ) : null}
    </>
  )
}

function PinButton({
  pinned,
  label,
  onClick,
}: {
  pinned: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pinned}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      onClick={onClick}
    >
      {pinned ? (
        <PinOff className="size-3.5" aria-hidden />
      ) : (
        <Pin className="size-3.5" aria-hidden />
      )}
    </button>
  )
}

/** Header affordance for opening the library sidebar on narrow screens. */
export function AnalysisSidebarMenuButton({
  onOpen,
  className,
}: {
  onOpen: () => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={cn(
        "ml-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground sm:ml-1",
        className,
      )}
      aria-label={t("library.openSidebar")}
      onClick={onOpen}
    >
      <Menu className="size-4" aria-hidden />
    </button>
  )
}
