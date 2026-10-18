import { useI18n } from "@/i18n/useI18n"
import type { AnalysisSummary } from "@/domain/analysis/analysisDocument"
import { cn } from "@/shared/utils"
import { LIBRARY_MAIN_COLUMN } from "@/features/analysis-library/page/libraryListModel"
import { HomeNewAnalysisButton } from "@/features/analysis-library/page/LibraryNewAnalysisButtons"
import { LibraryListRow } from "@/features/analysis-library/page/LibraryListRows"

export function LibraryHomeContent({
  loading,
  isEmptyLibrary,
  recent,
  language,
  onNewAnalysis,
  onOpenAnalysis,
  onViewAll,
  onMoveToTrash,
  onRename,
  onMove,
}: {
  loading: boolean
  isEmptyLibrary: boolean
  recent: AnalysisSummary[]
  language: "no" | "en"
  onNewAnalysis: () => void
  onOpenAnalysis: (id: string) => void
  onViewAll: () => void
  onMoveToTrash: (id: string) => void
  onRename: (item: AnalysisSummary) => void
  onMove: (item: AnalysisSummary) => void
}) {
  const { t } = useI18n()

  if (loading) {
    return <p className="m-0 py-8 font-sans text-[13px] text-muted-foreground">…</p>
  }

  if (isEmptyLibrary) {
    return (
      <div className="flex max-w-md flex-col gap-4 py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-sans text-lg font-medium text-foreground">
            {t("library.emptyTitle")}
          </h1>
          <p className="m-0 font-sans text-[13px] text-muted-foreground">
            {t("library.emptyBody")}
          </p>
        </div>
        <HomeNewAnalysisButton onClick={onNewAnalysis} />
      </div>
    )
  }

  return (
    <div className={cn(LIBRARY_MAIN_COLUMN, "flex flex-col gap-2")}>
      <h1 className="m-0 font-sans text-lg font-medium text-foreground">
        {t("library.recentAnalysesHeading")}
      </h1>
      <ul className="m-0 flex list-none flex-col gap-0 border-t border-border/50 p-0">
        {recent.map((item) => (
          <LibraryListRow
            key={item.id}
            item={item}
            language={language}
            onOpen={() => onOpenAnalysis(item.id)}
            onRename={() => onRename(item)}
            onMove={() => onMove(item)}
            onMoveToTrash={() => onMoveToTrash(item.id)}
          />
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 self-start font-sans text-[12px] text-[#1d868c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onViewAll}
      >
        {t("library.viewAllAnalyses")}
      </button>
    </div>
  )
}
