import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clearFocusSessionResume,
  focusSessionResumeMatchesContext,
  focusSessionResumeStorageKey,
  parseFocusSessionResume,
  readFocusSessionResume,
  resolveFocusResultStepIndexForResume,
  resolveGuidedStepIndexForResume,
  writeFocusSessionResume,
  type FocusSessionResumeV1,
} from "@/persistence/focusSessionResume"
import { buildFocusResultSteps } from "@/domain/guided/focusResultSteps"
import { buildGuidedWorkflowSteps } from "@/domain/guided/guidedWorkflow"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
    removeItem(key: string) {
      map.delete(key)
    },
    key() {
      return null
    },
  }
}

function cost(id: string): CostElementRow {
  return {
    id,
    name: id,
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
  }
}

function driver(id: string): DriverRow {
  return {
    id,
    name: id,
    optimistic: "-10",
    likely: "0",
    pessimistic: "20",
  }
}

const validBlob: FocusSessionResumeV1 = {
  v: 1,
  analysisId: "a1",
  projectId: "p1",
  checkpointId: null,
  focusView: "input",
  guidedPhase: "assumptions",
  furthestReachedPhase: "costs",
}

describe("focusSessionResume helpers", () => {
  it("serializes and reads a valid blob", () => {
    const storage = memoryStorage()
    writeFocusSessionResume(validBlob, storage)
    expect(readFocusSessionResume("a1", storage)).toEqual(validBlob)
    expect(focusSessionResumeStorageKey("a1")).toBe("cost-simulator:focus-session:v1:a1")
  })

  it("rejects malformed / wrong version / invalid enums", () => {
    expect(parseFocusSessionResume(null)).toBeNull()
    expect(parseFocusSessionResume("x")).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, v: 2 })).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, analysisId: "" })).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, projectId: "" })).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, focusView: "nope" })).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, guidedPhase: "nope" })).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, resultSectionId: "nope" })).toBeNull()
    expect(parseFocusSessionResume({ ...validBlob, furthestReachedPhase: "nope" })).toBeNull()
    const storage = memoryStorage()
    storage.setItem(focusSessionResumeStorageKey("a1"), "{not-json")
    expect(readFocusSessionResume("a1", storage)).toBeNull()
  })

  it("context match: analysis / project / ongoing checkpoint", () => {
    expect(
      focusSessionResumeMatchesContext(validBlob, {
        analysisId: "a1",
        projectId: "p1",
        checkpointId: null,
        isOngoing: false,
      }),
    ).toBe(true)
    expect(
      focusSessionResumeMatchesContext(validBlob, {
        analysisId: "other",
        projectId: "p1",
        isOngoing: false,
      }),
    ).toBe(false)
    expect(
      focusSessionResumeMatchesContext(validBlob, {
        analysisId: "a1",
        projectId: "other",
        isOngoing: false,
      }),
    ).toBe(false)
    const ongoing: FocusSessionResumeV1 = {
      ...validBlob,
      checkpointId: "cp1",
    }
    expect(
      focusSessionResumeMatchesContext(ongoing, {
        analysisId: "a1",
        projectId: "p1",
        checkpointId: "cp1",
        isOngoing: true,
      }),
    ).toBe(true)
    expect(
      focusSessionResumeMatchesContext(ongoing, {
        analysisId: "a1",
        projectId: "p1",
        checkpointId: "cp2",
        isOngoing: true,
      }),
    ).toBe(false)
  })

  it("A/D: resolves assumptions and simulation by phase", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost("c1")],
      driverRows: [driver("d1")],
    })
    expect(steps[resolveGuidedStepIndexForResume(steps, "assumptions", undefined)]?.phase).toBe(
      "assumptions",
    )
    expect(steps[resolveGuidedStepIndexForResume(steps, "simulation", undefined)]?.phase).toBe(
      "simulation",
    )
    expect(steps[resolveGuidedStepIndexForResume(steps, "focusIntro", undefined)]?.phase).toBe(
      "focusIntro",
    )
  })

  it("B/C: restores cost/driver by row id", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost("c1"), cost("c2")],
      driverRows: [driver("d1"), driver("d2")],
    })
    const costIdx = resolveGuidedStepIndexForResume(steps, "cost", "c2")
    expect(steps[costIdx]).toMatchObject({ phase: "cost", rowId: "c2" })
    const driverIdx = resolveGuidedStepIndexForResume(steps, "driver", "d2")
    expect(steps[driverIdx]).toMatchObject({ phase: "driver", rowId: "d2" })
  })

  it("I/J: missing row falls back within Costs / Drivers", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost("c1")],
      driverRows: [driver("d1")],
    })
    const costFallback = resolveGuidedStepIndexForResume(steps, "cost", "missing")
    expect(steps[costFallback]).toMatchObject({ phase: "cost", rowId: "c1" })
    const driverFallback = resolveGuidedStepIndexForResume(steps, "driver", "missing")
    expect(steps[driverFallback]).toMatchObject({
      phase: "driver",
      rowId: "d1",
    })
    const emptyCosts = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [],
      driverRows: [],
    })
    expect(emptyCosts[resolveGuidedStepIndexForResume(emptyCosts, "cost", "x")]?.phase).toBe(
      "costsEmpty",
    )
  })

  it("E/F: result section resolve + missing section → first", () => {
    const steps = buildFocusResultSteps({
      includeDevelopment: false,
      includeContribution: true,
    })
    expect(steps[resolveFocusResultStepIndexForResume(steps, "tornado")]).toBe("tornado")
    expect(steps[resolveFocusResultStepIndexForResume(steps, "contribution")]).toBe("contribution")
    expect(steps[resolveFocusResultStepIndexForResume(steps, "nextSteps")]).toBe("nextSteps")
    expect(steps[resolveFocusResultStepIndexForResume(steps, "development")]).toBe("keyFigures")
  })

  it("H: clear removes stored resume", () => {
    const storage = memoryStorage()
    writeFocusSessionResume(validBlob, storage)
    clearFocusSessionResume("a1", storage)
    expect(readFocusSessionResume("a1", storage)).toBeNull()
  })
})

