import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Archive, MoreHorizontal } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

type AnalysisActionsMenuProps = {
  canSaveAndContinueLater: boolean
  /** Show Archive for editable drafts (not archived). */
  canArchive: boolean
  /** Override archive menu label (e.g. checkpoint archive in ongoing mode). */
  archiveLabel?: string
  /** Finish whole Ongoing Analysis (lifecycle active only). */
  finishOngoingLabel?: string | null
  onFinishOngoing?: () => void
  /**
   * Delete the active tip draft checkpoint only (not the AnalysisDocument).
   * Must not reuse onMoveToTrash / analysis delete.
   */
  deleteCheckpointLabel?: string | null
  onDeleteCheckpoint?: () => void
  canRename: boolean
  canMoveToTrash?: boolean
  onSaveAndContinueLater: () => void
  onArchive: () => void
  onRename: () => void
  onMoveToTrash?: () => void
  createNewVersionLabel?: string | null
  onCreateNewVersion?: () => void
  startOngoingLabel?: string | null
  onStartOngoing?: () => void
}

/**
 * Compact contextual menu for the current analysis (near workspace title).
 */
export function AnalysisActionsMenu({
  canSaveAndContinueLater,
  canArchive,
  archiveLabel,
  finishOngoingLabel = null,
  onFinishOngoing,
  deleteCheckpointLabel = null,
  onDeleteCheckpoint,
  canRename,
  canMoveToTrash = false,
  onSaveAndContinueLater,
  onArchive,
  onRename,
  onMoveToTrash,
  createNewVersionLabel = null,
  onCreateNewVersion,
  startOngoingLabel = null,
  onStartOngoing,
}: AnalysisActionsMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const hasItems =
    canSaveAndContinueLater ||
    canArchive ||
    Boolean(finishOngoingLabel && onFinishOngoing) ||
    Boolean(deleteCheckpointLabel && onDeleteCheckpoint) ||
    canRename ||
    canMoveToTrash ||
    Boolean(createNewVersionLabel && onCreateNewVersion) ||
    Boolean(startOngoingLabel && onStartOngoing)
  if (!hasItems) return null

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "flex size-7 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-muted/70 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={t("library.analysisActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-1/2 top-full z-[100] mt-1 min-w-[12.5rem] -translate-x-1/2 rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          {canSaveAndContinueLater ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onSaveAndContinueLater()
              }}
            >
              {t("library.saveAndContinueLater")}
            </MenuItem>
          ) : null}
          {canRename ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onRename()
              }}
            >
              {t("library.renameAnalysis")}
            </MenuItem>
          ) : null}
          {canArchive ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onArchive()
              }}
              iconEnd={
                <Archive
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                  data-archived-icon=""
                />
              }
            >
              {archiveLabel ?? t("library.archiveAction")}
            </MenuItem>
          ) : null}
          {finishOngoingLabel && onFinishOngoing ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onFinishOngoing()
              }}
              iconEnd={
                <Archive
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                  data-archived-icon=""
                />
              }
            >
              {finishOngoingLabel}
            </MenuItem>
          ) : null}
          {createNewVersionLabel && onCreateNewVersion ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onCreateNewVersion()
              }}
            >
              {createNewVersionLabel}
            </MenuItem>
          ) : null}
          {startOngoingLabel && onStartOngoing ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onStartOngoing()
              }}
            >
              {startOngoingLabel}
            </MenuItem>
          ) : null}
          {deleteCheckpointLabel && onDeleteCheckpoint ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onDeleteCheckpoint()
              }}
            >
              {deleteCheckpointLabel}
            </MenuItem>
          ) : null}
          {canMoveToTrash && onMoveToTrash ? (
            <MenuItem
              onClick={() => {
                setOpen(false)
                onMoveToTrash()
              }}
            >
              {t("library.delete")}
            </MenuItem>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  iconEnd,
  destructive = false,
}: {
  children: ReactNode
  onClick: () => void
  iconEnd?: ReactNode
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/70",
        destructive ? "text-muted-foreground hover:text-destructive" : "text-foreground",
      )}
      onClick={onClick}
    >
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
        <span className="min-w-0 truncate">{children}</span>
        {iconEnd ? (
          <span className="inline-flex shrink-0" aria-hidden>
            {iconEnd}
          </span>
        ) : null}
      </span>
    </button>
  )
}
