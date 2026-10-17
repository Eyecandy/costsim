import type { ShapleyContribution } from "@/domain/simulation/shapleyAttribution"

export const DEFAULT_WATERFALL_TOP_N = 6

export type WaterfallDisplayRow = {
  kind: "individual" | "other"
  id: string
  name: string
  contribution: number
}

export type GroupWaterfallContributorsOptions = {
  maxIndividual?: number
  otherLabel?: string
}

export function groupWaterfallContributors(
  contributions: readonly ShapleyContribution[],
  options: GroupWaterfallContributorsOptions = {},
): WaterfallDisplayRow[] {
  const maxIndividual = options.maxIndividual ?? DEFAULT_WATERFALL_TOP_N
  const sorted = [...contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  )

  if (sorted.length <= maxIndividual) {
    return sorted.map((row) => ({
      kind: "individual" as const,
      id: row.id,
      name: row.name,
      contribution: row.contribution,
    }))
  }

  const visible = sorted.slice(0, maxIndividual)
  const hidden = sorted.slice(maxIndividual)
  const otherSum = hidden.reduce((acc, row) => acc + row.contribution, 0)

  return [
    ...visible.map((row) => ({
      kind: "individual" as const,
      id: row.id,
      name: row.name,
      contribution: row.contribution,
    })),
    {
      kind: "other" as const,
      id: "__other__",
      name: options.otherLabel ?? "Other",
      contribution: otherSum,
    },
  ]
}

export function sumWaterfallDisplayContributions(rows: readonly WaterfallDisplayRow[]): number {
  return rows.reduce((acc, row) => acc + row.contribution, 0)
}
