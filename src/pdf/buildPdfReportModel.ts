/**
 * Pure helpers for PDF report content (easy to unit-test without rendering).
 */
import type { Project } from "@/domain/analysis/project"
import { collectNonZeroCostCorrelations } from "@/domain/results/aiBrief"
import { formatNumber, type AppLanguage } from "@/domain/results/formatNumber"
import {
  parseCostForSimulation,
  parseDriverForSimulation,
  parseNumberField,
  resolveDriverImpactPercent,
} from "@/domain/results/tableRows"

/**
 * Max valid cost items for a readable full correlation matrix on A4.
 * Above this, fall back to a pair table. Documented for PDF layout.
 * Representative ~14×14 cases must prefer a one-page matrix.
 */
export const PDF_CORRELATION_MATRIX_MAX_COST_ITEMS = 20

export type PdfCostItemBlock = {
  name: string
  description: string | null
  optimisticPct: number
  mostLikely: number
  pessimisticPct: number
}

export type PdfDriverBlock = {
  name: string
  description: string | null
  optimisticPct: number
  mostLikely: number
  pessimisticPct: number
}

export type PdfImpactOverride = {
  driverName: string
  costItemName: string
  impactPct: number
}

export type PdfCorrelationPair = {
  costItemAName: string
  costItemBName: string
  rho: number
}

export type PdfCorrelationGroupSummary = {
  names: string[]
  rho: number
}

export type PdfCorrelationSection =
  | { kind: "none" }
  | {
      kind: "matrix"
      names: string[]
      /** Full symmetric matrix; diagonal = 1; unspecified = 0. */
      cells: number[][]
      groupSummary: PdfCorrelationGroupSummary | null
    }
  | {
      kind: "pairs"
      pairs: PdfCorrelationPair[]
      groupSummary: PdfCorrelationGroupSummary | null
    }

export type PdfAmountScale = "raw" | "mill"

function scenarioHasContent(row: {
  name: string
  optimistic: string
  likely: string
  pessimistic: string
}) {
  return (
    row.name.trim() !== "" ||
    row.optimistic.trim() !== "" ||
    row.likely.trim() !== "" ||
    row.pessimistic.trim() !== ""
  )
}

function optionalText(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null
  const t = raw.trim()
  return t === "" ? null : t
}

export function buildPdfCostItemBlocks(project: Project): PdfCostItemBlock[] {
  return project.costRows
    .filter(
      (row) =>
        scenarioHasContent(row) && parseCostForSimulation(row) !== null,
    )
    .map((row) => {
      const mostLikely = parseNumberField(row.likely)!
      const optimisticPct = parseNumberField(row.optimistic)!
      const pessimisticPct = parseNumberField(row.pessimistic)!
      return {
        name: row.name.trim() || "—",
        description: optionalText(row.description),
        optimisticPct,
        mostLikely,
        pessimisticPct,
      }
    })
}

export function buildPdfDriverBlocks(project: Project): PdfDriverBlock[] {
  return project.driverRows
    .filter(
      (row) =>
        scenarioHasContent(row) && parseDriverForSimulation(row) !== null,
    )
    .map((row) => ({
      name: row.name.trim() || "—",
      description: optionalText(row.description),
      optimisticPct: parseNumberField(row.optimistic)!,
      mostLikely: parseNumberField(row.likely)!,
      pessimisticPct: parseNumberField(row.pessimistic)!,
    }))
}

export function buildPdfAssumptionTexts(project: Project): string[] {
  return (project.assumptions ?? [])
    .map((a) => a.text)
    .filter((t) => t.trim() !== "")
}

