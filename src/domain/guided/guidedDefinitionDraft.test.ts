import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  applyGuidedDefinitionDraftChange,
  cancelGuidedDefinitionDraft,
  clampGuidedDefinitionDraft,
  commitGuidedDefinitionDraft,
  guidedDefinitionDraftNeedsCommit,
  syncGuidedDefinitionDraft,
  type GuidedDefinitionDraftState,
} from "@/domain/guided/guidedDefinitionDraft"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import type { Project } from "@/domain/analysis/project"
import {
  COST_DESCRIPTION_MAX_LENGTH,
  DRIVER_DESCRIPTION_MAX_LENGTH,
} from "@/domain/results/rowDefinitions"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function dialogSource() {
  return readFileSync(
    join(root, "src/features/guided-input/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function appSource() {
  return readAppSource()
}

function guidedDefinitionTextareaSource(): string {
  const src = dialogSource()
  const start = src.indexOf("function GuidedDefinitionTextarea(")
  const end = src.indexOf("\nfunction GuidedInlineValue(", start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return src.slice(start, end)
}

function baseState(
  overrides: Partial<GuidedDefinitionDraftState> = {},
): GuidedDefinitionDraftState {
  return {
    rowId: "cost-1",
    draft: "Canonical",
    baseline: "Canonical",
    dirty: false,
    ...overrides,
  }
}

function sampleProject(description: string): Project {
  return {
    id: "p1",
    name: "P",
    incurredCosts: 0,
    costRows: [
      {
        id: "c1",
        name: "Cost",
        optimistic: "90",
        likely: "100",
        pessimistic: "110",
        description,
      },
    ],
    driverRows: [
      {
        id: "d1",
        name: "Driver",
        optimistic: "-5",
        likely: "0",
        pessimistic: "5",
        description,
      },
    ],
  }
}

describe("Focus definition draft lifecycle", () => {
  it("1/2: typing updates draft only — no commit until blur path", () => {
    let state = baseState()
    state = applyGuidedDefinitionDraftChange(state, "Ca", 200)
    state = applyGuidedDefinitionDraftChange(state, "Cat", 200)
    state = applyGuidedDefinitionDraftChange(state, "Cats", 200)
    expect(state.draft).toBe("Cats")
    expect(state.dirty).toBe(true)
    expect(state.baseline).toBe("Canonical")
    const mid = commitGuidedDefinitionDraft(state, 200)
    // Simulates: after multi-char typing, a single commit fires once.
    expect(mid.commit).toEqual({ rowId: "cost-1", description: "Cats" })
  })

  it("3: blur commits exactly once when draft differs", () => {
    const dirty = applyGuidedDefinitionDraftChange(
      baseState(),
      "Updated definition",
      COST_DESCRIPTION_MAX_LENGTH,
    )
    const first = commitGuidedDefinitionDraft(
      dirty,
      COST_DESCRIPTION_MAX_LENGTH,
    )
    expect(first.commit).toEqual({
      rowId: "cost-1",
      description: "Updated definition",
    })
    const second = commitGuidedDefinitionDraft(
      first.state,
      COST_DESCRIPTION_MAX_LENGTH,
    )
    expect(second.commit).toBeNull()
  })

  it("4: unchanged blur does not write", () => {
    const result = commitGuidedDefinitionDraft(
      baseState({ draft: "Canonical", dirty: true }),
      200,
    )
    expect(result.commit).toBeNull()
    expect(guidedDefinitionDraftNeedsCommit("Canonical", "Canonical")).toBe(
      false,
    )
  })

  it("5: Enter newline is not a commit path (no Enter→commit without modifier)", () => {
    const body = guidedDefinitionTextareaSource()
    // Bare Enter must not commit; only Cmd/Ctrl+Enter.
    expect(body).toMatch(
      /event\.key === "Enter" && \(event\.metaKey \|\| event\.ctrlKey\)/,
    )
    expect(body).not.toMatch(
      /if \(event\.key === "Enter"\) \{\s*event\.preventDefault/,
    )
    expect(body).toContain("rows={2}")
  })

  it("6: dialog Enter-to-next still skips textarea (does not advance workflow)", () => {
    const src = dialogSource()
    const enterHandler = src.slice(
      src.indexOf("const onDialogKeyDown"),
      src.indexOf("const renderCostPhase"),
    )
    expect(enterHandler).toContain('event.key !== "Enter"')
    expect(enterHandler).toContain("HTMLTextAreaElement")
  })

  it("7: Escape restores canonical description", () => {
    const dirty = applyGuidedDefinitionDraftChange(
      baseState({ baseline: "Saved text" }),
      "Uncommitted edits",
      200,
    )
    const cancelled = cancelGuidedDefinitionDraft(dirty)
    expect(cancelled.draft).toBe("Saved text")
    expect(cancelled.dirty).toBe(false)
    expect(cancelled.baseline).toBe("Saved text")
  })

  it("8: Escape in definition editor does not exit Focus / close Guided", () => {
    const src = dialogSource()
    const escapeBlock = src.slice(
      src.indexOf('if (event.key !== "Escape") return'),
      src.indexOf("window.addEventListener(\"keydown\", onKeyDown)"),
    )
    expect(escapeBlock).toContain("guidedDescription")
    expect(escapeBlock).toContain("guidedInlineEdit")
    const body = guidedDefinitionTextareaSource()
    expect(body).toMatch(/event\.key === "Escape"[\s\S]*?stopPropagation/)
    expect(body).toContain("cancelGuidedDefinitionDraft")
  })

  it("9: row change gets the correct description draft (and commits prior dirty)", () => {
    const dirty = applyGuidedDefinitionDraftChange(
      baseState({
        rowId: "cost-1",
        baseline: "Row A",
        draft: "Row A",
      }),
      "Row A edited",
      200,
    )
    const synced = syncGuidedDefinitionDraft(dirty, {
      rowId: "cost-2",
      sourceDescription: "Row B canonical",
      maxLength: 200,
    })
    expect(synced.pendingCommit).toEqual({
      rowId: "cost-1",
      description: "Row A edited",
    })
    expect(synced.state).toEqual({
      rowId: "cost-2",
      draft: "Row B canonical",
      baseline: "Row B canonical",
      dirty: false,
    })
  })

  it("9b: dirty draft is not overwritten by parent rerender of same row", () => {
    const dirty = applyGuidedDefinitionDraftChange(
      baseState({ baseline: "A", draft: "A" }),
      "Typing…",
      200,
    )
    const synced = syncGuidedDefinitionDraft(dirty, {
      rowId: "cost-1",
      sourceDescription: "A",
      maxLength: 200,
    })
    expect(synced.pendingCommit).toBeNull()
    expect(synced.state.draft).toBe("Typing…")
    expect(synced.state.dirty).toBe(true)
  })

  it("10: cost and driver share GuidedDefinitionTextarea lifecycle", () => {
    const src = dialogSource()
    const costPhase = src.slice(
      src.indexOf("const renderCostPhase"),
      src.indexOf("const renderDriverPhase"),
    )
    const driverDef = src.slice(
      src.indexOf('data-guided-phase="driver"'),
      src.indexOf("data-guided-driver-uncertainty-notes"),
    )
    expect(costPhase).toContain("<GuidedDefinitionTextarea")
    expect(costPhase).toContain("COST_DESCRIPTION_MAX_LENGTH")
    expect(driverDef).toContain("<GuidedDefinitionTextarea")
    expect(driverDef).toContain("DRIVER_DESCRIPTION_MAX_LENGTH")
    // Single shared component — not two ad-hoc onChange→onPatchRow textareas.
    expect((src.match(/<GuidedDefinitionTextarea/g) ?? []).length).toBe(2)
    expect(src).not.toMatch(
      /onChange=\{\(event\) => \{\s*onPatchRow\(row\.id,\s*\{\s*description:/,
    )
    expect(COST_DESCRIPTION_MAX_LENGTH).toBeGreaterThan(0)
    expect(DRIVER_DESCRIPTION_MAX_LENGTH).toBeGreaterThan(0)
  })

  it("11: definition-only change does not affect simulation/stale signature", () => {
    const a = buildSimulationInputSignature([sampleProject("Alpha")])
    const b = buildSimulationInputSignature([sampleProject("Beta entirely different")])
    expect(a).toBe(b)
  })

  it("12: read-only remains non-editable (Guided not mounted when archived)", () => {
    const app = appSource()
    expect(app).toContain(
      "activeProject && guidedInputKind && !analysisReadOnly",
    )
    expect(app).toContain("onPatchRow={(rowId, patch) => {")
    expect(app).toContain("if (analysisReadOnly) return")
  })

  it("wiring: onChange does not call onPatchRow; blur commits via helpers", () => {
    const body = guidedDefinitionTextareaSource()
    expect(body).toContain("applyGuidedDefinitionDraftChange")
    expect(body).toContain("commitGuidedDefinitionDraft")
    expect(body).toContain("onBlur={() => {")
    expect(body).toContain("commitCurrent()")
    expect(body).not.toContain("onPatchRow")
    expect(body).toContain('data-guided-description=""')
    // Stable key: no description/draft-based React key on the textarea.
    expect(body).not.toMatch(/key=\{[^}]*draft/)
    expect(body).not.toMatch(/key=\{[^}]*description/)
  })

  it("clamps to max length", () => {
    const long = "x".repeat(50)
    expect(clampGuidedDefinitionDraft(long, 10)).toBe("x".repeat(10))
    const changed = applyGuidedDefinitionDraftChange(baseState(), long, 8)
    expect(changed.draft).toHaveLength(8)
  })
})
