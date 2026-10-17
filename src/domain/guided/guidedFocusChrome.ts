import type { GuidedPhaseInfoContent } from "@/components/GuidedPhaseInfo"
import type { GuidedWorkflowPhase } from "@/domain/guided/guidedWorkflow"

/**
 * Header/footer metadata Guided publishes to the shared Focus session shell
 * while embedded. One source of truth for Input Focus chrome labels.
 */
export type GuidedFocusChromeMeta = {
  title: string
  progressLabel: string
  projectName: string
  projectIndex: number
  /** Active Guided workflow phase — for Focus phase overview / session resume. */
  workflowPhase: GuidedWorkflowPhase | null
  /** Row id when on a cost/driver item step (session resume). */
  workflowRowId: string | null
  helpTopic: string | null
  helpContent: GuidedPhaseInfoContent | null
  canGoPrevious: boolean
  canGoNext: boolean
  nextLabel: string
  /** Optional secondary actions rendered left of Next (Adjust / Add drivers). */
  secondaryFooter: GuidedFocusSecondaryFooter | null
}

export type GuidedFocusSecondaryFooter =
  | { kind: "adjustCorrelation"; label: string }
  | { kind: "adjustImpact"; label: string }
  | { kind: "addDrivers"; label: string }
