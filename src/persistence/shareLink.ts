import {
  initialProjects,
  normalizeIncurredCosts,
  type CostCorrelationsByRowId,
  type DriverImpactsByRowId,
  type Project,
} from "@/domain/analysis/project"
import { assumptionsFromShareTexts, assumptionsToShareTexts } from "@/domain/analysis/assumptions"
import {
  projectProfileFromShare,
  projectProfileToShare,
  type ProjectProfileShare,
} from "@/domain/analysis/projectProfile"
import { appFeatures } from "@/config/appVariant"
import {
  clampCorrelationCoefficient,
  parseCorrelationCoefficient,
} from "@/domain/simulation/costCorrelation"
import { parseCostDescription, parseDriverDescription } from "@/domain/results/rowDefinitions"
import {
  newId,
  parseDriverImpactPercent,
  resolveDriverImpactPercent,
  type CostElementRow,
  type DriverRow,
  type ScenarioRow,
} from "@/domain/results/tableRows"
import { parseProjectsPayload } from "@/domain/analysis/projectsPayload"
import LZString from "lz-string"

/** Legacy uncompressed full-state links (still decoded on load). */
export const SHARE_HASH_PREFIX = "#share="

/** Compact + gzip payload (legacy hash form; still decoded on load). */
export const SHARE_V2_PREFIX = "#z="
export const SHARE_QUERY_PARAM = "s"

/**
 * Application-level ceiling for a generated share URL (characters).
 *
 * Rationale: intermediaries (chat, email, some proxies) and older URL tooling
 * often truncate well below modern browser maxima. 8_000 leaves headroom for a
 * normal multi-project analysis after LZ-String compression while failing
 * closed when definitions/assumptions push the payload into fragile territory.
 * We do not auto-drop analysis fields to fit.
 */
export const SHARE_URL_MAX_LENGTH = 8_000

export type ShareInputState = {
  projects: Project[]
  activeProjectId: string
}

export type BuildShareUrlResult =
  { ok: true; url: string } | { ok: false; reason: "oversized" | "unavailable" }

/** Cost tuple: name, opt, likely, pes, optional description. */
type CostShareTuple = [string, string, string, string] | [string, string, string, string, string]

/** Driver tuple: name, opt, likely, pes, optional description (+ legacy ignored 6th). */
type DriverShareTuple =
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string]

/** [driverIndex, costIndex, impactPct] — non-default (≠ 100) only. */
export type ShareDriverImpactTriple = [number, number, number]

/** [costIndexA, costIndexB, rho] — unique off-diagonal non-zero only. */
export type ShareCorrelationTriple = [number, number, number]

type ShareProjectCompactBase = {
  n: string
  ic?: number
  /** Ordered assumption texts (optional; missing on older shares). */
  a?: string[]
  /** Structured project profile IDs (optional; missing on older shares). */
  pp?: ProjectProfileShare
  c: CostShareTuple[]
  d: DriverShareTuple[]
}

/** Legacy compact projects without relationship fields. */
export type ShareCompactV2 = {
  v: 2
  ai: number
  p: ShareProjectCompactBase[]
}

/** Current compact share: index-based sparse impacts + correlations. */
export type ShareCompactV3 = {
  v: 3
  ai: number
  p: (ShareProjectCompactBase & {
    /** Sparse non-default driver impacts. */
    di?: ShareDriverImpactTriple[]
    /** Sparse unique non-zero cost correlations. */
    cr?: ShareCorrelationTriple[]
  })[]
}

export type ShareCompactPayload = ShareCompactV2 | ShareCompactV3

function rowIsEmptyContent(r: ScenarioRow): boolean {
  return !r.name.trim() && !r.optimistic.trim() && !r.likely.trim() && !r.pessimistic.trim()
}

function trimRowsForShare<T extends ScenarioRow>(rows: readonly T[]): T[] {
  const out = [...rows]
  while (out.length > 1 && rowIsEmptyContent(out[out.length - 1]!)) {
    out.pop()
  }
  return out
}

function costRowToTuple(r: CostElementRow): CostShareTuple {
  const base: [string, string, string, string] = [r.name, r.optimistic, r.likely, r.pessimistic]
  const description = parseCostDescription(r.description ?? "")
  return description ? [...base, description] : base
}

function driverRowToTuple(r: DriverRow): DriverShareTuple {
  const base: [string, string, string, string] = [r.name, r.optimistic, r.likely, r.pessimistic]
  const description = parseDriverDescription(r.description ?? "")
  return description ? [...base, description] : base
}

