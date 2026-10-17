import { useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import {
  isAnalysisNameConflictError,
  isAnalysisNameConflictOnMoveError,
} from "@/domain/analysis/analysisNameUniqueness"
import type { AnalysisFolder } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"

type MoveAnalysisDialogProps = {
  open: boolean
  analysisName: string
  /** Current folderId (null = ungrouped). */
  currentFolderId: string | null
  folders: AnalysisFolder[]
  onClose: () => void
  /**
   * Called to perform the move. May throw on conflict — dialog stays open.
   * Parent should clear its target only after success.
   */
  onMoved: (folderId: string | null) => void | Promise<void>
  /** Inline validation / move failure message. */
  error?: string | null
}

/**
 * Compact Move dialog: No folder + alphabetically sorted folders + New folder.
 * Reuses repository createFolder — same as New Analysis placement.
 */
export function MoveAnalysisDialog({
  open,
  analysisName,
  currentFolderId,
  folders,
  onClose,
  onMoved,
  error = null,
}: MoveAnalysisDialogProps) {
  const { t, language } = useI18n()
  const repo = getAnalysisLibraryRepository()
  const [selected, setSelected] = useState<string | null>(currentFolderId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    setSelected(currentFolderId)
    setCreatingFolder(false)
    setNewFolderName("")
    setPickerOpen(false)
    setBusy(false)
    setLocalError(null)
  }, [open, currentFolderId])

  const displayError = error ?? localError

  useEffect(() => {
    if (!pickerOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [pickerOpen])

  const foldersSorted = useMemo(
    () =>
      folders.slice().sort((a, b) =>
        a.name.localeCompare(b.name, language === "en" ? "en" : "nb", {
          sensitivity: "base",
        }),
      ),
    [folders, language],
  )

  const selectedLabel =
    selected == null
      ? t("library.noFolder")
      : (foldersSorted.find((f) => f.id === selected)?.name ?? t("library.noFolder"))

  const unchanged = (selected == null && currentFolderId == null) || selected === currentFolderId

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name || busy) return
    setBusy(true)
    setLocalError(null)
    try {
      const folder = await repo.createFolder(name)
      setSelected(folder.id)
      setCreatingFolder(false)
      setNewFolderName("")
      await onMoved(folder.id)
    } catch (error) {
      setLocalError(
        isAnalysisNameConflictOnMoveError(error) || isAnalysisNameConflictError(error)
          ? t("library.duplicateNameOnMove")
          : t("library.saveError"),
      )
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    if (unchanged || busy) return
    setBusy(true)
    setLocalError(null)
    try {
      await onMoved(selected)
    } catch (error) {
      setLocalError(
        isAnalysisNameConflictOnMoveError(error) || isAnalysisNameConflictError(error)
          ? t("library.duplicateNameOnMove")
          : t("library.saveError"),
      )
    } finally {
      setBusy(false)
    }
  }

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-analysis-title"
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
      >
        <h2 id="move-analysis-title" className="m-0 mb-1 font-sans text-[15px] font-medium">
          {t("library.moveTitle")}
        </h2>
        <p className="m-0 mb-3 truncate font-sans text-[12px] text-muted-foreground">
          {analysisName}
        </p>

        {displayError ? (
          <p className="m-0 mb-3 font-sans text-[12px] text-destructive" role="alert">
            {displayError}
          </p>
        ) : null}

        {creatingFolder ? (
          <div className="mb-4 flex flex-col gap-2">
            <span className="font-sans text-[12px] font-medium text-foreground">
              {t("library.newFolder")}
            </span>
            <input
              autoFocus
              className="h-9 rounded-md border border-border bg-background px-2 font-sans text-[13px]"
              placeholder={t("library.newFolderPrompt")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFolder()
                if (e.key === "Escape") {
                  e.stopPropagation()
                  setCreatingFolder(false)
                  setNewFolderName("")
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setCreatingFolder(false)
                  setNewFolderName("")
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                disabled={!newFolderName.trim() || busy}
                onClick={() => void handleCreateFolder()}
              >
                {t("library.create")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-1">
              <span className="font-sans text-[11px] text-muted-foreground">
                {t("library.folderLabel")}
              </span>
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  className={cn(
                    "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2",
                    "font-sans text-[13px] text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={t("library.folderLabel")}
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  aria-controls={menuId}
                  onClick={() => setPickerOpen((v) => !v)}
                >
                  <span className="min-w-0 truncate">{selectedLabel}</span>
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
                {pickerOpen ? (
                  <div
                    id={menuId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-56 overflow-y-auto rounded-md border border-border/60 bg-background py-1 shadow-md"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected == null}
                      className={cn(
                        "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
                        selected == null ? "font-medium text-foreground" : "text-foreground/90",
                      )}
                      onClick={() => {
                        setSelected(null)
                        setPickerOpen(false)
                      }}
                    >
                      {t("library.noFolder")}
                    </button>
                    {foldersSorted.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        role="option"
                        aria-selected={selected === folder.id}
                        className={cn(
                          "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
                          selected === folder.id
                            ? "font-medium text-foreground"
                            : "text-foreground/90",
                        )}
                        onClick={() => {
                          setSelected(folder.id)
                          setPickerOpen(false)
                        }}
                      >
                        {folder.name}
                      </button>
                    ))}
                    <div className="my-1 border-t border-border/50" />
                    <button
                      type="button"
                      className="flex w-full px-3 py-1.5 text-left font-sans text-[12px] text-[#1d868c] hover:bg-muted/60"
                      onClick={() => {
                        setPickerOpen(false)
                        setCreatingFolder(true)
                      }}
                    >
                      + {t("library.newFolder")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
                onClick={onClose}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                disabled={unchanged || busy}
                onClick={() => void handleConfirm()}
              >
                {t("library.moveConfirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
