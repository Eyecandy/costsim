import { AttributionWaterfall } from "@/components/AttributionWaterfall"
import type { ShapleyAttributionResult } from "@/lib/shapleyAttribution"

type ResultsReserveWaterfallProps = {
  result: ShapleyAttributionResult
  p50Label: string
  p85Label: string
  uncertaintyReserveLabel: string
  otherLabel: string
  maxIndividual?: number
  expanded?: boolean
  expandLabel?: string
  onExpand?: () => void
}

export function ResultsReserveWaterfall({
  result,
  p50Label,
  p85Label,
  uncertaintyReserveLabel,
  otherLabel,
  maxIndividual,
  expanded = false,
  expandLabel,
  onExpand,
}: ResultsReserveWaterfallProps) {
  const decomposition = result.uncertaintyReserveDecomposition

  return (
    <AttributionWaterfall
      startValue={decomposition.startValue}
      endValue={decomposition.endValue}
      contributions={decomposition.contributions}
      startLabel={p50Label}
      endLabel={p85Label}
      spanLabel={uncertaintyReserveLabel}
      otherLabel={otherLabel}
      maxIndividual={maxIndividual}
      expanded={expanded}
      expandLabel={expandLabel}
      onExpand={onExpand}
    />
  )
}
