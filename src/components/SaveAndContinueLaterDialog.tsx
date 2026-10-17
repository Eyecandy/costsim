import { useEffect, useState } from "react"

import { useI18n } from "@/i18n/useI18n"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import type { AnalysisFolder } from "@/domain/analysis/analysisDocument"

type SaveAndContinueLaterDialogProps = {
  open: boolean
  initialFolderId: string | null
  onCancel: () => void
  onConfirm: (folderId: string | null) => void | Promise<void>
  /** Folder placement conflict / save failure. */
  error?: string | null
}

/**
 * Lightweight placement dialog before leaving to the Analysis Library.
 * Distinct from continuous autosave and from Archive.
 */
export function SaveAndContinueLaterDialog({
  open,
  initialFolderId,
  onCancel,
  onConfirm,
  error = null,
}: SaveAndContinueLaterDialogProps) {
  const { t } = useI18n()
  const repo = getAnalysisLibraryRepository()
  const [folders, setFolders] = useState<AnalysisFolder[]>([])
  const [folderId, setFolderId] = useState<string | null>(initialFolderId)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setFolderId(initialFolderId)
    setCreatingFolder(false)
    setNewFolderName("")
    setBusy(false)
    void repo.listFolders().then(setFolders)
  }, [open, initialFolderId, repo])

  if (!open) return null

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    const folder = await repo.createFolder(name)
    setFolders((prev) => [...prev, folder])
    setFolderId(folder.id)
    setCreatingFolder(false)
    setNewFolderName("")
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-continue-title"
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="save-continue-title"
          className="m-0 mb-3 font-sans text-[15px] font-medium"
        >
          {t("library.saveAndContinueLater")}
        </h2>
        {error ? (
          <p className="m-0 mb-3 font-sans text-[12px] text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <label className="mb-2 flex flex-col gap-1">
          <span className="font-sans text-[11px] text-muted-foreground">
            {t("library.folderLabel")}
          </span>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 font-sans text-[13px]"
            value={folderId ?? ""}
            onChange={(e) =>
              setFolderId(e.target.value ? e.target.value : null)
            }
          >
            <option value="">{t("library.noFolder")}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        {creatingFolder ? (
          <div className="mb-4 flex flex-col gap-2">
            <input
              autoFocus
              className="h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
              placeholder={t("library.newFolderPrompt")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFolder()
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-7 rounded-md px-2 font-sans text-[11px] text-muted-foreground hover:bg-muted"
                onClick={() => setCreatingFolder(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="h-7 rounded-md bg-[#1d868c] px-2 font-sans text-[11px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                disabled={!newFolderName.trim()}
                onClick={() => void handleCreateFolder()}
              >
                {t("library.create")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mb-4 font-sans text-[12px] text-muted-foreground hover:text-foreground"
            onClick={() => setCreatingFolder(true)}
          >
            + {t("library.newFolder")}
          </button>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
            onClick={onCancel}
            disabled={busy}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void Promise.resolve(onConfirm(folderId)).finally(() =>
                setBusy(false),
              )
            }}
          >
            {t("library.saveAndGoToLibrary")}
          </button>
        </div>
      </div>
    </div>
  )
}
