import { useEffect, useId, useRef, useState } from "react"
import { Archive, MoreHorizontal } from "lucide-react"

import { AnalysisModeIndicator } from "@/features/analysis-library/AnalysisModeIndicator"
import { useI18n } from "@/i18n/useI18n"
import type { AnalysisSummary } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"
import { formatShortDate } from "@/features/analysis-library/page/libraryListModel"

export function LibraryRowActionsMenu({
  items,
  revealWithRow = false,
}: {
  items: { label: string; onSelect: () => void }[]
  /** Quiet until parent `.group` hover/focus; reserved width avoids layout shift. */
  revealWithRow?: boolean
}) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  return (
    <div
      className={cn(
        "relative shrink-0",
        revealWithRow &&
          cn(
            "transition-opacity duration-150",
            menuOpen
              ? "opacity-100"
              : cn(
                  "opacity-0",
                  "group-hover:opacity-100 group-focus-within:opacity-100",
                  "[@media(hover:none)]:opacity-100",
                ),
          ),
      )}
      style={revealWithRow ? { width: "2rem" } : undefined}
      ref={rootRef}
    >
      <button
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-muted-foreground",
          // Row owns hover surface — no nested action background.
          "hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={t("library.analysisActions")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        title={t("library.analysisActions")}
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((v) => !v)
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-[100] mt-1 min-w-[11rem] rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-1.5 text-left font-sans text-[12px] text-foreground hover:bg-muted/60"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function LibraryListRow({
  item,
  language,
  onOpen,
  onRename,
  onMove,
  onMoveToTrash,
}: {
  item: AnalysisSummary
  language: "no" | "en"
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onMoveToTrash: () => void
}) {
  const { t } = useI18n()
  return (
    <li
      className={cn(
        "group flex items-center gap-1 border-b border-border/40 py-0.5",
        // One shared hover/focus field for name + ⋯
        "rounded-md hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        className={cn(
          "min-w-0 flex-1 px-2 py-1.5 text-left text-foreground/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        title={
          item.status === "archived" ? `${item.name} — ${t("library.statusArchived")}` : item.name
        }
        aria-label={
          item.status === "archived" ? `${item.name} — ${t("library.statusArchived")}` : item.name
        }
        onClick={onOpen}
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span className="min-w-0 truncate font-sans text-[13px] font-medium text-foreground">
            {item.name}
          </span>
          <AnalysisModeIndicator mode={item.analysisMode} />
          {item.status === "archived" ? (
            <Archive
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
              data-archived-icon=""
            />
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-sans text-[11px] text-muted-foreground">
          <span>
            {item.status === "archived" ? t("library.statusArchived") : t("library.statusDraft")}
          </span>
          <span aria-hidden>·</span>
          <span>
            {formatShortDate(
              item.status === "archived" ? (item.archivedAt ?? item.updatedAt) : item.updatedAt,
              language,
            )}
          </span>
        </span>
      </button>

      <LibraryRowActionsMenu
        revealWithRow
        items={[
          {
            label: t("library.renameAnalysis"),
            onSelect: onRename,
          },
          {
            label: t("library.moveAnalysis"),
            onSelect: onMove,
          },
          {
            label: t("library.delete"),
            onSelect: onMoveToTrash,
          },
        ]}
      />
    </li>
  )
}

export function TrashListRow({
  item,
  language,
  onRestore,
  onDeletePermanently,
}: {
  item: AnalysisSummary
  language: "no" | "en"
  onRestore: () => void
  onDeletePermanently: () => void
}) {
  const { t } = useI18n()

  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
      <div className={cn("min-w-0 flex-1 rounded px-2 py-1.5", "text-foreground/90")}>
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span className="min-w-0 truncate font-sans text-[13px] font-medium text-foreground">
            {item.name}
          </span>
          <AnalysisModeIndicator mode={item.analysisMode} />
          {item.status === "archived" ? (
            <Archive
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
              data-archived-icon=""
            />
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-sans text-[11px] text-muted-foreground">
          <span>
            {item.status === "archived" ? t("library.statusArchived") : t("library.statusDraft")}
          </span>
          {item.deletedAt ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatShortDate(item.deletedAt, language)}</span>
            </>
          ) : null}
        </span>
      </div>
      <LibraryRowActionsMenu
        items={[
          {
            label: t("library.restore"),
            onSelect: onRestore,
          },
          {
            label: t("library.deletePermanently"),
            onSelect: onDeletePermanently,
          },
        ]}
      />
    </li>
  )
}
