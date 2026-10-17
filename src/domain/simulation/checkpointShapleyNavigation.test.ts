import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  resolveShapleyProjectStatus,
  shouldAutoRequestShapleyCalculation,
  type ShapleyCacheEntry,
} from "@/domain/simulation/lazyShapleyAttribution"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { repoRoot } from "@/test-utils/repoRoot"

const result = {
  contributions: [{ id: "cost", name: "Cost", contribution: 10 }],
} as unknown as ShapleyAttributionResult

const readyEntry: ShapleyCacheEntry = {
  result,
  inputSignature: "sig-cp2",
  simulationRunId: "run-cp2",
}

describe("checkpoint navigation Contribution cache", () => {
  it("keeps a ready result visible when inputs become stale", () => {
    expect(
      resolveShapleyProjectStatus(
        "project-1",
        "sig-cp2",
        "run-cp2",
        { "project-1": readyEntry },
        null,
        {},
        true,
      ),
    ).toBe("ready")
  })

  it("does not reuse cache from another simulation run", () => {
    expect(
      resolveShapleyProjectStatus(
        "project-1",
        "sig-cp2",
        "run-cp1",
        { "project-1": readyEntry },
        null,
        {},
        false,
      ),
    ).toBe("idle")
  })

  it("does not auto-request while checkpoint inputs are stale", () => {
    expect(
      shouldAutoRequestShapleyCalculation({
        inputsStale: true,
        hasSimulationValues: true,
        simulationRunId: "run-cp2",
        inputSignature: "sig-cp2",
        cacheEntry: readyEntry,
        hasError: false,
      }),
    ).toBe(false)
  })

  it("stale transition stops work without clearing cache or errors", () => {
    const hook = readFileSync(
      join(repoRoot, "src/features/results/useLazyShapleyAttribution.ts"),
      "utf8",
    )
    const staleEffect = hook.slice(
      hook.indexOf("if (!inputsStale) return"),
      hook.indexOf("const pumpQueue"),
    )
    expect(staleEffect).toContain("setCalculatingProjectId(null)")
    expect(staleEffect).toContain("new ShapleyRequestQueue()")
    expect(staleEffect).toContain("workerRef.current?.terminate()")
    expect(staleEffect).not.toContain("setCache({})")
    expect(staleEffect).not.toContain("setErrors({})")
  })
})
