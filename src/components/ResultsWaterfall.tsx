import { AttributionWaterfall } from "@/components/AttributionWaterfall"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"

type ResultsWaterfallProps = {
  result: ShapleyAttributionResult
  baseCostLabel: string
  p50Label: string
  expectedAdditionLabel: string
  otherLabel: string
  maxIndividual?: number
  expanded?: boolean
  expandLabel?: string
  onExpand?: () => void
}

export function ResultsWaterfall({
  result,
  baseCostLabel,
  p50Label,
  expectedAdditionLabel,
  otherLabel,
  maxIndividual,
  expanded = false,
  expandLabel,
  onExpand,
}: ResultsWaterfallProps) {
  return (
    <AttributionWaterfall
      startValue={result.baseCost}
      endValue={result.estimatedP50}
      contributions={result.contributions}
      startLabel={baseCostLabel}
      endLabel={p50Label}
      spanLabel={expectedAdditionLabel}
      otherLabel={otherLabel}
      maxIndividual={maxIndividual}
      expanded={expanded}
      expandLabel={expandLabel}
      onExpand={onExpand}
    />
  )
}

export type { WaterfallDisplayRow } from "@/components/AttributionWaterfall"
