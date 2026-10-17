import {
  ScenarioPercentTable,
  type DefineModeProps,
  type DriverImpactModeProps,
  type GuidedInputModeProps,
} from "@/components/ScenarioPercentTable"
import { useI18n } from "@/i18n/useI18n"
import { type DriverRow } from "@/lib/tableRows"

type DriversTableProps = {
  rows: DriverRow[]
  onRowsChange: (rows: DriverRow[]) => void
  changedCellKeys?: ReadonlySet<string>
  invalidCellKeys?: ReadonlySet<string>
  driverImpactMode?: DriverImpactModeProps
  defineMode?: DefineModeProps
  guidedInputMode?: GuidedInputModeProps
  readOnly?: boolean
}

export function DriversTable({
  rows,
  onRowsChange,
  changedCellKeys,
  invalidCellKeys,
  driverImpactMode,
  defineMode,
  guidedInputMode,
  readOnly = false,
}: DriversTableProps) {
  const { t } = useI18n()
  return (
    <ScenarioPercentTable
      tableId="drivers"
      variant="driverMixed"
      rows={rows}
      onRowsChange={onRowsChange}
      minRows={1}
      toolbarHelpText={t("inputs.guidanceCostDrivers")}
      toolbarHelpGuideHint={t("inputs.guidanceCostDriversGuide")}
      changedCellKeys={changedCellKeys}
      invalidCellKeys={invalidCellKeys}
      driverImpactMode={driverImpactMode}
      defineMode={defineMode}
      guidedInputMode={guidedInputMode}
      readOnly={readOnly}
    />
  )
}
