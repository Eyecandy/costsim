import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  GUIDED_DRIVER_MODE_SLIDER_RANGE,
  GUIDED_DRIVER_P10_SLIDER_RANGE,
  GUIDED_DRIVER_P90_SLIDER_RANGE,
  getGuidedDriverRangeIssue,
  isGuidedDriverValueOutsideWorkingRange,
  normalizeGuidedNumericField,
  pinGuidedSliderDisplayValue,
} from "@/lib/guidedInput"
import {
  clampCostOptimisticPercent,
  clampCostPessimisticPercent,
} from "@/domain/results/scenarioNumericClamps"
import {
  driverCalibratedSupportInvalid,
  parseDriverForSimulation,
  type DriverRow,
} from "@/domain/results/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"


function dialogSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function driverRow(
  partial: Partial<DriverRow> &
    Pick<DriverRow, "optimistic" | "likely" | "pessimistic">,
): DriverRow {
  return {
    id: "d1",
    name: "Driver",
    description: "",
        ...partial,
  }
}

describe("Guided Driver slider working ranges", () => {
  it("A: Guided P10 slider working range is -60…0", () => {
    expect(GUIDED_DRIVER_P10_SLIDER_RANGE).toEqual({
      min: -60,
      max: 0,
      step: 1,
    })
  })

  it("B: Guided mode slider working range is -30…30", () => {
    expect(GUIDED_DRIVER_MODE_SLIDER_RANGE).toEqual({
      min: -30,
      max: 30,
      step: 1,
    })
  })

  it("C: Guided P90 slider working range is 0…60", () => {
    expect(GUIDED_DRIVER_P90_SLIDER_RANGE).toEqual({
      min: 0,
      max: 60,
      step: 1,
    })
  })

  it("D: direct numeric edit retains wider table-compatible bounds", () => {
    expect(
      normalizeGuidedNumericField({
        kind: "driver",
        field: "optimistic",
        value: "-80",
        row: driverRow({ optimistic: "", likely: "0", pessimistic: "10" }),
      }),
    ).toBe("-80")
    expect(
      normalizeGuidedNumericField({
        kind: "driver",
        field: "pessimistic",
        value: "80",
        row: driverRow({ optimistic: "-10", likely: "0", pessimistic: "" }),
      }),
    ).toBe("80")
    expect(clampCostOptimisticPercent("-100")).toBe("-100")
    expect(clampCostPessimisticPercent("100")).toBe("100")
    expect(clampCostOptimisticPercent("-101")).toBe("-100")
    expect(clampCostPessimisticPercent("101")).toBe("100")
  })

  it("E: values outside slider range are pinned for display only", () => {
    expect(
      pinGuidedSliderDisplayValue(-80, GUIDED_DRIVER_P10_SLIDER_RANGE),
    ).toBe(-60)
    expect(
      pinGuidedSliderDisplayValue(80, GUIDED_DRIVER_P90_SLIDER_RANGE),
    ).toBe(60)
    expect(isGuidedDriverValueOutsideWorkingRange("optimistic", "-80")).toBe(
      true,
    )
    expect(isGuidedDriverValueOutsideWorkingRange("pessimistic", "80")).toBe(
      true,
    )
    expect(isGuidedDriverValueOutsideWorkingRange("optimistic", "-40")).toBe(
      false,
    )
  })

  it("F: dialog pins slider display without clamping stored row on render", () => {
    const src = dialogSource()
    expect(src).toContain("pinGuidedSliderDisplayValue")
    expect(src).toContain("isGuidedDriverValueOutsideWorkingRange")
    expect(src).toContain("GUIDED_DRIVER_P10_SLIDER_RANGE")
    expect(src).toContain("GUIDED_DRIVER_MODE_SLIDER_RANGE")
    expect(src).toContain("GUIDED_DRIVER_P90_SLIDER_RANGE")
    // Slider commits only via onCommit (user interaction), not render-time patch.
    expect(src).toContain('onCommit={(v) => commitPercentField("optimistic", v)}')
    expect(src).not.toContain("GUIDED_DRIVER_P10_SLIDER.")
  })
})