function tupleToCostRow(t: unknown): CostElementRow | null {
  if (!Array.isArray(t) || t.length < 4 || t.length > 5) return null
  const [name, optimistic, likely, pessimistic, descriptionRaw] = t
  if (
    typeof name !== "string" ||
    typeof optimistic !== "string" ||
    typeof likely !== "string" ||
    typeof pessimistic !== "string"
  ) {
    return null
  }
  const row: CostElementRow = {
    id: newId(),
    name,
    optimistic,
    likely,
    pessimistic,
  }
  if (typeof descriptionRaw === "string") {
    const description = parseCostDescription(descriptionRaw)
    if (description !== null) row.description = description
  }
  return row
}

function tupleToDriverRow(t: unknown): DriverRow | null {
  // Accept legacy 6-tuples (old uncertaintyAssessment slot) but ignore that slot.
  if (!Array.isArray(t) || t.length < 4 || t.length > 6) return null
  const [name, optimistic, likely, pessimistic, descriptionRaw] = t
  if (
    typeof name !== "string" ||
    typeof optimistic !== "string" ||
    typeof likely !== "string" ||
    typeof pessimistic !== "string"
  ) {
    return null
  }
  const row: DriverRow = {
    id: newId(),
    name,
    optimistic,
    likely,
    pessimistic,
  }
  if (typeof descriptionRaw === "string") {
    const description = parseDriverDescription(descriptionRaw)
    if (description !== null) row.description = description
  }
  return row
}

function isValidShareIndex(n: unknown, length: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n < length
}

/** Encode sparse non-default impacts by row index in the serialized arrays. */
export function encodeDriverImpactTriples(
  costRows: readonly CostElementRow[],
  driverRows: readonly DriverRow[],
  driverImpacts: DriverImpactsByRowId | undefined,
): ShareDriverImpactTriple[] | undefined {
  const triples: ShareDriverImpactTriple[] = []
  for (let di = 0; di < driverRows.length; di++) {
    const driverId = driverRows[di]!.id
    for (let ci = 0; ci < costRows.length; ci++) {
      const costId = costRows[ci]!.id
      const pct = resolveDriverImpactPercent(driverImpacts?.[driverId]?.[costId])
      if (pct === 100) continue
      triples.push([di, ci, pct])
    }
  }
  return triples.length > 0 ? triples : undefined
}

/** Encode unique non-zero off-diagonal correlations (i < j) by cost index. */
export function encodeCorrelationTriples(
  costRows: readonly CostElementRow[],
  costCorrelations: CostCorrelationsByRowId | undefined,
): ShareCorrelationTriple[] | undefined {
  const triples: ShareCorrelationTriple[] = []
  for (let i = 0; i < costRows.length; i++) {
    for (let j = i + 1; j < costRows.length; j++) {
      const idA = costRows[i]!.id
      const idB = costRows[j]!.id
      const raw = costCorrelations?.[idA]?.[idB] ?? costCorrelations?.[idB]?.[idA]
      const rho = parseCorrelationCoefficient(raw)
      if (rho === 0) continue
      triples.push([i, j, rho])
    }
  }
  return triples.length > 0 ? triples : undefined
}

/**
 * Rebuild driverImpacts from index triples. Invalid entries are skipped
 * (never mapped onto the wrong row).
 */
export function decodeDriverImpactTriples(
  raw: unknown,
  costRows: readonly CostElementRow[],
  driverRows: readonly DriverRow[],
): DriverImpactsByRowId | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: DriverImpactsByRowId = {}
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 3) continue
    const [driverIndex, costIndex, impactRaw] = entry
    if (!isValidShareIndex(driverIndex, driverRows.length)) continue
    if (!isValidShareIndex(costIndex, costRows.length)) continue
    const impact =
      typeof impactRaw === "number"
        ? parseDriverImpactPercent(String(impactRaw))
        : typeof impactRaw === "string"
          ? parseDriverImpactPercent(impactRaw)
          : null
    if (impact === null || impact === 100) continue
    const driverId = driverRows[driverIndex]!.id
    const costId = costRows[costIndex]!.id
    if (!out[driverId]) out[driverId] = {}
    out[driverId]![costId] = String(impact)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Rebuild costCorrelations from index triples. Invalid / self / OOB entries
 * are skipped. Stored as a single directed pair; sim layer symmetrizes.
 */
export function decodeCorrelationTriples(
  raw: unknown,
  costRows: readonly CostElementRow[],
): CostCorrelationsByRowId | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: CostCorrelationsByRowId = {}
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 3) continue
    const [indexA, indexB, rhoRaw] = entry
    if (!isValidShareIndex(indexA, costRows.length)) continue
    if (!isValidShareIndex(indexB, costRows.length)) continue
    if (indexA === indexB) continue
    const rhoNum =
      typeof rhoRaw === "number"
        ? rhoRaw
        : typeof rhoRaw === "string"
          ? parseCorrelationCoefficient(rhoRaw)
          : NaN
    if (!Number.isFinite(rhoNum)) continue
    const rho = clampCorrelationCoefficient(rhoNum)
    if (rho === 0) continue
    const idA = costRows[indexA]!.id
    const idB = costRows[indexB]!.id
    // Canonicalize to lower index first for stable storage shape.
    const [lo, hi] = indexA < indexB ? [idA, idB] : [idB, idA]
    if (!out[lo]) out[lo] = {}
    out[lo]![hi] = String(rho)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Build the current (v3) compact share payload. Exported for tests. */
