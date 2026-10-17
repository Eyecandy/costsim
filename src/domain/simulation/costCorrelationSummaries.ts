import { parseCorrelationCoefficient } from "@/domain/simulation/costCorrelation"
import type { CostCorrelationsByRowId } from "@/domain/analysis/project"

export type SavedCorrelationSummary = {
  /** Stable key from sorted row ids + rho. */
  id: string
  /** Cost-row ids in table order. */
  rowIds: readonly string[]
  rho: number
  kind: "group" | "pair"
}

type UndirectedEdge = {
  a: string
  b: string
  rho: number
}

function resolvePairRho(
  costCorrelations: CostCorrelationsByRowId | undefined,
  rowIdA: string,
  rowIdB: string,
): number {
  if (rowIdA === rowIdB) return 1
  const direct = costCorrelations?.[rowIdA]?.[rowIdB] ?? costCorrelations?.[rowIdB]?.[rowIdA]
  return parseCorrelationCoefficient(direct)
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function collectNonZeroEdges(
  orderedIds: readonly string[],
  costCorrelations: CostCorrelationsByRowId | undefined,
): UndirectedEdge[] {
  const edges: UndirectedEdge[] = []
  for (let i = 0; i < orderedIds.length; i++) {
    for (let j = i + 1; j < orderedIds.length; j++) {
      const a = orderedIds[i]!
      const b = orderedIds[j]!
      const rho = resolvePairRho(costCorrelations, a, b)
      if (rho === 0) continue
      edges.push({ a, b, rho })
    }
  }
  return edges
}

/**
 * True when every unique pair among `members` has exactly `rho`
 * in the stored matrix (complete uniform clique).
 */
export function isUniformCorrelationClique(
  costCorrelations: CostCorrelationsByRowId | undefined,
  members: readonly string[],
  rho: number,
): boolean {
  if (members.length < 2) return false
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if (resolvePairRho(costCorrelations, members[i]!, members[j]!) !== rho) {
        return false
      }
    }
  }
  return true
}

/**
 * Within edges that share one rho, cover with maximal complete cliques
 * (prefer larger groups). Leftover edges become pairs.
 * Cost tables are small (≤20), so subset enumeration is acceptable.
 */
function summarizeUniformRhoComponent(
  orderedIds: readonly string[],
  costCorrelations: CostCorrelationsByRowId | undefined,
  rho: number,
  edges: readonly UndirectedEdge[],
): SavedCorrelationSummary[] {
  const idOrder = new Map(orderedIds.map((id, index) => [id, index]))
  const remaining = new Set(edges.map((e) => edgeKey(e.a, e.b)))
  const vertexSet = new Set<string>()
  for (const e of edges) {
    vertexSet.add(e.a)
    vertexSet.add(e.b)
  }
  const vertices = [...vertexSet].sort((a, b) => (idOrder.get(a) ?? 0) - (idOrder.get(b) ?? 0))
  const n = vertices.length
  const summaries: SavedCorrelationSummary[] = []

  const tryClaim = (members: readonly string[]): boolean => {
    if (!isUniformCorrelationClique(costCorrelations, members, rho)) return false
    const memberEdges: string[] = []
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const k = edgeKey(members[i]!, members[j]!)
        if (!remaining.has(k)) return false
        memberEdges.push(k)
      }
    }
    for (const k of memberEdges) remaining.delete(k)
    const sortedMembers = [...members].sort((a, b) => (idOrder.get(a) ?? 0) - (idOrder.get(b) ?? 0))
    summaries.push({
      id: `${sortedMembers.join("+")}@${rho}`,
      rowIds: sortedMembers,
      rho,
      kind: sortedMembers.length === 2 ? "pair" : "group",
    })
    return true
  }

  for (let size = n; size >= 2 && remaining.size > 0; size--) {
    const choose = (start: number, acc: string[]) => {
      if (remaining.size === 0) return
      if (acc.length === size) {
        tryClaim(acc)
        return
      }
      for (let i = start; i < n; i++) {
        acc.push(vertices[i]!)
        choose(i + 1, acc)
        acc.pop()
        if (remaining.size === 0) return
      }
    }
    choose(0, [])
  }

  for (const e of edges) {
    const k = edgeKey(e.a, e.b)
    if (!remaining.has(k)) continue
    remaining.delete(k)
    const sortedMembers = [e.a, e.b].sort((a, b) => (idOrder.get(a) ?? 0) - (idOrder.get(b) ?? 0))
    summaries.push({
      id: `${sortedMembers.join("+")}@${rho}`,
      rowIds: sortedMembers,
      rho,
      kind: "pair",
    })
  }

  return summaries
}

/**
 * Derive compact saved-correlation summaries from the pairwise matrix only.
 * Zero correlations are omitted. Uniform complete cliques become groups;
 * otherwise pairs are listed.
 */
export function deriveSavedCorrelationSummaries(
  costRows: readonly { id: string }[],
  costCorrelations: CostCorrelationsByRowId | undefined,
): SavedCorrelationSummary[] {
  const orderedIds = costRows.map((r) => r.id)
  if (orderedIds.length < 2 || !costCorrelations) return []

  const edges = collectNonZeroEdges(orderedIds, costCorrelations)
  if (edges.length === 0) return []

  const byRho = new Map<number, UndirectedEdge[]>()
  for (const edge of edges) {
    const list = byRho.get(edge.rho) ?? []
    list.push(edge)
    byRho.set(edge.rho, list)
  }

  const rhos = [...byRho.keys()].sort((a, b) => Math.abs(b) - Math.abs(a) || b - a)
  const out: SavedCorrelationSummary[] = []
  for (const rho of rhos) {
    out.push(...summarizeUniformRhoComponent(orderedIds, costCorrelations, rho, byRho.get(rho)!))
  }
  return out
}

/** How many named items to list before collapsing to “N cost items”. */
export const CORRELATION_SUMMARY_NAME_LIMIT = 3

export function formatCorrelationSummaryRho(rho: number, language: "no" | "en"): string {
  const abs = Math.abs(rho).toFixed(1)
  const body = language === "no" ? abs.replace(".", ",") : abs
  if (rho > 0) return body
  if (rho < 0) return `-${body}`
  return body
}

export function formatSavedCorrelationSummaryLabel(opts: {
  summary: SavedCorrelationSummary
  nameById: ReadonlyMap<string, string>
  language: "no" | "en"
  costItemsWord: string
}): string {
  const { summary, nameById, language, costItemsWord } = opts
  const rhoText = formatCorrelationSummaryRho(summary.rho, language)
  const names = summary.rowIds.map((id, index) => {
    const raw = nameById.get(id)?.trim() ?? ""
    return raw || (language === "no" ? `Kost ${index + 1}` : `Cost ${index + 1}`)
  })

  if (names.length > CORRELATION_SUMMARY_NAME_LIMIT) {
    return `${names.length} ${costItemsWord} · ${rhoText}`
  }
  return `${names.join(" + ")} · ${rhoText}`
}

export const CORRELATION_SAVE_CONFIRM_MS = 1800
