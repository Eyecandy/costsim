import {
  compareCheckpoints,
  hasStructuralChanges,
  type CheckpointComparison,
  type CheckpointResultSource,
} from "@/domain/analysis/checkpointComparison"
import {
  comparisonAbsoluteCellParts,
  comparisonDeltaCellParts,
  comparisonMetricLabel,
  costDeltaTone,
  formatCheckpointContextLabel,
  formatStructuralChangeSummary,
  getCostDeltaClass,
  getPercentageDeltaClass,
  selectComparisonKeyFigures,
} from "@/domain/analysis/checkpointComparisonPresentation"
import { listVisibleComparableKeyFigureRowIds } from "@/domain/results/keyFigureVisibility"
import type { AnalysisCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import type { ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import { useI18n } from "@/i18n/useI18n"
import {
  KeyFigureMetricColumnHeader,
  KeyFigureMetricValue,
} from "@/features/results/KeyFigureMetricValue"
import { SectionExpander } from "@/shared/SectionExpander"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { useState } from "react"
import { cn } from "@/shared/utils"

type CheckpointComparisonSectionProps = {
  checkpoints: readonly AnalysisCheckpoint[]
  viewedCheckpointId: string
  viewedResultSource: CheckpointResultSource
  /** Active Result Preferences — same source of truth as main Key Figures. */
  resultPreferences: ResultPreferencesV1
  /**
   * `context` — checkpoint labels above Key Figures.
   * `change` — comparison expander after Key Figures.
   */
  slot: "context" | "change"
}

export function CheckpointComparisonSection({
  checkpoints,
  viewedCheckpointId,
  viewedResultSource,
  resultPreferences,
  slot,
}: CheckpointComparisonSectionProps) {
  const { t, language } = useI18n()
  const [comparisonOpen, setComparisonOpen] = useState(true)

  const keyFigureMetricIds = listVisibleComparableKeyFigureRowIds(resultPreferences.keyFigures)

  const comparison = compareCheckpoints({
    checkpoints,
    viewedCheckpointId,
    viewedResultSource,
    keyFigureMetricIds,
    probabilityBelowAmount: resultPreferences.keyFigures.probabilityBelowCostLevel.amount,
  })

  if (!comparison) return null

  const sequenceTemplate = t("checkpoints.sequenceLabel")
  const currentLabel = formatCheckpointContextLabel(
    comparison.currentSequence,
    comparison.currentName,
    sequenceTemplate,
  )

  if (slot === "context") {
    return (
      <div
        data-checkpoint-comparison=""
        data-checkpoint-comparison-slot="context"
        data-checkpoint-comparison-context=""
        data-checkpoint-comparison-kind={comparison.kind}
        className="space-y-0.5"
      >
        <p className="m-0 font-sans text-[11px] font-medium text-foreground/90">{currentLabel}</p>
        {comparison.kind === "baseline" ? (
          <p className="m-0 section-body text-[11px] text-muted-foreground/85">
            {t("checkpoints.comparisonBaselineContext")}
          </p>
        ) : (
          <p className="m-0 section-body text-[11px] text-muted-foreground/85">
            {t("checkpoints.comparisonComparedWith").replace(
              "{label}",
              formatCheckpointContextLabel(
                comparison.previousSequence,
                comparison.previousName,
                sequenceTemplate,
              ),
            )}
          </p>
        )}
      </div>
    )
  }

  return (
    <div data-checkpoint-comparison="" data-checkpoint-comparison-slot="change">
      <SectionExpander
        title={t("checkpoints.comparisonHeading")}
        defaultOpen
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        headerClassName="px-0 py-1"
        titleClassName="text-[11px]"
      >
        {comparison.kind === "baseline" ? (
          <p
            className="m-0 section-body text-[11px] text-muted-foreground/85"
            data-checkpoint-comparison-baseline=""
          >
            {t("checkpoints.comparisonBaselineBody")}
          </p>
        ) : (
          <ComparisonPairBody
            comparison={comparison}
            resultPreferences={resultPreferences}
            t={t}
            language={language}
          />
        )}
      </SectionExpander>
    </div>
  )
}

function ComparisonPairBody({
  comparison,
  resultPreferences,
  t,
  language,
}: {
  comparison: Extract<CheckpointComparison, { kind: "comparison" }>
  resultPreferences: ResultPreferencesV1
  t: (key: string) => string
  language: "no" | "en"
}) {
  const structuralPhrases = formatStructuralChangeSummary(comparison.structural, language)
  const structuralEmpty = !hasStructuralChanges(comparison.structural)
  const visibleRows = selectComparisonKeyFigures(
    comparison.keyFigures,
    resultPreferences.keyFigures,
  )
  const lockedLabel = t("results.locked")
  const belowAmount = resultPreferences.keyFigures.probabilityBelowCostLevel.amount

  return (
    <div className="space-y-3" data-checkpoint-comparison-body="">
      {visibleRows.length > 0 ? (
        <Table className="table-fixed min-w-[28rem]" data-checkpoint-comparison-table="">
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="truncate text-left">
                {t("checkpoints.comparisonColMetric")}
              </TableHead>
              <TableHead>
                <KeyFigureMetricColumnHeader>
                  {t("checkpoints.comparisonColPrevious")}
                </KeyFigureMetricColumnHeader>
              </TableHead>
              <TableHead>
                <KeyFigureMetricColumnHeader>
                  {t("checkpoints.comparisonColCurrent")}
                </KeyFigureMetricColumnHeader>
              </TableHead>
              <TableHead>
                <KeyFigureMetricColumnHeader>
                  {t("checkpoints.comparisonColChange")}
                </KeyFigureMetricColumnHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => {
              // Absolute and pp colors are independent (each from its own delta).
              const absoluteDelta = row.change
              const percentagePointDelta = row.changePercent ?? null
              const tone = costDeltaTone(absoluteDelta, row.metric)
              const absoluteDeltaClass = getCostDeltaClass(absoluteDelta, row.metric)
              const percentageDeltaClass = getPercentageDeltaClass(percentagePointDelta)
              const previousParts = comparisonAbsoluteCellParts(
                row,
                "previous",
                language,
                lockedLabel,
              )
              const currentParts = comparisonAbsoluteCellParts(
                row,
                "current",
                language,
                lockedLabel,
              )
              const changeParts = comparisonDeltaCellParts(row, language)
              return (
                <TableRow key={row.metric} data-key-figure-row={row.metric}>
                  <TableCell className="text-left break-words [overflow-wrap:anywhere]">
                    {comparisonMetricLabel(row.metric, t, language, belowAmount)}
                  </TableCell>
                  <TableCell className="table-value text-right tabular-nums">
                    <KeyFigureMetricValue
                      absoluteText={previousParts.absoluteText}
                      percentText={previousParts.percentText}
                      reservePercentSlot={previousParts.reservePercentSlot}
                    />
                  </TableCell>
                  <TableCell className="table-value text-right tabular-nums">
                    <KeyFigureMetricValue
                      absoluteText={currentParts.absoluteText}
                      percentText={currentParts.percentText}
                      reservePercentSlot={currentParts.reservePercentSlot}
                    />
                  </TableCell>
                  <TableCell
                    className="table-value text-right tabular-nums"
                    data-cost-delta-tone={tone}
                    data-cost-delta-value=""
                  >
                    <KeyFigureMetricValue
                      absoluteText={changeParts.absoluteText}
                      percentText={changeParts.percentText}
                      reservePercentSlot={changeParts.reservePercentSlot}
                      absoluteClassName={cn("font-medium", absoluteDeltaClass)}
                      percentClassNameOverride={
                        changeParts.percentText
                          ? cn("justify-self-start text-left font-medium", percentageDeltaClass)
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : null}

      <p
        className="m-0 section-body text-[11px] text-muted-foreground/85"
        data-checkpoint-structural-summary=""
      >
        {structuralEmpty ? t("checkpoints.comparisonNoStructural") : structuralPhrases.join(" · ")}
      </p>
    </div>
  )
}