describe("Guided Driver early range validation", () => {
  it("G: valid -55/0/+55 shows no warning", () => {
    const row = driverRow({
      optimistic: "-55",
      likely: "0",
      pessimistic: "55",
    })
    expect(getGuidedDriverRangeIssue(row)).toBeNull()
    expect(parseDriverForSimulation(row)).not.toBeNull()
  })

  it("H: support-invalid -56/0/+56 shows support warning", () => {
    const row = driverRow({
      optimistic: "-56",
      likely: "0",
      pessimistic: "56",
    })
    expect(getGuidedDriverRangeIssue(row)).toBe("support")
    expect(driverCalibratedSupportInvalid(row)).toBe(true)
    expect(parseDriverForSimulation(row)).toBeNull()
  })

  it("valid asymmetric -5/0/+60 and -60/0/+5 show no warning", () => {
    expect(
      getGuidedDriverRangeIssue(
        driverRow({ optimistic: "-5", likely: "0", pessimistic: "60" }),
      ),
    ).toBeNull()
    expect(
      getGuidedDriverRangeIssue(
        driverRow({ optimistic: "-60", likely: "0", pessimistic: "5" }),
      ),
    ).toBeNull()
  })

  it("invalid non-zero-mode -55/+10/+55 shows support warning", () => {
    const row = driverRow({
      optimistic: "-55",
      likely: "10",
      pessimistic: "55",
    })
    expect(getGuidedDriverRangeIssue(row)).toBe("support")
    expect(parseDriverForSimulation(row)).toBeNull()
  })

  it("order invalid shows order warning, not support", () => {
    const row = driverRow({
      optimistic: "-5",
      likely: "20",
      pessimistic: "10",
    })
    expect(getGuidedDriverRangeIssue(row)).toBe("order")
    expect(driverCalibratedSupportInvalid(row)).toBe(false)
    expect(parseDriverForSimulation(row)).toBeNull()
  })

  it("I: warning is non-blocking in Guided Input", () => {
    const src = dialogSource()
    expect(src).toContain("getGuidedDriverRangeIssue")
    expect(src).toContain('data-guided-driver-range-warning={rangeIssue}')
    expect(src).not.toContain("guidedRowBlocksAdvance")
    expect(src).not.toContain("disabled={rangeIssue")
  })

  it("J: Guided issue matches table/simulation validity", () => {
    const cases = [
      ["-55", "0", "55"],
      ["-56", "0", "56"],
      ["-5", "0", "60"],
      ["-60", "0", "5"],
      ["-55", "10", "55"],
      ["-5", "20", "10"],
    ] as const
    for (const [o, l, p] of cases) {
      const row = driverRow({ optimistic: o, likely: l, pessimistic: p })
      const simOk = parseDriverForSimulation(row) !== null
      const issue = getGuidedDriverRangeIssue(row)
      expect(issue === null).toBe(simOk)
      if (!simOk) {
        expect(issue).not.toBeNull()
      }
    }
  })

  it("K: NO and EN warning copy", () => {
    expect(messages.no.inputs.guidedDriverSupportInvalid).toBe(
      "Spennet går for langt mot nedsiden til å kunne simuleres. Flytt P10 nærmere mest sannsynlig verdi.",
    )
    expect(messages.en.inputs.guidedDriverSupportInvalid).toBe(
      "The range extends too far on the downside to be simulated. Move P10 closer to the most likely value.",
    )
    expect(messages.no.inputs.guidedDriverOrderInvalid).toContain("P10")
    expect(messages.en.inputs.guidedDriverOrderInvalid).toContain("P10")
    expect(messages.no.inputs.guidedDriverOutsideWorkingRange).toBe(
      "Utenfor normalområdet",
    )
    expect(messages.en.inputs.guidedDriverOutsideWorkingRange).toBe(
      "Outside normal range",
    )
    expect(messages.no.inputs.guidedDriverSupportInvalid).not.toMatch(
      /±\s*55|±\s*60|maksimum|model limit/i,
    )
    expect(messages.en.inputs.guidedDriverSupportInvalid).not.toMatch(
      /±\s*55|±\s*60|maximum|model limit/i,
    )
  })

  it("L: live monetary effects wiring unchanged", () => {
    const src = dialogSource()
    expect(src).toContain("computeGuidedDriverEndpointEffects")
    expect(src).toContain("data-guided-driver-p10-effect")
    expect(src).toContain("data-guided-driver-m-effect")
    expect(src).toContain("data-guided-driver-p90-effect")
    expect(src).toContain("guidedDriverEffectHint")
  })

  it("incomplete triplet does not warn", () => {
    expect(
      getGuidedDriverRangeIssue(
        driverRow({ optimistic: "-56", likely: "", pessimistic: "56" }),
      ),
    ).toBeNull()
  })
})
