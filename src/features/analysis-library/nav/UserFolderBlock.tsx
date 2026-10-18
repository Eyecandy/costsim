import { ChevronDown, ChevronRight } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import type { AnalysisSummary } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"
import { AnalysisRow } from "@/features/analysis-library/nav/AnalysisRow"
import { SidebarEntityActionsMenu } from "@/features/analysis-library/nav/SidebarEntityActionsMenu"

/**
 * One user-created folder row under Mapper (or the synthetic Ungrouped row).
 * Nested analyses render ONLY when `expanded` is true — not All analyses.
 */
export function UserFolderBlock({
  folderKey,
  label,
  expanded,
  onToggle,
  items,
  activeAnalysisId,
  onOpen,
  onSelectFolder,
  selected,
  rowClass,
  archivedLabel,
  onRename,
  onDelete,
  onRenameAnalysis,
  onMoveAnalysis,
  onTrashAnalysis,
}: {
  folderKey: string
  label: string
  expanded: boolean
  onToggle: () => void
  items: AnalysisSummary[]
  activeAnalysisId: string | null
  onOpen: (id: string) => void
  onSelectFolder: () => void
  selected: boolean
  rowClass?: string
  archivedLabel: string
  onRename?: () => void
  onDelete?: () => void
  onRenameAnalysis?: (item: AnalysisSummary) => void
  onMoveAnalysis?: (item: AnalysisSummary) => void
  onTrashAnalysis?: (id: string) => void
}) {
  const { t } = useI18n()
  const folderActionItems =
    onRename || onDelete
      ? [
          ...(onRename ? [{ label: t("library.renameFolder"), onSelect: onRename }] : []),
          ...(onDelete ? [{ label: t("library.deleteFolder"), onSelect: onDelete }] : []),
        ]
      : null

  return (
    <div
      className="mb-0.5"
      data-user-folder={folderKey}
      data-folder-expanded={expanded ? "true" : "false"}
    >
      <div
        className={cn(
          "group/sidebar-entity-row flex min-w-0 items-center gap-0.5 rounded",
          // One shared surface for chevron + name + ⋯ (collapsed or expanded).
          selected ? "bg-muted" : "hover:bg-muted/50",
        )}
        data-sidebar-entity-row="folder"
      >
        <button
          type="button"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground",
            "hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-expanded={expanded}
          aria-label={label}
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          title={label}
          data-sidebar-folder-highlight={folderKey}
          onClick={() => {
            // Name click expands/collapses the tree (same as chevron) and selects the folder view.
            onToggle()
            onSelectFolder()
          }}
          className={cn(
            "min-w-0 flex-1 truncate rounded text-left font-sans",
            rowClass,
            selected
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
        {folderActionItems ? (
          <SidebarEntityActionsMenu
            items={folderActionItems}
            menuLabel={t("library.folderActions")}
          />
        ) : null}
      </div>
      {expanded ? (
        <ul
          className="m-0 ml-3 list-none border-l border-border/40 py-0.5 pl-2"
          data-folder-children={folderKey}
        >
          {items.map((item) => (
            <AnalysisRow
              key={item.id}
              item={item}
              active={item.id === activeAnalysisId}
              onOpen={() => onOpen(item.id)}
              className={rowClass}
              archivedLabel={archivedLabel}
              onRename={onRenameAnalysis ? () => onRenameAnalysis(item) : undefined}
              onMove={onMoveAnalysis ? () => onMoveAnalysis(item) : undefined}
              onTrash={onTrashAnalysis ? () => onTrashAnalysis(item.id) : undefined}
            />
          ))}
          {items.length === 0 ? (
            <li className="px-2 py-1 font-sans text-[11px] text-muted-foreground">—</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
