import { useMemo, useState } from "react"

import { useI18n } from "@/i18n/useI18n"
import type { AnalysisSummary } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"
import {
  LIBRARY_MAIN_COLUMN,
  type LibraryStatusFilter,
  type TrashSortMode,
  sortLibraryList,
  applyStatusFilter,
} from "@/features/analysis-library/page/libraryListModel"
import { LibraryListToolbarSelect } from "@/features/analysis-library/page/LibraryListToolbarSelect"
import { TrashListRow } from "@/features/analysis-library/page/LibraryListRows"

export function TrashView({
  loading,
  items,
  language,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
}: {
  loading: boolean
  items: AnalysisSummary[]
  language: "no" | "en"
  onRestore: (id: string) => void
  onDeletePermanently: (id: string) => void
  onEmptyTrash: () => void
}) {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all")
  const [sortMode, setSortMode] = useState<TrashSortMode>("deletedAt")

  const visible = useMemo(() => {
    const filtered = applyStatusFilter(items, statusFilter)
    return sortLibraryList(filtered, sortMode, language)
  }, [items, statusFilter, sortMode, language])

  const emptyFilterMessage =
    statusFilter === "draft"
      ? t("library.noDraftsAmongDeleted")
      : statusFilter === "archived"
        ? t("library.noArchivedAmongDeleted")
        : t("library.trashEmpty")

  if (loading) {
    return <p className="m-0 py-8 font-sans text-[13px] text-muted-foreground">…</p>
  }

  const hasItems = items.length > 0

  return (
    <div className={cn(LIBRARY_MAIN_COLUMN, "flex flex-col gap-3")}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="m-0 min-w-0 flex-1 truncate font-sans text-lg font-medium text-foreground">
            {t("library.trashHeading")}
          </h1>
          {hasItems ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <LibraryListToolbarSelect
                ariaLabel={t("library.showFilterLabel")}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  {
                    value: "all",
                    label: t("library.filterShowAll"),
                  },
                  {
                    value: "draft",
                    label: t("library.filterShowDrafts"),
                  },
                  {
                    value: "archived",
                    label: t("library.filterShowArchived"),
                  },
                ]}
              />
              <LibraryListToolbarSelect
                ariaLabel={t("library.sortAnalysesLabel")}
                value={sortMode}
                onChange={setSortMode}
                options={[
                  {
                    value: "deletedAt",
                    label: t("library.sortRecentlyDeleted"),
                  },
                  {
                    value: "updatedAt",
                    label: t("library.sortLastModified"),
                  },
                  {
                    value: "nameAsc",
                    label: t("library.sortNameAsc"),
                  },
                  {
                    value: "nameDesc",
                    label: t("library.sortNameDesc"),
                  },
                ]}
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p className="m-0 min-w-0 flex-1 font-sans text-[12px] text-muted-foreground">
            {t("library.trashRetentionHint")}
          </p>
          {hasItems ? (
            <button
              type="button"
              className="shrink-0 rounded px-2 py-1.5 font-sans text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onEmptyTrash}
            >
              {t("library.emptyTrash")}
            </button>
          ) : null}
        </div>
      </div>

      {!hasItems ? (
        <p className="m-0 py-10 font-sans text-[13px] text-muted-foreground">
          {t("library.trashEmpty")}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0 border-t border-border/50 p-0">
          {visible.length === 0 ? (
            <li className="py-8 font-sans text-[13px] text-muted-foreground">
              {emptyFilterMessage}
            </li>
          ) : (
            visible.map((item) => (
              <TrashListRow
                key={item.id}
                item={item}
                language={language}
                onRestore={() => onRestore(item.id)}
                onDeletePermanently={() => onDeletePermanently(item.id)}
              />
            ))
          )}
        </ul>
      )}
    </div>
  )
}
