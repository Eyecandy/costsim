import { describe, expect, it } from "vitest"

import {
  choleskyLower,
  identityCorrelationMatrix,
  isIdentityCorrelationMatrix,
  isValidCorrelationMatrix,
  normalsToUniforms,
  prepareCostCorrelationCholesky,
  repairCorrelationMatrixToPsd,
  sampleCorrelatedUniforms,
  standardNormalCdf,
} from "@/domain/simulation/costCorrelation"
import {
  buildSimulationCostCorrelationMatrix,
  isCostCorrelationPatchValid,
} from "@/domain/analysis/project"

describe("costCorrelation linear algebra", () => {
  it("identity matrix Cholesky is identity", () => {
    const I = identityCorrelationMatrix(3)
    const L = choleskyLower(I)
    expect(L).not.toBeNull()
    expect(isIdentityCorrelationMatrix(L!)).toBe(true)
  })

  it("known 2×2 Cholesky matches formula", () => {
    const rho = 0.5
    const R = [
      [1, rho],
      [rho, 1],
    ]
    const L = choleskyLower(R)
    expect(L).not.toBeNull()
    expect(L![0]![0]).toBeCloseTo(1)
    expect(L![1]![0]).toBeCloseTo(rho)
    expect(L![1]![1]).toBeCloseTo(Math.sqrt(1 - rho * rho))
  })

  it("non-PSD matrix is repaired and Cholesky succeeds", () => {
    const nonPsd = [
      [1, 1],
      [1, 1],
    ]
    expect(choleskyLower(nonPsd)).toBeNull()
    const repaired = repairCorrelationMatrixToPsd(nonPsd)
    expect(choleskyLower(repaired)).not.toBeNull()
    const prep = prepareCostCorrelationCholesky(nonPsd)
    expect(prep.status.kind).toBe("repaired")
    expect(choleskyLower(prep.choleskyL)).not.toBeNull()
  })

  it("missing / all-zero off-diagonal yields identity status", () => {
    const prep = prepareCostCorrelationCholesky(undefined, 2)
    expect(prep.status).toEqual({ kind: "identity", reason: "missing" })

    const zero = identityCorrelationMatrix(2)
    const prepZero = prepareCostCorrelationCholesky(zero)
    expect(prepZero.status).toEqual({
      kind: "identity",
      reason: "all_zero_off_diagonal",
    })
  })

  it("buildSimulationCostCorrelationMatrix defaults omitted pairs to 0", () => {
    const matrix = buildSimulationCostCorrelationMatrix([{ id: "a" }, { id: "b" }], {
      a: { b: "0.6" },
    })
    expect(matrix).toEqual([
      [1, 0.6],
      [0.6, 1],
    ])
  })

  it("isValidCorrelationMatrix rejects non-PSD matrix", () => {
    expect(
      isValidCorrelationMatrix([
        [1, 1],
        [1, 1],
      ]),
    ).toBe(false)
  })

  it("isCostCorrelationPatchValid rejects incompatible 3-way correlations", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }]
    const base = {
      a: { b: "0.9", c: "0.9" },
      b: { c: "0.9" },
    }
    expect(isCostCorrelationPatchValid(rows, base, "a", "c", "-0.9")).toBe(false)
    expect(isCostCorrelationPatchValid(rows, undefined, "a", "b", "0.5")).toBe(true)
  })
})

describe("Gaussian copula uniforms", () => {
  it("standardNormalCdf maps 0 to 0.5", () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5)
  })

  it("normalsToUniforms stays in (0, 1) for finite z", () => {
    const u = normalsToUniforms([-3, 0, 3])
    expect(u[0]).toBeGreaterThan(0)
    expect(u[0]).toBeLessThan(0.01)
    expect(u[1]).toBeCloseTo(0.5)
    expect(u[2]).toBeGreaterThan(0.99)
    expect(u[2]).toBeLessThan(1)
  })

  it("identity Cholesky yields uncorrelated uniforms (low Pearson correlation)", () => {
    const prep = prepareCostCorrelationCholesky(identityCorrelationMatrix(2))
    const n = 4000
    const u0: number[] = []
    const u1: number[] = []
    for (let i = 0; i < n; i++) {
      const u = sampleCorrelatedUniforms(prep.choleskyL)
      u0.push(u[0]!)
      u1.push(u[1]!)
    }
    expect(Math.abs(pearson(u0, u1))).toBeLessThan(0.08)
  })
})

function pearson(x: readonly number[], y: readonly number[]): number {
  const n = x.length
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += x[i]!
    sy += y[i]!
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = x[i]! - mx
    const b = y[i]! - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  return num / Math.sqrt(dx * dy)
}