export function buildShareCompactPayload(state: ShareInputState): ShareCompactV3 {
  const projects = state.projects.slice(0, appFeatures.maxProjects)
  const activeIndex = Math.max(
    0,
    projects.findIndex((proj) => proj.id === state.activeProjectId),
  )
  return {
    v: 3,
    ai: activeIndex,
    p: projects.map((proj) => {
      const costRows = trimRowsForShare(proj.costRows)
      const driverRows = trimRowsForShare(proj.driverRows)
      const assumptionTexts = assumptionsToShareTexts(proj.assumptions)
      const profileShare = projectProfileToShare(proj.profile)
      const di = encodeDriverImpactTriples(costRows, driverRows, proj.driverImpacts)
      const cr = encodeCorrelationTriples(costRows, proj.costCorrelations)
      return {
        n: proj.name,
        ic: proj.incurredCosts,
        ...(assumptionTexts ? { a: assumptionTexts } : {}),
        ...(profileShare ? { pp: profileShare } : {}),
        c: costRows.map(costRowToTuple),
        d: driverRows.map(driverRowToTuple),
        ...(di ? { di } : {}),
        ...(cr ? { cr } : {}),
      }
    }),
  }
}

/** @deprecated Use buildShareCompactPayload (v3). Kept for clarity in callers. */
function compactFromProjects(state: ShareInputState): ShareCompactV3 {
  return buildShareCompactPayload(state)
}

export function compactPayloadToProjects(payload: ShareCompactPayload): Project[] | null {
  if (
    (payload.v !== 2 && payload.v !== 3) ||
    !Number.isInteger(payload.ai) ||
    !Array.isArray(payload.p)
  ) {
    return null
  }
  const includeRelationships = payload.v === 3
  const projects: Project[] = []
  for (const raw of payload.p.slice(0, appFeatures.maxProjects)) {
    if (typeof raw !== "object" || raw === null) return null
    const o = raw as Record<string, unknown>
    if (typeof o.n !== "string") return null
    if (!Array.isArray(o.c) || !Array.isArray(o.d)) return null
    const costRows: CostElementRow[] = []
    for (const t of o.c) {
      const row = tupleToCostRow(t)
      if (!row) return null
      costRows.push(row)
    }
    const driverRows: DriverRow[] = []
    for (const t of o.d) {
      const row = tupleToDriverRow(t)
      if (!row) return null
      driverRows.push(row)
    }
    if (costRows.length === 0 || driverRows.length === 0) return null
    const assumptions = assumptionsFromShareTexts(o.a)
    const profile = projectProfileFromShare(o.pp)
    const driverImpacts = includeRelationships
      ? decodeDriverImpactTriples(o.di, costRows, driverRows)
      : undefined
    const costCorrelations = includeRelationships
      ? decodeCorrelationTriples(o.cr, costRows)
      : undefined
    projects.push({
      id: newId(),
      name: o.n,
      incurredCosts: normalizeIncurredCosts(o.ic),
      costRows,
      driverRows,
      ...(assumptions ? { assumptions } : {}),
      ...(profile ? { profile } : {}),
      ...(driverImpacts ? { driverImpacts } : {}),
      ...(costCorrelations ? { costCorrelations } : {}),
    })
  }
  if (projects.length === 0) return null
  return projects
}

export function decodeShareCompactPayload(parsed: unknown): ShareInputState | null {
  if (typeof parsed !== "object" || parsed === null) return null
  const payload = parsed as ShareCompactPayload
  const projects = compactPayloadToProjects(payload)
  if (!projects) return null
  const activeProject = projects[payload.ai] ?? projects[0]
  return { projects, activeProjectId: activeProject!.id }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(encoded: string): Uint8Array | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const pad = b64.length % 4
    if (pad) b64 += "====".slice(0, 4 - pad)
    const binary = atob(b64)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i)
    }
    return out
  } catch {
    return null
  }
}

async function gzipUtf8Json(json: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(json)
  if (typeof CompressionStream === "undefined") {
    return input
  }
  const compression = new CompressionStream("gzip")
  const writer = compression.writable.getWriter()
  await writer.write(input)
  await writer.close()
  const buf = await new Response(compression.readable).arrayBuffer()
  return new Uint8Array(buf)
}

