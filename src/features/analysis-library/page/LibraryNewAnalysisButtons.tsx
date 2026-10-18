import { Plus } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

export function FolderNewAnalysisButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2",
        "font-sans text-[12px] text-muted-foreground",
        "hover:bg-muted/40 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={t("library.newAnalysis")}
      onClick={onClick}
    >
      <Plus className="size-3.5 shrink-0" aria-hidden />
      {t("library.newAnalysis")}
    </button>
  )
}

export function HomeNewAnalysisButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md bg-[#1d868c] px-3.5 py-2",
        "font-sans text-[13px] font-medium text-white",
        "hover:bg-[#1d868c]/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={onClick}
    >
      <Plus className="size-3.5 shrink-0" aria-hidden />
      {t("library.newAnalysis")}
    </button>
  )
}
