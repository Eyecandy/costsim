import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import LZString from "lz-string"

import { messages } from "@/i18n/messages"
import {
  buildShareCompactPayload,
  buildShareUrl,
  decodeShareCompactPayload,
  decodeShareV1FromHash,
  decodeShareV2FromSearch,
  SHARE_QUERY_PARAM,
  SHARE_URL_MAX_LENGTH,
  type ShareCompactV2,
} from "@/persistence/shareLink"
import {
  buildSimulationCostCorrelationMatrix,
  buildSimulationDriverImpactMatrix,
  type Project,
} from "@/domain/analysis/project"
import { repoRoot } from "@/test-utils/repoRoot"


function richShareProject(): Project {
  return {
    id: "proj-orig",
    name: "Alternativ B",
    incurredCosts: 1_500_000,
    assumptions: [
      { id: "a1", text: "Campus remains in use during construction" },
    ],
    costRows: [
      {
        id: "c1",
        name: "Felleskostnader",
        description: "Site establishment",
        optimistic: "-15",
        likely: "18000000",
        pessimistic: "20",
      },
      {
        id: "c2",
        name: "Bygning",
        description: "Structure and facade",
        optimistic: "-10",
        likely: "95000000",
        pessimistic: "15",
      },
      {
        id: "c3",
        name: "VVS",
        optimistic: "-12",
        likely: "24000000",
        pessimistic: "18",
      },
    ],
    driverRows: [
      {
        id: "d1",
        name: "Marked",
        description: "Market pressure",
        optimistic: "-5",
        likely: "0",
        pessimistic: "12",
      },
      {
        id: "d2",
        name: "Teknikk",
        description: "Technical complexity",
        optimistic: "-8",
        likely: "0",
        pessimistic: "15",
      },
    ],
    driverImpacts: {
      d1: { c2: "40", c3: "70" },
      d2: { c1: "20" },
    },
    costCorrelations: {
      c1: { c2: "0.5", c3: "0.3" },
      c2: { c3: "0.6" },
    },
  }
}

function assertNumericallyEquivalent(original: Project, restored: Project) {
  expect(restored.name).toBe(original.name)
  expect(restored.incurredCosts).toBe(original.incurredCosts)

  const origCosts = original.costRows.filter((r) => r.name.trim())
  const restCosts = restored.costRows.filter((r) => r.name.trim())
  expect(restCosts).toHaveLength(origCosts.length)
  for (let i = 0; i < origCosts.length; i++) {
    expect(restCosts[i]!.name).toBe(origCosts[i]!.name)
    expect(restCosts[i]!.optimistic).toBe(origCosts[i]!.optimistic)
    expect(restCosts[i]!.likely).toBe(origCosts[i]!.likely)
    expect(restCosts[i]!.pessimistic).toBe(origCosts[i]!.pessimistic)
    expect(restCosts[i]!.description).toBe(origCosts[i]!.description)
  }

  const origDrivers = original.driverRows.filter((r) => r.name.trim())
  const restDrivers = restored.driverRows.filter((r) => r.name.trim())
  expect(restDrivers).toHaveLength(origDrivers.length)
  for (let i = 0; i < origDrivers.length; i++) {
    expect(restDrivers[i]!.name).toBe(origDrivers[i]!.name)
    expect(restDrivers[i]!.optimistic).toBe(origDrivers[i]!.optimistic)
    expect(restDrivers[i]!.likely).toBe(origDrivers[i]!.likely)
    expect(restDrivers[i]!.pessimistic).toBe(origDrivers[i]!.pessimistic)
    expect(restDrivers[i]!.description).toBe(origDrivers[i]!.description)
  }

  expect(restored.assumptions?.map((a) => a.text)).toEqual(
    original.assumptions?.map((a) => a.text),
  )

  const impactOrig = buildSimulationDriverImpactMatrix(
    origCosts,
    origDrivers,
    original.driverImpacts,
  )
  const impactRest = buildSimulationDriverImpactMatrix(
    restCosts,
    restDrivers,
    restored.driverImpacts,
  )
  expect(impactRest).toEqual(impactOrig)

  const corrOrig = buildSimulationCostCorrelationMatrix(
    origCosts,
    original.costCorrelations,
  )
  const corrRest = buildSimulationCostCorrelationMatrix(
    restCosts,
    restored.costCorrelations,
  )
  expect(corrRest).toEqual(corrOrig)

  // IDs differ
  expect(restored.id).not.toBe(original.id)
  expect(restCosts[0]!.id).not.toBe(origCosts[0]!.id)
}