async function decodePayloadToJson(bytes: Uint8Array): Promise<string | null> {
  const asText = new TextDecoder().decode(bytes)
  if (asText.startsWith("{")) {
    return asText
  }
  if (typeof DecompressionStream === "undefined") {
    return null
  }
  try {
    const decompression = new DecompressionStream("gzip")
    const writer = decompression.writable.getWriter()
    await writer.write(Uint8Array.from(bytes))
    await writer.close()
    const buf = await new Response(decompression.readable).arrayBuffer()
    return new TextDecoder().decode(buf)
  } catch {
    return null
  }
}

function utf8ToBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  return bytesToBase64Url(bytes)
}

function base64UrlToUtf8(encoded: string): string | null {
  const bytes = base64UrlToBytes(encoded)
  if (bytes === null) return null
  return new TextDecoder().decode(bytes)
}

/** Legacy v1: full projects JSON, base64url (no compression). */
export function decodeShareV1FromHash(hash: string): ShareInputState | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null
  const encoded = hash.slice(SHARE_HASH_PREFIX.length)
  if (!encoded) return null
  const json = base64UrlToUtf8(encoded)
  if (json === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const o = parsed as Record<string, unknown>
  if (o.v !== 1) return null
  const projects = parseProjectsPayload(o.projects)
  if (!projects || projects.length === 0) return null
  const rawActive = o.activeProjectId
  if (typeof rawActive !== "string" || !projects.some((p) => p.id === rawActive)) {
    return { projects, activeProjectId: projects[0]!.id }
  }
  return { projects, activeProjectId: rawActive }
}

export async function decodeShareV2FromHash(hash: string): Promise<ShareInputState | null> {
  if (!hash.startsWith(SHARE_V2_PREFIX)) return null
  const encoded = hash.slice(SHARE_V2_PREFIX.length)
  if (!encoded) return null
  const bytes = base64UrlToBytes(encoded)
  if (bytes === null) return null
  const json = await decodePayloadToJson(bytes)
  if (json === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  return decodeShareCompactPayload(parsed)
}

/** Decode compact v2/v3 payloads from `?s=` (LZ-String). */
export async function decodeShareV2FromSearch(search: string): Promise<ShareInputState | null> {
  const params = new URLSearchParams(search)
  const encoded = params.get(SHARE_QUERY_PARAM)
  if (!encoded) return null
  const json = LZString.decompressFromEncodedURIComponent(encoded)
  if (json === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  return decodeShareCompactPayload(parsed)
}

/** Encode compact payload for legacy `#z=` (gzip). Always emits current v3 JSON. */
export async function encodeSharePayload(state: ShareInputState): Promise<string> {
  const compact = compactFromProjects(state)
  const json = JSON.stringify(compact)
  try {
    const bytes = await gzipUtf8Json(json)
    return bytesToBase64Url(bytes)
  } catch {
    return utf8ToBase64Url(json)
  }
}

/**
 * Canonical share URL builder used by Copy Share Link and PDF export.
 * Emits v3 compact state in `?s=`. Fails closed when over SHARE_URL_MAX_LENGTH.
 */
export async function buildShareUrl(state: ShareInputState): Promise<BuildShareUrlResult> {
  const compact = compactFromProjects(state)
  const json = JSON.stringify(compact)
  const encoded = LZString.compressToEncodedURIComponent(json)
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable" }
  }
  const { origin, pathname, search, hash } = window.location
  const params = new URLSearchParams(search)
  params.delete(SHARE_QUERY_PARAM)
  const existing = params.toString()
  const nextSearch = existing
    ? `?${existing}&${SHARE_QUERY_PARAM}=${encoded}`
    : `?${SHARE_QUERY_PARAM}=${encoded}`
  const url = `${origin}${pathname}${nextSearch}${hash}`
  if (url.length > SHARE_URL_MAX_LENGTH) {
    return { ok: false, reason: "oversized" }
  }
  return { ok: true, url }
}

/** Sync decode for legacy `#share=` links only (used in initial React state). */
export function readShareStateFromHash(hash: string): ShareInputState | null {
  return decodeShareV1FromHash(hash)
}

export function isShareV2Hash(hash: string): boolean {
  return hash.startsWith(SHARE_V2_PREFIX)
}

export function isShareV2Search(search: string): boolean {
  const params = new URLSearchParams(search)
  const encoded = params.get(SHARE_QUERY_PARAM)
  return typeof encoded === "string" && encoded.trim() !== ""
}

let shareV2PlaceholderCache: ShareInputState | null = null

/** One stable placeholder until async v2/v3 share decode completes. */
export function getShareV2PlaceholderOnce(): ShareInputState {
  if (!shareV2PlaceholderCache) {
    const projects = initialProjects()
    shareV2PlaceholderCache = { projects, activeProjectId: projects[0]!.id }
  }
  return shareV2PlaceholderCache
}
