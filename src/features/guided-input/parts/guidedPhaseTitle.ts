import { type GuidedWorkflowStep } from "@/domain/guided/guidedWorkflow"
import type { Translate } from "@/i18n/messages"

export function phaseTitle(step: GuidedWorkflowStep, t: Translate): string {
  switch (step.phase) {
    case "focusIntro":
      return t("inputs.guidedPhaseFocusIntro")
    case "projectProfile":
      return t("inputs.guidedPhaseProjectProfile")
    case "assumptions":
      return t("inputs.guidedPhaseAssumptions")
    case "incurred":
      return t("inputs.guidedPhaseIncurred")
    case "estimateUncertaintyIntro":
      return t("inputs.guidedPhaseEstimateUncertainty")
    case "costsEmpty":
    case "cost":
      return t("inputs.guidedPhaseCost")
    case "correlation":
      return t("inputs.guidedPhaseCorrelation")
    case "driversIntro":
    case "driversEmpty":
    case "driver":
      return t("inputs.guidedPhaseDrivers")
    case "impact":
      return t("inputs.guidedPhaseImpact")
    case "simulation":
      return t("inputs.guidedPhaseSimulation")
  }
}