describe("share-state v3", () => {
  it("A: new generated compact payload uses v3", () => {
    const compact = buildShareCompactPayload({
      projects: [richShareProject()],
      activeProjectId: "proj-orig",
    })
    expect(compact.v).toBe(3)
    expect(compact.p[0]!.di?.length).toBeGreaterThan(0)
    expect(compact.p[0]!.cr?.length).toBeGreaterThan(0)
  })

  it("B: v2 links still decode (no di/cr → defaults)", async () => {
    const v2: ShareCompactV2 = {
      v: 2,
      ai: 0,
      p: [
        {
          n: "Legacy",
          ic: 0,
          c: [["A", "-10", "100", "15"]],
          d: [["D", "-5", "0", "10"]],
        },
      ],
    }
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(v2))
    const decoded = await decodeShareV2FromSearch(`?${SHARE_QUERY_PARAM}=${encoded}`)
    expect(decoded).not.toBeNull()
    expect(decoded!.projects[0]!.driverImpacts).toBeUndefined()
    expect(decoded!.projects[0]!.costCorrelations).toBeUndefined()
    const impact = buildSimulationDriverImpactMatrix(
      decoded!.projects[0]!.costRows,
      decoded!.projects[0]!.driverRows,
      decoded!.projects[0]!.driverImpacts,
    )
    expect(impact).toEqual([[100]])
    const corr = buildSimulationCostCorrelationMatrix(
      decoded!.projects[0]!.costRows,
      decoded!.projects[0]!.costCorrelations,
    )
    expect(corr).toEqual([[1]])
  })

  it("C: v1 legacy #share= still decodes", () => {
    const project = richShareProject()
    const payload = {
      v: 1,
      activeProjectId: project.id,
      projects: [project],
    }
    const json = JSON.stringify(payload)
    const bytes = new TextEncoder().encode(json)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
    const b64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    const decoded = decodeShareV1FromHash(`#share=${b64}`)
    expect(decoded).not.toBeNull()
    expect(decoded!.projects[0]!.name).toBe("Alternativ B")
    expect(decoded!.projects[0]!.driverImpacts?.d1?.c2).toBe("40")
  })

  it("D–M/I: round-trip preserves numerical model; IDs remapped", () => {
    const original = richShareProject()
    const compact = buildShareCompactPayload({
      projects: [original],
      activeProjectId: original.id,
    })
    expect(JSON.stringify(compact)).not.toContain("proj-orig")
    expect(JSON.stringify(compact)).not.toMatch(/"p50"|"values"|"shapley"/i)

    const decoded = decodeShareCompactPayload(compact)
    expect(decoded).not.toBeNull()
    assertNumericallyEquivalent(original, decoded!.projects[0]!)

    // E/G via sparse omission in a second project
    const sparse: Project = {
      id: "p-sparse",
      name: "Minimal",
      incurredCosts: 0,
      costRows: [
        { id: "c1", name: "A", optimistic: "-10", likely: "100", pessimistic: "15" },
      ],
      driverRows: [
        { id: "d1", name: "D", optimistic: "-5", likely: "0", pessimistic: "10" },
      ],
    }
    const sparseDecoded = decodeShareCompactPayload(
      buildShareCompactPayload({
        projects: [sparse],
        activeProjectId: "p-sparse",
      }),
    )!
    expect(sparseDecoded.projects[0]!.driverImpacts).toBeUndefined()
    expect(sparseDecoded.projects[0]!.costCorrelations).toBeUndefined()
  })

  it("H: correlation symmetry preserved in simulation matrix", () => {
    const original = richShareProject()
    const restored = decodeShareCompactPayload(
      buildShareCompactPayload({
        projects: [original],
        activeProjectId: original.id,
      }),
    )!.projects[0]!
    const matrix = buildSimulationCostCorrelationMatrix(
      restored.costRows,
      restored.costCorrelations,
    )
    expect(matrix[0]![1]).toBe(matrix[1]![0])
    expect(matrix[0]![2]).toBe(matrix[2]![0])
    expect(matrix[1]![2]).toBe(matrix[2]![1])
    expect(matrix[0]![1]).toBe(0.5)
    expect(matrix[1]![2]).toBe(0.6)
  })

  it("N: calculated results are not included in compact payload", () => {
    const compact = buildShareCompactPayload({
      projects: [richShareProject()],
      activeProjectId: "proj-orig",
    })
    const keys = JSON.stringify(compact)
    expect(keys).not.toContain("projectResults")
    expect(keys).not.toContain("simulationRunId")
    expect(keys).not.toContain("estimatedP50")
    expect(keys).not.toContain("tornado")
  })

  it("O: share open does not restore local simulation snapshot", () => {
    // Guard lives in lastSimulationSnapshot; assert the share-skip remains wired.
    const src = readFileSync(
      join(repoRoot, "src/persistence/lastSimulationSnapshot.ts"),
      "utf8",
    )
    expect(src).toContain("isShareV2Search")
    expect(src).toContain("isShareV2Hash")
    expect(src).toContain("decodeShareV1FromHash")
    expect(src).toContain("return false")
  })

  it("P: Share and PDF use the same v3 URL builder", () => {
    const src = readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )
    expect(src).toContain('from "@/persistence/shareLink"')
    expect(src).toContain("buildShareUrl({ projects, activeProjectId })")
    const copyIdx = src.indexOf("handleCopyShareLink")
    const pdfIdx = src.indexOf("handleDownloadPdf")
    expect(copyIdx).toBeGreaterThan(-1)
    expect(pdfIdx).toBeGreaterThan(-1)
    expect(src).toContain("built.ok")
    expect(src).toContain("shareLinkTooLarge")
  })

  it("Q: malformed relationship indices do not crash or mis-map", () => {
    const compact = buildShareCompactPayload({
      projects: [richShareProject()],
      activeProjectId: "proj-orig",
    })
    const broken = {
      ...compact,
      p: [
        {
          ...compact.p[0]!,
          di: [
            [99, 0, 30],
            [0, 99, 30],
            ["x", 0, 30],
            [0, 0, 999],
            [0, 1, 30],
          ],
          cr: [
            [0, 0, 0.5],
            [0, 99, 0.5],
            [1, 2, 0.4],
            "bad",
          ],
        },
      ],
    }
    const decoded = decodeShareCompactPayload(broken)
    expect(decoded).not.toBeNull()
    const p = decoded!.projects[0]!
    const impacts = buildSimulationDriverImpactMatrix(
      p.costRows,
      p.driverRows,
      p.driverImpacts,
    )
    // Only valid [0,1,30] applied among di entries
    expect(impacts[1]![0]).toBe(30)
    expect(impacts[0]![0]).toBe(100)
    const corr = buildSimulationCostCorrelationMatrix(
      p.costRows,
      p.costCorrelations,
    )
    expect(corr[1]![2]).toBe(0.4)
    expect(corr[0]![0]).toBe(1)
  })

  it("R/S: URL guard blocks oversized links; normal links ok", async () => {
    expect(SHARE_URL_MAX_LENGTH).toBe(8_000)
    expect(messages.no.results.shareLinkTooLarge).toContain("for mye data")
    expect(messages.en.results.shareLinkTooLarge).toContain("too much data")

    const originalWindow = globalThis.window
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: {
        location: {
          origin: "https://example.com",
          pathname: "/app",
          search: "",
          hash: "",
        },
      },
    })

    try {
      const normal = await buildShareUrl({
        projects: [richShareProject()],
        activeProjectId: "proj-orig",
      })
      expect(normal.ok).toBe(true)
      if (normal.ok) {
        expect(normal.url.length).toBeLessThanOrEqual(SHARE_URL_MAX_LENGTH)
        expect(normal.url).toContain(`${SHARE_QUERY_PARAM}=`)
        const search = `?${normal.url.split("?")[1]}`
        const round = await decodeShareV2FromSearch(search)
        expect(round).not.toBeNull()
        assertNumericallyEquivalent(richShareProject(), round!.projects[0]!)
      }

      const huge: Project = {
        id: "huge",
        name: "Huge",
        incurredCosts: 0,
        assumptions: Array.from({ length: 40 }, (_, i) => ({
          id: `a${i}`,
          text: `Assumption ${i} ${Array.from({ length: 50 }, (_, j) => `w${i}_${j}_${(i * 97 + j * 13) % 997}`).join(" ")}`.slice(
            0,
            280,
          ),
        })),
        costRows: Array.from({ length: 20 }, (_, i) => ({
          id: `c${i}`,
          name: `Cost ${i}`,
          description: Array.from(
            { length: 40 },
            (_, j) => `cd${i}_${j}_${((i + 3) * (j + 7)) % 4099}`,
          )
            .join(" ")
            .slice(0, 500),
          optimistic: "-10",
          likely: String(1_000_000 + i),
          pessimistic: "20",
        })),
        driverRows: Array.from({ length: 12 }, (_, i) => ({
          id: `d${i}`,
          name: `Driver ${i}`,
          description: Array.from(
            { length: 40 },
            (_, j) => `dd${i}_${j}_${((i + 5) * (j + 11)) % 5003}`,
          )
            .join(" ")
            .slice(0, 500),
          optimistic: "-5",
          likely: "0",
          pessimistic: "10",
        })),
      }
      const oversized = await buildShareUrl({
        projects: [huge, { ...huge, id: "huge2", name: "Huge 2" }],
        activeProjectId: "huge",
      })
      expect(oversized.ok).toBe(false)
      if (!oversized.ok) expect(oversized.reason).toBe("oversized")
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        writable: true,
        value: originalWindow,
      })
    }
  })

  it("representative v3 example shape", () => {
    const compact = buildShareCompactPayload({
      projects: [richShareProject()],
      activeProjectId: "proj-orig",
    })
    expect(compact).toMatchObject({
      v: 3,
      ai: 0,
      p: [
        {
          n: "Alternativ B",
          ic: 1_500_000,
          a: ["Campus remains in use during construction"],
        },
      ],
    })
    expect(compact.p[0]!.c[0]).toEqual([
      "Felleskostnader",
      "-15",
      "18000000",
      "20",
      "Site establishment",
    ])
    expect(compact.p[0]!.d[0]).toEqual([
      "Marked",
      "-5",
      "0",
      "12",
      "Market pressure",
    ])
    // d1→c2 = 40% → driverIndex 0, costIndex 1
    expect(compact.p[0]!.di).toContainEqual([0, 1, 40])
    // c1–c2 ρ=0.5 → [0,1,0.5]
    expect(compact.p[0]!.cr).toContainEqual([0, 1, 0.5])
  })
})