describe("Focus session resume wiring", () => {
  it("App restores after library ready; clears on explicit Focus exit", () => {
    const app = readAppSource()
    expect(app).toContain("didAttemptFocusSessionResumeRef")
    expect(app).toContain("readFocusSessionResume")
    expect(app).toContain("writeFocusSessionResume")
    expect(app).toContain("clearStoredFocusSessionResume")
    expect(app).toContain("librarySession.ready")
    expect(app).toContain("resumeSemanticStep={guidedSemanticResume}")
    expect(app).toContain("focusSessionResumeMatchesContext")
    // Results unavailable → Simulation
    expect(app).toContain('guidedPhase = "simulation"')
    expect(app).toContain("!hasViewableResults")
    // Explicit exits clear storage
    const exit = app.slice(
      app.indexOf("const exitFocusMode"),
      app.indexOf("const openFocusResults"),
    )
    expect(exit).toContain("clearStoredFocusSessionResume")
    expect(app).toContain("handleFocusShowChanges")
    expect(app).toContain("handleFocusReviewInput")
  })

  it("Guided publishes workflowRowId; semantic resume lands via helper", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain("workflowRowId")
    expect(guided).toContain("resumeSemanticStep")
    expect(guided).toContain("resolveGuidedStepIndexForResume")
    const chrome = readSrc("src/domain/guided/guidedFocusChrome.ts")
    expect(chrome).toContain("workflowRowId")
  })

  it("M/N/O: drafts / fullscreen / expanded chart are not persisted", () => {
    const resume = readSrc("src/persistence/focusSessionResume.ts")
    expect(resume).not.toContain("draft")
    expect(resume).not.toContain("browserFullscreen")
    expect(resume).not.toContain("expandedChart")
    expect(resume).toContain("sessionStorage")
    expect(resume).not.toContain("localStorage")
    const app = readAppSource()
    expect(app).not.toMatch(/writeFocusSessionResume[\s\S]{0,200}browserFullscreen/)
  })

  it("G: furthestReachedPhase is written and restored", () => {
    const app = readAppSource()
    expect(app).toContain("furthestReachedPhase: furthestReachedFocusPhase")
    expect(app).toContain("setFurthestReachedFocusPhase(stored.furthestReachedPhase)")
  })
})
