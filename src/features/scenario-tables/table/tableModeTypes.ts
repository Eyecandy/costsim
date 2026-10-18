import "@glideapps/glide-data-grid/dist/index.css"

import { type DriverImpactsByRowId } from "@/domain/analysis/project"
import { type CostCorrelationPrepStatus } from "@/domain/simulation/costCorrelation"
import { type SavedCorrelationSummary } from "@/domain/simulation/costCorrelationSummaries"

export type DriverImpactModeProps = {
  active: boolean
  onToggle: () => void
  selectedDriverRowId: string | null
  onSelectDriver: (driverRowId: string) => void
  /** Present only when Impact was opened from Guided Input (resume detour). */
  onReturnToGuided?: () => void
}

export type CostCorrelationModeProps = {
  active: boolean
  onToggle: () => void
  /** Multi-select of valid cost-item row ids while Correlation mode is on. */
  selectedCostRowIds: readonly string[]
  onToggleCostSelection: (costRowId: string) => void
  /** Open a saved summary for editing without mutating the matrix. */
  onOpenSummary: (rowIds: readonly string[]) => void
  /** Zero all pairs represented by a saved summary (atomic). */
  onRemoveSummary: (rowIds: readonly string[]) => void
  /** Proposed group correlation (−0.9…0.9); ignored for display when pendingMixed. */
  pendingRho: number
  /** True when selected pairs have differing stored values and user has not moved the slider. */
  pendingMixed: boolean
  onPendingRhoChange: (value: number) => void
  onApplyGroupCorrelation: () => void
  /** Summaries derived from the stored pairwise matrix (non-zero only). */
  savedSummaries: readonly SavedCorrelationSummary[]
  /** Brief post-Apply / post-remove confirmation. */
  saveConfirmVisible?: boolean
  saveConfirmKind?: "saved" | "removed" | null
  prepStatus?: CostCorrelationPrepStatus
  /** Set when Apply was rejected as non-PSD. */
  incompatibleEditWarning?: boolean
  /** Present only when Correlation was opened from Guided Input (resume detour). */
  onReturnToGuided?: () => void
}

export type CostImpactSlidersProps = {
  active: boolean
  selectedDriverRowId: string | null
  selectedDriverLabel?: string
  driverImpacts: DriverImpactsByRowId | undefined
  onImpactChange: (driverRowId: string, costRowId: string, value: number) => void
  changedCellKeys?: ReadonlySet<string>
}

export type DefineModeProps = {
  active: boolean
  onToggle: () => void
  selectedRowId: string | null
  onSelectRow: (rowId: string) => void
  onClearSelection: () => void
}

/** Opens Guided Input overlay for this table's row kind (cost or driver). */
export type GuidedInputModeProps = {
  active: boolean
  onOpen: () => void
  /** Shown after Guided Input handoff to add rows (empty Cost Items / Drivers). */
  onReturnToGuided?: () => void
}
