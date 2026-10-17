import { Waypoints } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import type { AnalysisMode } from "@/domain/analysis/analysisDocument"
import { normalizeAnalysisMode } from "@/domain/analysis/analysisDocument"
import { cn } from "@/lib/utils"

export type AnalysisModeIndicatorProps = {
  /** Authoritative document mode — do not infer from checkpoints. */
  mode: AnalysisMode | unknown
  className?: string
}

/**
 * Subtle icon-only Ongoing Analysis cue for Library / sidebar rows.
 * Tooltip + aria-label explain the mode; renders nothing for Single Analysis.
 */
export function AnalysisModeIndicator({
  mode,
  className,
}: AnalysisModeIndicatorProps) {
  const { t } = useI18n()
  if (normalizeAnalysisMode(mode) !== "ongoing") return null

  const label = t("library.modeOngoingTitle")

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center text-muted-foreground",
        className,
      )}
      data-analysis-mode="ongoing"
      title={label}
      aria-label={label}
    >
      <Waypoints className="size-3 shrink-0" strokeWidth={2} aria-hidden />
    </span>
  )
}
