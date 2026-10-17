import type { DeterministicTornadoRow } from "@/domain/simulation/deterministicTornado"
import {
  collectTornadoDisplayValues,
  formatTornadoSignedDeltaWithScale,
  resolveTornadoDisplayScale,
  type WaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"

export type TornadoSharedLayout = {
  rightMarginPx: number
}

export function formatTornadoImpactLabel(
  value: number,
  scale: WaterfallDisplayScale,
  language: "no" | "en",
): string {
  return formatTornadoSignedDeltaWithScale(value, scale, language)
}

export function computeTornadoSharedSymmetricMaxAbs(
  rowsGroups: readonly (readonly DeterministicTornadoRow[])[],
): number {
  let m = 0
  for (const rows of rowsGroups) {
    for (const r of rows) {
      m = Math.max(m, Math.abs(r.lowImpact), Math.abs(r.highImpact))
    }
  }
  return Math.max(m, 1e-12)
}

export function buildTornadoSharedLayout(
  rowsGroups: readonly (readonly DeterministicTornadoRow[])[],
  displayScales?: readonly WaterfallDisplayScale[],
): TornadoSharedLayout {
  let longestValueLabelLen = 0
  for (let i = 0; i < rowsGroups.length; i++) {
    const rows = rowsGroups[i]!
    const scale =
      displayScales?.[i] ??
      resolveTornadoDisplayScale(collectTornadoDisplayValues(rows))
    for (const r of rows) {
      longestValueLabelLen = Math.max(
        longestValueLabelLen,
        formatTornadoImpactLabel(r.lowImpact, scale, "no").length,
        formatTornadoImpactLabel(r.highImpact, scale, "no").length,
      )
    }
  }
  return {
    rightMarginPx: Math.max(40, Math.ceil(longestValueLabelLen * 8)),
  }
}