/** Sparse non-default impact overrides only (≠ 100). */
export function buildPdfImpactOverrides(project: Project): PdfImpactOverride[] {
  const costs = project.costRows.filter(
    (r) => scenarioHasContent(r) && parseCostForSimulation(r) !== null,
  )
  const drivers = project.driverRows.filter(
    (r) => scenarioHasContent(r) && parseDriverForSimulation(r) !== null,
  )
  const out: PdfImpactOverride[] = []
  for (const d of drivers) {
    for (const c of costs) {
      const pct = resolveDriverImpactPercent(
        project.driverImpacts?.[d.id]?.[c.id],
      )
      if (pct === 100) continue
      out.push({
        driverName: d.name.trim() || "—",
        costItemName: c.name.trim() || "—",
        impactPct: pct,
      })
    }
  }
  return out
}

/**
 * Full correlation matrix over ALL valid cost items (project order).
 * Diagonal = 1; unspecified pairs = 0; specified pairs = rho (symmetric).
 * Fallback to pairs only when cost-item count exceeds readability threshold.
 */
export function buildPdfCorrelationSection(
  project: Project,
): PdfCorrelationSection {
  const costs = project.costRows.filter(
    (r) => scenarioHasContent(r) && parseCostForSimulation(r) !== null,
  )
  const pairs = collectNonZeroCostCorrelations(
    costs,
    project.costCorrelations,
  )
  if (pairs.length === 0) return { kind: "none" }

  const mappedPairs: PdfCorrelationPair[] = pairs.map((p) => ({
    costItemAName: p.costItemAName,
    costItemBName: p.costItemBName,
    rho: p.rho,
  }))

  const involvedIds = new Set<string>()
  for (const p of pairs) {
    involvedIds.add(p.costItemAId)
    involvedIds.add(p.costItemBId)
  }
  const involvedNames = costs
    .filter((c) => involvedIds.has(c.id))
    .map((c) => c.name.trim() || "—")
  const groupSummary = detectUniformCompleteGroup(involvedNames, mappedPairs)

  if (costs.length > PDF_CORRELATION_MATRIX_MAX_COST_ITEMS) {
    return {
      kind: "pairs",
      pairs: mappedPairs,
      groupSummary,
    }
  }

  const names = costs.map((c) => c.name.trim() || "—")
  const n = costs.length
  const cells: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  )
  const idToIndex = new Map(costs.map((c, i) => [c.id, i]))
  for (const p of pairs) {
    const i = idToIndex.get(p.costItemAId)
    const j = idToIndex.get(p.costItemBId)
    if (i === undefined || j === undefined || i === j) continue
    cells[i]![j] = p.rho
    cells[j]![i] = p.rho
  }

  return {
    kind: "matrix",
    names,
    cells,
    groupSummary,
  }
}

/**
 * Restrained background fill from |ρ| (easy to restyle later).
 * Returns null for near-zero cells (no emphasis).
 */
export function pdfCorrelationCellFill(rho: number): string | null {
  const a = Math.abs(rho)
  if (a < 0.05) return null
  if (Math.abs(a - 1) < 1e-9) return "#e2e8f0"
  if (a < 0.25) return "#f8fafc"
  if (a < 0.5) return "#f1f5f9"
  if (a < 0.75) return "#e2e8f0"
  return "#cbd5e1"
}

/** Complete clique with identical ρ → optional human-readable summary. */
export function detectUniformCompleteGroup(
  names: string[],
  pairs: readonly PdfCorrelationPair[],
): PdfCorrelationGroupSummary | null {
  const n = names.length
  if (n < 2) return null
  const expected = (n * (n - 1)) / 2
  if (pairs.length !== expected) return null
  const rho0 = pairs[0]!.rho
  if (!pairs.every((p) => Math.abs(p.rho - rho0) < 1e-9)) return null
  return { names: [...names], rho: rho0 }
}

export function formatPdfCorrelationGroupSummary(
  summary: PdfCorrelationGroupSummary,
  language: AppLanguage,
): string {
  const names = summary.names
  const conj = language === "no" ? "og" : "and"
  let list: string
  if (names.length === 1) list = names[0]!
  else if (names.length === 2) list = `${names[0]} ${conj} ${names[1]}`
  else {
    list = `${names.slice(0, -1).join(", ")} ${conj} ${names[names.length - 1]}`
  }
  return `${list} · ρ = ${formatPdfRho(summary.rho, language)}`
}

