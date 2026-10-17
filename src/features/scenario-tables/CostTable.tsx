import { AssumptionsEditor } from "@/features/scenario-tables/AssumptionsEditor"
import {
  ScenarioPercentTable,
  type CostCorrelationModeProps,
  type CostImpactSlidersProps,
  type DefineModeProps,
  type GuidedInputModeProps,
} from "@/features/scenario-tables/ScenarioPercentTable"
import { useI18n } from "@/i18n/useI18n"
import type { ProjectAssumption } from "@/domain/analysis/assumptions"
import { type CostElementRow } from "@/domain/results/tableRows"

type CostTableProps = {
  rows: CostElementRow[]
  incurredCosts: number
  onIncurredCostsChange: (value: number) => void
  onRowsChange: (rows: CostElementRow[]) => void
  assumptions?: readonly ProjectAssumption[]
  onAddAssumption?: (text: string) => void
  onUpdateAssumption?: (assumptionId: string, text: string) => void
  onRemoveAssumption?: (assumptionId: string) => void
  changedCellKeys?: ReadonlySet<string>
  invalidCellKeys?: ReadonlySet<string>
  costImpactSliders?: CostImpactSlidersProps
  costCorrelationMode?: CostCorrelationModeProps
  defineMode?: DefineModeProps
  guidedInputMode?: GuidedInputModeProps
  readOnly?: boolean
}

export function CostTable({
  rows,
  incurredCosts,
  onIncurredCostsChange,
  onRowsChange,
  assumptions = [],
  onAddAssumption,
  onUpdateAssumption,
  onRemoveAssumption,
  changedCellKeys,
  invalidCellKeys,
  costImpactSliders,
  costCorrelationMode,
  defineMode,
  guidedInputMode,
  readOnly = false,
}: CostTableProps) {
  const { t } = useI18n()
  const showAssumptions =
    costCorrelationMode?.active !== true &&
    (readOnly ||
      (onAddAssumption !== undefined &&
        onUpdateAssumption !== undefined &&
        onRemoveAssumption !== undefined))

  return (
    <div className="min-w-0">
      {showAssumptions ? (
        <AssumptionsEditor
          assumptions={assumptions}
          readOnly={readOnly}
          onAdd={readOnly ? undefined : onAddAssumption}
          onUpdate={readOnly ? undefined : onUpdateAssumption}
          onRemove={readOnly ? undefined : onRemoveAssumption}
        />
      ) : null}
      <ScenarioPercentTable
        tableId="cost-elements"
        variant="costMixed"
        rows={rows}
        incurredCosts={incurredCosts}
        onIncurredCostsChange={onIncurredCostsChange}
        onRowsChange={onRowsChange}
        minRows={1}
        toolbarHelpText={t("inputs.guidanceCostItems")}
        toolbarHelpGuideHint={t("inputs.guidanceCostItemsGuide")}
        changedCellKeys={changedCellKeys}
        invalidCellKeys={invalidCellKeys}
        costImpactSliders={costImpactSliders}
        costCorrelationMode={costCorrelationMode}
        defineMode={defineMode}
        guidedInputMode={guidedInputMode}
        readOnly={readOnly}
      />
    </div>
  )
}
