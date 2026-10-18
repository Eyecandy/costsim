import { Archive } from "lucide-react"

import { AnalysisModeIndicator } from "@/features/analysis-library/AnalysisModeIndicator"
import { useI18n } from "@/i18n/useI18n"
import type { AnalysisSummary } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"
import { SidebarEntityActionsMenu } from "@/features/analysis-library/nav/SidebarEntityActionsMenu"

export function AnalysisRow({
  item,
  active,
  onOpen,
  className,
  archivedLabel,
  onRename,
  onMove,
  onTrash,
}: {
  item: AnalysisSummary
  active: boolean
  onOpen: () => void
  className?: string
  archivedLabel: string
  onRename?: () => void
  onMove?: () => void
  onTrash?: () => void
}) {
  const { t } = useI18n()
  const isArchived = item.status === "archived"
  const rowTitle = isArchived ? `${item.name} — ${archivedLabel}` : item.name
  const actionItems =
    onRename && onMove && onTrash
      ? [
          { label: t("library.renameAnalysis"), onSelect: onRename },
          { label: t("library.moveAnalysis"), onSelect: onMove },
          { label: t("library.delete"), onSelect: onTrash },
        ]
      : null
  return (
    <li
      className={cn(
        "group/sidebar-entity-row flex min-w-0 items-center gap-0.5 rounded",
        // One shared hover/active surface for name + ⋯
        active ? "bg-muted" : "hover:bg-muted/50",
      )}
      data-sidebar-entity-row="analysis"
    >
      <button
        type="button"
        title={rowTitle}
        aria-label={rowTitle}
        onClick={onOpen}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded text-left font-sans",
          className,
          active ? "font-medium text-foreground" : "text-foreground/90",
        )}
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span className="min-w-0 truncate">{item.name}</span>
          <AnalysisModeIndicator mode={item.analysisMode} />
          {isArchived ? (
            <Archive
              className="size-3 shrink-0 text-muted-foreground"
              aria-hidden
              data-archived-icon=""
            />
          ) : null}
        </span>
      </button>
      {actionItems ? (
        <SidebarEntityActionsMenu items={actionItems} menuLabel={t("library.analysisActions")} />
      ) : null}
    </li>
  )
}
