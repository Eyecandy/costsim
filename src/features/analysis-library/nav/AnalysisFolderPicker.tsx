import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, Plus } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import type { AnalysisFolder } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"

export function AnalysisFolderPicker({
  folders,
  value,
  onChange,
  onRequestNewFolder,
}: {
  folders: AnalysisFolder[]
  value: string | null
  onChange: (folderId: string | null) => void
  onRequestNewFolder: () => void
}) {
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

  const selectedLabel =
    value == null
      ? t("library.noFolder")
      : (folders.find((f) => f.id === value)?.name ?? t("library.noFolder"))

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2",
          "font-sans text-[13px] text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={t("library.folderLabel")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={t("library.folderLabel")}
          className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-56 overflow-y-auto rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          <button
            type="button"
            role="option"
            aria-selected={value == null}
            className={cn(
              "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
              value == null ? "font-medium text-foreground" : "text-foreground/90",
            )}
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            {t("library.noFolder")}
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              role="option"
              aria-selected={value === f.id}
              className={cn(
                "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
                value === f.id ? "font-medium text-foreground" : "text-foreground/90",
              )}
              onClick={() => {
                onChange(f.id)
                setOpen(false)
              }}
            >
              {f.name}
            </button>
          ))}
          <div className="my-1 border-t border-border/50" role="separator" />
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left font-sans text-[12px] text-[#1d868c] hover:bg-muted/60"
            onClick={() => {
              setOpen(false)
              onRequestNewFolder()
            }}
          >
            <Plus className="size-3.5 shrink-0" aria-hidden />
            {t("library.newFolder")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