export function formatPdfRho(value: number, language: AppLanguage): string {
  return formatNumber(value, 2, language)
}

/** Use millions display when any absolute cost is ≥ 1e6. */
export function resolvePdfAmountScale(
  amounts: readonly number[],
): PdfAmountScale {
  const max = amounts.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  return max >= 1_000_000 ? "mill" : "raw"
}

export function formatPdfAbsoluteAmount(
  value: number,
  language: AppLanguage,
  scale: PdfAmountScale,
): string {
  if (!Number.isFinite(value)) return "—"
  if (scale === "mill") {
    const m = value / 1_000_000
    const abs = Math.abs(m)
    const fd =
      abs >= 100 || Math.abs(m - Math.round(m)) < 1e-6
        ? 0
        : abs >= 10
          ? 1
          : 1
    const body = formatNumber(m, fd, language)
    return language === "en" ? `${body} mill.` : `${body} mill.`
  }
  return formatNumber(value, 0, language)
}

export type PdfContributionFactor = {
  id: string
  name: string
  contribution: number
  type?: "cost" | "driver"
}

export type PdfContributionWaterfall = {
  startValue: number
  endValue: number
  contributions: PdfContributionFactor[]
}

export type PdfContributionBlock = {
  projectName: string
  expectedAddition: PdfContributionWaterfall
  uncertaintyReserve: PdfContributionWaterfall
}

/** Map an existing Shapley result for PDF — does not recompute attribution. */
export function mapShapleyToPdfContribution(
  projectName: string,
  result: {
    baseCost: number
    estimatedP50: number
    contributions: readonly {
      id: string
      name: string
      contribution: number
      type?: "cost" | "driver"
    }[]
    expectedAdditionDecomposition: {
      startValue: number
      endValue: number
      contributions: readonly {
        id: string
        name: string
        contribution: number
        type?: "cost" | "driver"
      }[]
    }
    uncertaintyReserveDecomposition: {
      startValue: number
      endValue: number
      contributions: readonly {
        id: string
        name: string
        contribution: number
        type?: "cost" | "driver"
      }[]
    }
  },
): PdfContributionBlock {
  const mapFactors = (
    list: readonly {
      id: string
      name: string
      contribution: number
      type?: "cost" | "driver"
    }[],
  ): PdfContributionFactor[] =>
    list.map((c) => ({
      id: c.id,
      name: c.name,
      contribution: c.contribution,
      type: c.type,
    }))

  // Match ResultsWaterfall: expected-addition uses result.contributions alias.
  return {
    projectName,
    expectedAddition: {
      startValue: result.baseCost,
      endValue: result.estimatedP50,
      contributions: mapFactors(result.contributions),
    },
    uncertaintyReserve: {
      startValue: result.uncertaintyReserveDecomposition.startValue,
      endValue: result.uncertaintyReserveDecomposition.endValue,
      contributions: mapFactors(
        result.uncertaintyReserveDecomposition.contributions,
      ),
    },
  }
}

/** Format signed percent for PDF metadata rows. */
export function formatPdfSignedPct(
  value: number,
  language: "no" | "en",
): string {
  const abs = Math.abs(value)
  const body =
    language === "en"
      ? abs.toLocaleString("en-GB", {
          maximumFractionDigits: 1,
          minimumFractionDigits: Number.isInteger(abs) ? 0 : 1,
        })
      : abs
          .toLocaleString("nb-NO", {
            maximumFractionDigits: 1,
            minimumFractionDigits: Number.isInteger(abs) ? 0 : 1,
          })
          .replace(/\u00a0/g, " ")
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${body} %`
}

/** Compact monetary label for S-curve P50/P85 callouts. */
export function formatPdfSCurveMarkerValue(
  value: number,
  language: AppLanguage,
): string {
  const scale = resolvePdfAmountScale([value])
  return formatPdfAbsoluteAmount(value, language, scale)
}
