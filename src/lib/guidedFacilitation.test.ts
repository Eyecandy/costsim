import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { repoRoot } from "@/test-utils/repoRoot"


function dialogSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function infoSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedPhaseInfo.tsx"),
    "utf8",
  )
}

describe("Guided Input facilitation layer", () => {
  it("Cost Item facilitator prompts stay operational; concept lives on intro slide", () => {
    const src = dialogSource()
    expect(src).toContain("guidedEstimateUncertaintyConceptBasis")
    expect(src).toContain('phase="estimateUncertaintyIntro"')
    expect(src).toContain("data-guided-concept-intro")
    expect(src).not.toContain("guidedEstimateUncertaintyIntro")
    expect(src).not.toContain("guidedEstimateUncertaintyPractical")
    expect(src).not.toContain("data-guided-estimate-uncertainty")
    expect(messages.no.inputs.guidedPhaseCost).toBe("Kostnadsposter")
    expect(messages.en.inputs.guidedPhaseCost).toBe("Cost items")
    expect(messages.no.inputs.guidedPhaseEstimateUncertainty).toBe(
      "Estimatusikkerhet",
    )
    expect(messages.en.inputs.guidedPhaseEstimateUncertainty).toBe(
      "Estimate uncertainty",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyConceptUncertainty).toContain(
      "Estimatusikkerheten",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyConceptUncertainty).toContain(
      "mengde, pris eller begge deler",
    )
    expect(messages.en.inputs.guidedEstimateUncertaintyConceptUncertainty).toContain(
      "quantity, price, or both",
    )
  })

  it("Cost Item numeric control area remains the same interaction surface", () => {
    const src = dialogSource()
    const costPhase = src.slice(
      src.indexOf("const renderCostPhase"),
      src.indexOf("const renderDriverPhase"),
    )
    expect(costPhase).toContain('data-guided-cost-range=""')
    expect(costPhase).toContain('data-guided-side="p10"')
    expect(costPhase).toContain('data-guided-side="mode"')
    expect(costPhase).toContain('data-guided-side="p90"')
    expect(costPhase).toContain("GuidedRangeSlider")
    expect(costPhase).toContain("GuidedInlineValue")
    expect(costPhase).toContain("GUIDED_COST_P10_SLIDER")
    expect(costPhase).toContain("GUIDED_COST_P90_SLIDER")
    expect(costPhase).not.toContain("GuidedPhaseInfo")
  })

  it("Cost Item facilitator prompts updated", () => {
    const src = dialogSource()
    const costPhase = src.slice(
      src.indexOf("const renderCostPhase"),
      src.indexOf("const renderDriverPhase"),
    )
    expect(costPhase).not.toContain("guidedCostDefinitionPrompt")
    expect(costPhase).toContain("defineCostDescriptionPlaceholder")
    expect(costPhase).toContain("guidedDriverUncertaintyNotesHeading")
    expect(costPhase).toContain('data-guided-cost-uncertainty=""')
    expect(messages.no.inputs.guidedDriverUncertaintyNotesHeading).toBe(
      "Usikkerhetsvurdering",
    )
    expect(messages.en.inputs.guidedDriverUncertaintyNotesHeading).toBe(
      "Uncertainty assessment",
    )
    expect(messages.no.inputs.guidedCostLikelyPrompt).toContain(
      "mest sannsynlig kostnad",
    )
    expect(messages.no.inputs.guidedCostRangeSourcePrompt).toContain(
      "mengden, prisen eller begge deler",
    )
    expect(messages.en.inputs.guidedCostRangeSourcePrompt).toContain(
      "quantity, price, or both",
    )
    expect(messages.no.inputs.guidedCostRangePrompt).toContain(
      "ned eller opp fra mest sannsynlig",
    )
    expect(messages.no.inputs.guidedCostRangeReminder).toContain(
      "realistisk spenn",
    )
    expect(messages.en.inputs.guidedCostLikelyPrompt).toContain(
      "most likely cost",
    )
    expect(messages.en.inputs.guidedCostRangePrompt).toContain(
      "down or up from the most likely",
    )
    expect(dialogSource()).toContain("guidedCostRangeSourcePrompt")
    expect(messages.no.inputs).not.toHaveProperty("guidedCostDefinitionPrompt")
    expect(messages.en.inputs).not.toHaveProperty("guidedCostDefinitionPrompt")
  })

  it("Driver phase shows short reminder; full concept on Drivers intro", () => {
    const src = dialogSource()
    const driverPhase = src.slice(
      src.indexOf("const renderDriverPhase"),
      src.indexOf("const renderBody"),
    )
    expect(driverPhase).not.toContain("guidedDriverDefinitionPrompt")
    expect(driverPhase).not.toContain("guidedDriverContext")
    expect(driverPhase).toContain("defineDriverDescriptionPlaceholder")
    expect(driverPhase).toContain("guidedDriverUncertaintyNotesHeading")
    expect(driverPhase).toContain("guidedDriverUncertaintyNotesHelper")
    expect(driverPhase).toContain("guidedDriverRangePrompt")
    expect(driverPhase.indexOf("guidedDriverUncertaintyNotesHeading")).toBeLessThan(
      driverPhase.indexOf("guidedDriverRangePrompt"),
    )
    expect(driverPhase.indexOf("guidedDriverRangePrompt")).toBeLessThan(
      driverPhase.indexOf('data-guided-driver-range=""'),
    )
    expect(src).toContain("guidedDriversIntroMeaning")
    expect(src).toContain('phase="driversIntro"')
    expect(messages.no.inputs.guidedDriversIntroDistinction).toContain(
      "estimatusikkerhet",
    )
    expect(messages.en.inputs.guidedDriversIntroDistinction).toContain(
      "estimate uncertainty",
    )
    expect(messages.no.inputs.guidedDriverUncertaintyLowerPrompt).toContain(
      "lavere kostnadsutfall",
    )
    expect(messages.en.inputs.guidedDriverUncertaintyHigherPrompt).toContain(
      "higher cost outcome",
    )
    expect(messages.en.inputs.guidedDriverRangePrompt).toContain(
      "realistically describes",
    )
    expect(messages.no.inputs).not.toHaveProperty("guidedDriverDefinitionPrompt")
    expect(messages.no.inputs).not.toHaveProperty("guidedDriverContext")
    expect(messages.en.inputs).not.toHaveProperty("guidedDriverDefinitionPrompt")
    expect(messages.en.inputs).not.toHaveProperty("guidedDriverContext")
  })

  it("Correlation and Impact use facilitator questions", () => {
    expect(messages.no.inputs.guidedCorrelationGuidance).toBe(
      "Er det kostnadsposter som faktisk har en tendens til å bli høye eller lave samtidig?",
    )
    expect(messages.en.inputs.guidedCorrelationGuidance).toContain(
      "genuinely tend",
    )
    expect(messages.no.inputs.guidedImpactGuidance).toBe(
      "Treffer denne driveren alle kostnadspostene like mye?",
    )
    expect(messages.en.inputs.guidedImpactGuidance).toContain(
      "affect all cost items equally",
    )
    const src = dialogSource()
    expect(src).toContain("guidedCorrelationSecondaryGuidance")
    expect(src).toContain("guidedImpactSecondaryGuidance")
    expect(src).toContain("guidedImpactDefaultAll")
    expect(src).toContain("guidedCorrelationSelectedHeading")
    expect(src).toContain("guidedImpactAdjustedHeading")
    expect(src).toContain('data-guided-correlation-summary-heading=""')
    expect(src).toContain('data-guided-impact-summary-heading=""')
    expect(messages.no.inputs.guidedCorrelationSelectedHeading).toBe(
      "Valgte korrelasjoner",
    )
    expect(messages.en.inputs.guidedCorrelationSelectedHeading).toBe(
      "Selected correlations",
    )
    expect(messages.no.inputs.guidedImpactAdjustedHeading).toBe(
      "Tilpasset påvirkning",
    )
    expect(messages.en.inputs.guidedImpactAdjustedHeading).toBe(
      "Adjusted impact",
    )
  })

  it("Assumptions secondary guidance and examples distinguish uncertainty", () => {
    expect(messages.no.inputs.guidedAssumptionsGuidance).toBe(
      "Hva legger dere til grunn for vurderingene?",
    )
    expect(messages.en.inputs.guidedAssumptionsGuidance).toBe(
      "What assumptions are your assessments based on?",
    )
    expect(messages.no.inputs.guidedAssumptionsSecondaryGuidance).toContain(
      "estimatusikkerhet eller driver",
    )
    expect(messages.en.inputs.guidedAssumptionsSecondaryGuidance).toContain(
      "estimate uncertainty or a driver",
    )
    expect(messages.no.inputs.guidedAssumptionsExamples).toContain(
      "valgt standard",
    )
    expect(messages.en.inputs.guidedAssumptionsExamples).toContain(
      "chosen standard",
    )
    const src = dialogSource()
    expect(src).toContain("guidedAssumptionsSecondaryGuidance")
    expect(src).toContain("guidedAssumptionsExamples")
  })

  it("Info control appears only on intended phases", () => {
    const src = dialogSource()
    expect(src).toContain('phaseInfoTopic === "assumptions"')
    expect(src).toContain('phaseInfoTopic === "estimateUncertainty"')
    expect(src).toContain('phaseInfoTopic === "drivers"')
    expect(src).toContain('phaseInfoTopic === "correlation"')
    expect(src).toContain('phaseInfoTopic === "impact"')
    expect(src).toContain('step?.phase === "estimateUncertaintyIntro"')
    expect(src).toContain('step?.phase === "driversIntro"')
    expect(src).toContain("<GuidedPhaseInfo")
    expect(src).not.toMatch(
      /phaseInfoTopic === "(incurred|costsEmpty|driversEmpty|finish|simulation)"/,
    )
  })

  it("Info content correct in NO and EN", () => {
    expect(messages.no.inputs.guidedAssumptionsHelpTitle).toBe("Forutsetninger")
    expect(messages.en.inputs.guidedAssumptionsHelpTitle).toBe("Assumptions")
    expect(messages.no.inputs.guidedAssumptionsHelpMeaning).toContain(
      "premissene analysen bygger på",
    )
    expect(messages.no.inputs.guidedAssumptionsHelpMeaning).toContain(
      "Eksempler kan være",
    )
    expect(messages.en.inputs.guidedAssumptionsHelpMeaning).toContain(
      "premises on which the analysis is based",
    )
    expect(messages.en.inputs.guidedAssumptionsHelpMeaning).toContain(
      "Examples may include",
    )
    expect(messages.no.inputs.guidedAssumptionsHelpDiscuss).toContain(
      "må være sant",
    )
    expect(messages.en.inputs.guidedAssumptionsHelpDiscuss).toContain(
      "must be true",
    )
    expect(messages.no.inputs.guidedAssumptionsHelpAvoid).toContain(
      "estimatusikkerhet i en kostnadspost eller som en driver",
    )
    expect(messages.en.inputs.guidedAssumptionsHelpAvoid).toContain(
      "estimate uncertainty in a cost item or as a driver",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyHelpTitle).toBe(
      "Estimatusikkerhet",
    )
    expect(messages.en.inputs.guidedEstimateUncertaintyHelpTitle).toBe(
      "Estimate uncertainty",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyHelpMeaning).toContain(
      "mengde, pris eller begge deler",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyHelpMeaning).toContain(
      "Eksempel:",
    )
    expect(messages.en.inputs.guidedEstimateUncertaintyHelpMeaning).toContain(
      "quantity, price, or both",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyHelpDiscuss).toContain(
      "Skillet mot drivere",
    )
    expect(messages.en.inputs.guidedEstimateUncertaintyHelpDiscuss).toContain(
      "distinction from drivers",
    )
    expect(messages.no.inputs.guidedEstimateUncertaintyHelpAvoid).toContain(
      "P10–P90-spenn og som driver",
    )
    expect(messages.en.inputs.guidedEstimateUncertaintyHelpAvoid).toContain(
      "P10–P90 range and as a driver",
    )
    expect(messages.no.inputs.guidedDriverHelpTitle).toBe("Drivere")
    expect(messages.en.inputs.guidedDriverHelpTitle).toBe("Drivers")
    expect(messages.no.inputs.guidedCorrelationHelpTitle).toBe("Korrelasjon")
    expect(messages.en.inputs.guidedCorrelationHelpTitle).toBe("Correlation")
    expect(messages.no.inputs.guidedImpactHelpTitle).toBe("Påvirkning")
    expect(messages.en.inputs.guidedImpactHelpTitle).toBe("Impact")
    expect(messages.no.inputs.guidedHelpMeaningLabel).toBe("Hva betyr dette?")
    expect(messages.en.inputs.guidedHelpAvoidLabel).toBe("Avoid")
  })

  it("Info popover does not close Guided Input; Escape closes panel only", () => {
    const info = infoSource()
    expect(info).toContain("data-guided-phase-info-panel")
    expect(info).toContain('event.stopPropagation()')
    expect(info).toContain('event.key === "Escape"')
    expect(info).toContain("setOpen(false)")
    expect(info).not.toContain("onClose")
    expect(dialogSource()).toContain("createPortal")
  })

  it("Assumptions phase Info does not alter editor wiring", () => {
    const src = dialogSource()
    const assumptionsPhase = src.slice(
      src.indexOf("function GuidedAssumptionsPhase"),
      src.indexOf("function GuidedIncurredPhase"),
    )
    expect(assumptionsPhase).toContain("guidedAssumptionsExamples")
    expect(assumptionsPhase).not.toContain("GuidedPhaseInfo")
    expect(assumptionsPhase).toContain("onAdd")
    expect(assumptionsPhase).toContain("onUpdate")
    expect(assumptionsPhase).toContain("onRemove")
    expect(assumptionsPhase).toContain("parseAssumptionText")
    expect(assumptionsPhase).toContain("commitAdd")
    expect(assumptionsPhase).toContain("commitEdit")
  })

  it("orphan guidance keys removed", () => {
    expect(messages.no.inputs).not.toHaveProperty("guidedCostGuidance")
    expect(messages.no.inputs).not.toHaveProperty("guidedDriverGuidance")
    expect(messages.no.inputs).not.toHaveProperty("guidedCostP10Hint")
    expect(messages.no.inputs).not.toHaveProperty("guidedCostLikelyHint")
    expect(messages.no.inputs).not.toHaveProperty("guidedCostP90Hint")
    expect(messages.no.inputs).not.toHaveProperty("guidedDriverPercentHint")
    expect(messages.no.inputs).not.toHaveProperty("guidedCostDefinitionPrompt")
    expect(messages.no.inputs).not.toHaveProperty("guidedDriverDefinitionPrompt")
    expect(messages.no.inputs).not.toHaveProperty("guidedDriverContext")
    expect(messages.en.inputs).not.toHaveProperty("guidedCostGuidance")
    expect(messages.en.inputs).not.toHaveProperty("guidedDriverGuidance")
    expect(messages.en.inputs).not.toHaveProperty("guidedCostDefinitionPrompt")
    expect(messages.en.inputs).not.toHaveProperty("guidedDriverDefinitionPrompt")
    expect(messages.en.inputs).not.toHaveProperty("guidedDriverContext")
  })

  it("empty-state and resume wiring unchanged", () => {
    const src = dialogSource()
    expect(src).toContain("guidedCostsEmptyGuidance")
    expect(src).toContain("guidedDriversEmptyGuidance")
    expect(src).toContain("onAddCostItems")
    expect(src).toContain("onAddDrivers")
    expect(src).toContain("onAdjustCorrelation")
    expect(src).toContain("onAdjustImpact")
    expect(src).toContain("resumePhase")
    expect(src).toContain("findGuidedWorkflowPhaseIndex")
  })

  it("heading hierarchy: phase title once; item progress without phase name", () => {
    const src = dialogSource()
    expect(src).toContain('return t("inputs.guidedPhaseCost")')
    expect(src).toContain('return t("inputs.guidedPhaseDrivers")')
    expect(src).not.toContain("guidedCostTitle")
    expect(src).not.toContain("guidedDriverTitle")
    expect(src).toContain("{progressLabel ? (")
    expect(messages.no.inputs).not.toHaveProperty("guidedCostTitle")
    expect(messages.en.inputs).not.toHaveProperty("guidedDriverTitle")
    expect(messages.en.inputs.guidedPhaseImpact).toBe("Impact")
  })
})
