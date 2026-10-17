import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  buildSimulationInputSignature,
  staleComparableProjects,
} from "@/domain/simulation/simulationInputSignature"
import {
  changedCostTableCellKeySet,
  changedScenarioCellKeySet,
} from "@/domain/analysis/simInputSnapshotDiff"
import { createProject, type Project } from "@/domain/analysis/project"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function appSource() {
  return readAppSource()
}

function costRow(partial: Partial<CostElementRow> & { id: string }): CostElementRow {
  return {
    name: "Bygning",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
    ...partial,
  }
}

function driverRow(partial: Partial<DriverRow> & { id: string }): DriverRow {
  return {
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
    ...partial,
  }
}

describe("stale input change visibility (presentation-only)", () => {
  it("A: stale detection still uses liveResultValidity + comparable input", () => {
    const src = appSource()
    expect(src).toContain(
      'liveResultValidity.kind === "stale" && hasMeaningfulStaleComparableInput',
    )
    expect(src).toContain("staleComparableProjects(projects)")
    const base = createProject({ id: "p1", name: "A" })
    const edited: Project = {
      ...base,
      costRows: base.costRows.map((r, i) =>
        i === 0 ? { ...r, likely: "110" } : r,
      ),
    }
    expect(staleComparableProjects([edited]).length).toBeGreaterThan(0)
  })

  it("B: default visual state gates green cells behind showStaleInputChanges", () => {
    const src = appSource()
    expect(src).toContain("showStaleInputChanges")
    expect(src).toContain("useState(false)")
    expect(src).toContain("visibleStaleChangedCellKeys")
    expect(src).toMatch(
      /if \(!showStaleInputChanges\) \{\s*return \{\s*cost: EMPTY_STALE_CELL_KEYS/,
    )
    expect(src).toContain("changedCellKeys={visibleStaleChangedCellKeys.cost}")
    expect(src).toContain(
      "changedCellKeys={visibleStaleChangedCellKeys.drivers}",
    )
    expect(messages.no.projects.staleInputsTitle).toBe("Input er endret")
    expect(messages.en.projects.staleInputsTitle).toBe("Input has changed")
    // Hidden-changes body: no green-field mention.
    expect(messages.no.projects.staleInputsNotice).toBe(
      "Resultatene er basert på tidligere input. Kjør simuleringen på nytt for å oppdatere resultatene.",
    )
    expect(messages.en.projects.staleInputsNotice).toBe(
      "The results are based on previous input. Run the simulation again to update the results.",
    )
    expect(messages.no.projects.staleInputsNotice).not.toMatch(/grønne/i)
    expect(messages.en.projects.staleInputsNotice).not.toMatch(/green fields/i)
  })

  it("B2: visible-changes body explains green highlighting; hide restores normal copy", () => {
    const src = appSource()
    expect(src).toContain(
      't("projects.staleInputsNoticeWithChanges")',
    )
    expect(src).toContain('t("projects.staleInputsNotice")')
    expect(src).toContain("NOTICE_WORD_GREEN_CLASS")
    expect(src).toMatch(
      /noticeWithColorWord\(\s*t\("projects\.staleInputsNoticeWithChanges"\),\s*language === "no" \? "Grønne" : "Green",\s*NOTICE_WORD_GREEN_CLASS/,
    )
    expect(messages.no.projects.staleInputsNoticeWithChanges).toBe(
      "Resultatene er basert på tidligere input. Grønne felt viser hva som er endret.",
    )
    expect(messages.en.projects.staleInputsNoticeWithChanges).toBe(
      "The results are based on previous input. Green fields show what has changed.",
    )
    expect(messages.no.projects.staleInputsNoticeWithChanges).toMatch(/Grønne felt/)
    expect(messages.en.projects.staleInputsNoticeWithChanges).toMatch(
      /Green fields/,
    )
  })

  it("C/D: Show/Hide toggles presentation only (same changed-cell sets)", () => {
    const src = appSource()
    expect(src).toContain('t("projects.showInputChanges")')
    expect(src).toContain('t("projects.hideInputChanges")')
    expect(src).toContain("setShowStaleInputChanges((prev) => !prev)")
    expect(src).toContain("return staleInputChangedCellKeys")
    expect(messages.no.projects.showInputChanges).toBe("Vis endringer")
    expect(messages.no.projects.hideInputChanges).toBe("Skjul endringer")
    expect(messages.en.projects.showInputChanges).toBe("Show changes")
    expect(messages.en.projects.hideInputChanges).toBe("Hide changes")
  })

  it("E/F: Undo remains available and uses the existing handler", () => {
    const src = appSource()
    expect(src).toContain("handleRevertInputsToLastSimulation")
    expect(src).toContain(
      "const restored = structuredClone(lastSimulatedProjects) as Project[]",
    )
    // Undo is not gated on showStaleInputChanges.
    expect(src).toMatch(
      /onClick=\{handleRevertInputsToLastSimulation\}[\s\S]*?t\("projects\.revertInputChanges"\)/,
    )
    expect(messages.no.projects.revertInputChanges).toBe("Angre endringene")
    expect(messages.en.projects.revertInputChanges).toBe("Undo changes")
  })

  it("G: showChanges resets when stale notice clears (rerun / undo path)", () => {
    const src = appSource()
    expect(src).toMatch(
      /if \(!showStaleInputNotice\) \{\s*setShowStaleInputChanges\(false\)/,
    )
  })

  it("H: multiple edits still use the same baseline cell-key comparison", () => {
    const baselineCost = [
      costRow({ id: "c1", likely: "100" }),
      costRow({ id: "c2", likely: "50" }),
    ]
    const currentCost = [
      costRow({ id: "c1", likely: "110" }),
      costRow({ id: "c2", likely: "55" }),
    ]
    const keys = changedCostTableCellKeySet(
      { costRows: currentCost, incurredCosts: 0 },
      { costRows: baselineCost, incurredCosts: 0 },
    )
    expect(keys.has("c1:likely")).toBe(true)
    expect(keys.has("c2:likely")).toBe(true)

    const baselineDrivers = [driverRow({ id: "d1", optimistic: "-5" })]
    const currentDrivers = [driverRow({ id: "d1", optimistic: "-8" })]
    const driverKeys = changedScenarioCellKeySet(
      currentDrivers,
      baselineDrivers,
    )
    expect(driverKeys.has("d1:optimistic")).toBe(true)

    // App still computes via staleInputChangedCellKeys then gates presentation.
    expect(appSource()).toContain("changedCostTableCellKeySet")
    expect(appSource()).toContain("staleInputChangedCellKeys")
  })

  it("I: simulation signature helpers are unchanged by this UI work", () => {
    const base = createProject({ id: "p1", name: "A" })
    const edited: Project = {
      ...base,
      costRows: base.costRows.map((r, i) =>
        i === 0 ? { ...r, likely: "999" } : r,
      ),
    }
    expect(buildSimulationInputSignature([base])).not.toBe(
      buildSimulationInputSignature([edited]),
    )
    const signatureSrc = readFileSync(
      join(repoRoot, "src/domain/simulation/simulationInputSignature.ts"),
      "utf8",
    )
    expect(signatureSrc).toContain("export function buildSimulationInputSignature")
    expect(signatureSrc).toContain("export function staleComparableProjects")
  })

  it("J: Single and Ongoing share the App presentation path; validity ownership untouched", () => {
    const src = appSource()
    expect(src).toContain("getLiveResultValidity")
    expect(src).toContain("liveResultValidity.kind")
    expect(src).toContain("showStaleInputNotice")
    expect(src).toContain("visibleStaleChangedCellKeys")
    // No persistence of the viewing preference.
    expect(src).not.toMatch(/showStaleInputChanges[\s\S]{0,80}localStorage/)
    // A type annotation in the extracted hook signature is fine; a value assignment is not.
    expect(src.replaceAll("showStaleInputChanges: boolean", "")).not.toContain(
      "showStaleInputChanges:",
    )
  })
})
