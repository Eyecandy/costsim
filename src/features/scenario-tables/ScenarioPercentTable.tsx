import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type DrawHeaderCallback,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid"
import "@glideapps/glide-data-grid/dist/index.css"

import {
  SCENARIO_COLUMN_KEYS,
  patchScenarioRow,
  sanitizeScenarioNumericInput,
} from "@/domain/results/excelLikeTable"
import { normalizeIncurredCosts, type DriverImpactsByRowId } from "@/domain/analysis/project"
import {
  snapCorrelationCoefficient,
  type CostCorrelationPrepStatus,
} from "@/domain/simulation/costCorrelation"
import {
  driverImpactCellKey,
  INCURRED_COSTS_CELL_KEY,
} from "@/domain/analysis/simInputSnapshotDiff"
import {
  formatSavedCorrelationSummaryLabel,
  type SavedCorrelationSummary,
} from "@/domain/simulation/costCorrelationSummaries"
import { buttonVariants } from "@/shared/ui/button"
import { useI18n } from "@/i18n/useI18n"
import { applyPastedGrid } from "@/domain/results/tsvPaste"
import { cn } from "@/shared/utils"
import { sliderFillRangePct } from "@/domain/results/sliderFillRange"
import {
  type CostElementRow,
  type DriverRow,
  type ScenarioRow,
  driverCalibratedSupportInvalid,
  driverLikelyOutsideSpan,
  emptyScenarioRow,
  isMeaningfullyFilledRow,
  parseCostForSimulation,
  parseDriverForSimulation,
  parseNumberField,
  resolveDriverImpactPercentForSlider,
  snapDriverImpactPercent,
} from "@/domain/results/tableRows"
import {
  costRowHasDefinition,
  driverRowHasDefinition,
  withCostDescription,
  withDriverDescription,
  withDriverUncertaintyNotes,
} from "@/domain/results/rowDefinitions"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { DefineRowEditor } from "@/features/scenario-tables/DefineRowEditor"
import {
  DefineRowPopover,
  DefineRowPreviewTooltip,
} from "@/features/scenario-tables/DefineRowPopover"
import { LabelHelpTooltip } from "@/features/scenario-tables/LabelHelpTooltip"
import {
  HelpCircle,
  Check,
  FileText,
  Link2,
  Minus,
  Plus,
  Play,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import {
  clampCostLikelyAbs,
  clampCostOptimisticPercent,
  clampCostPessimisticPercent,
  clampDriverLikelyPercent,
} from "@/domain/results/scenarioNumericClamps"

import {
  formatCorrelationControlValue,
  isRelationshipEditingModeActive,
  shouldShowCorrelationGroupControls,
  shouldShowCorrelationSelectInstruction,
  shouldShowDefineSelectHint,
  shouldShowRelationshipSelectHint,
  type ScenarioTableVariant,
} from "@/domain/results/scenarioTableModes"

export type { ScenarioTableVariant }

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

/** Soft brand tint for cells that differ from the last simulated input snapshot (`#1d868c` @ low opacity). */
const CHANGED_VS_SIM_CELL_BG = "rgba(29, 134, 140, 0.05)"
/** Muted red tint for cells that block simulation (incomplete/invalid input). */
const INVALID_INPUT_CELL_BG = "rgba(220, 38, 38, 0.08)"
/** Inline impact/correlation slider track width (50% wider than the original 3.25rem). */
const INLINE_SLIDER_WIDTH_CLASS = "w-[4.875rem] min-w-[3.25rem] shrink"
const INLINE_SLIDER_NAME_CLASS =
  "pointer-events-none min-w-0 flex-1 truncate font-sans text-[12px] leading-none text-[rgba(115,116,131,0.95)]"
const INLINE_SLIDER_VALUE_CLASS =
  "pointer-events-none w-7 shrink-0 text-right font-sans text-[10px] tabular-nums text-muted-foreground"

function InlineMagnitudeSlider({
  min,
  max,
  step,
  value,
  origin,
  ariaLabel,
  onChange,
  disabled = false,
}: {
  min: number
  max: number
  step: number
  value: number
  origin: number
  ariaLabel: string
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const { startPct, endPct } = sliderFillRangePct(value, min, max, origin)
  const fillWidthPct = Math.max(0, endPct - startPct)

  return (
    <div className={cn("relative h-4", INLINE_SLIDER_WIDTH_CLASS)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[5.5px] right-[5.5px]"
      >
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--border)_70%,var(--muted-foreground)_18%)]" />
        {fillWidthPct > 0 ? (
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#1d868c]/70"
            style={{
              left: `${startPct}%`,
              width: `${fillWidthPct}%`,
            }}
          />
        ) : null}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "inline-magnitude-slider relative z-10 h-4 w-full",
          disabled
            ? "pointer-events-none cursor-default opacity-80"
            : "pointer-events-auto cursor-pointer",
        )}
        onChange={(e) => {
          if (disabled) return
          onChange(Number(e.target.value))
        }}
      />
    </div>
  )
}

function cellThemeOverride(
  cellKey: string,
  changedCellKeys: ReadonlySet<string> | undefined,
  invalidCellKeys: ReadonlySet<string> | undefined,
): { bgCell: string; bgCellMedium: string } | undefined {
  if (invalidCellKeys !== undefined && invalidCellKeys.size > 0 && invalidCellKeys.has(cellKey)) {
    return { bgCell: INVALID_INPUT_CELL_BG, bgCellMedium: INVALID_INPUT_CELL_BG }
  }
  if (changedCellKeys !== undefined && changedCellKeys.size > 0 && changedCellKeys.has(cellKey)) {
    return { bgCell: CHANGED_VS_SIM_CELL_BG, bgCellMedium: CHANGED_VS_SIM_CELL_BG }
  }
  return undefined
}

type ScenarioPercentTableProps = {
  tableId: string
  title?: string
  description?: ReactNode
  /** Shown in toolbar on hover/focus; omitted when unset. */
  toolbarHelpText?: string
  /**
   * Short Guided Analysis tip after the main help text.
   * Rendered as: `{useGuide} [Play] {guideHint}` with the same Play icon as the Guide control.
   */
  toolbarHelpGuideHint?: string
  rows: ScenarioRow[]
  onRowsChange: (rows: ScenarioRow[]) => void
  minRows: number
  variant?: ScenarioTableVariant
  /** Project-level fixed costs (cost table only). */
  incurredCosts?: number
  onIncurredCostsChange?: (value: number) => void
  /** `${rowId}:${field}` for editable cells that differ from the last completed simulation snapshot. */
  changedCellKeys?: ReadonlySet<string>
  /** `${rowId}:${field}` for editable cells that block simulation (incomplete/invalid). */
  invalidCellKeys?: ReadonlySet<string>
  /** Drivers table: impact-mode toggle and row selection. */
  driverImpactMode?: DriverImpactModeProps
  /** Cost table: correlation-mode toggle, multi-select, and group apply controls. */
  costCorrelationMode?: CostCorrelationModeProps
  /** Cost table: per-item sliders while impact mode is active. */
  costImpactSliders?: CostImpactSlidersProps
  /** Cost/driver tables: documentation (Define) mode. */
  defineMode?: DefineModeProps
  /** Cost/driver tables: Guided Input (workshop) overlay. */
  guidedInputMode?: GuidedInputModeProps
  /** Archived / immutable analysis: inspectable but not editable. */
  readOnly?: boolean
}

const ROW_HEIGHT = 34
const HEADER_HEIGHT = 36
const NAME_MAX_LENGTH = 80
const COST_MAX_ROWS = 20
const DRIVER_MAX_ROWS = 12
const COST_OPT_COL_WIDTH = 104
const COST_LIKELY_COL_WIDTH = 128
const COST_PESS_COL_WIDTH = 104

const emptyGridSelection: GridSelection = {
  columns: CompactSelection.empty(),
  rows: CompactSelection.empty(),
  current: undefined,
}

/** Integer widths summing to `total` so Glide content width matches the card (no horizontal scroll). */
function distributeScenarioColumnWidths(total: number): readonly [number, number, number, number] {
  const t = Math.max(120, Math.floor(total))
  const w0 = Math.floor(t * 0.36)
  const w1 = Math.floor(t * 0.17)
  const w2 = Math.floor(t * 0.25)
  const w3 = t - w0 - w1 - w2
  return [w0, w1, w2, w3]
}

function getCostColumnWidths(total: number): readonly [number, number, number, number] {
  const fixed =
    COST_OPT_COL_WIDTH +
    COST_LIKELY_COL_WIDTH +
    COST_PESS_COL_WIDTH
  const name = Math.max(160, Math.floor(total) - fixed)
  return [
    name,
    COST_OPT_COL_WIDTH,
    COST_LIKELY_COL_WIDTH,
    COST_PESS_COL_WIDTH,
  ]
}

function normalizePastedRow(r: ScenarioRow): ScenarioRow {
  return {
    ...r,
    name: r.name.slice(0, NAME_MAX_LENGTH),
    optimistic: sanitizeScenarioNumericInput(r.optimistic),
    likely: sanitizeScenarioNumericInput(r.likely),
    pessimistic: sanitizeScenarioNumericInput(r.pessimistic),
  }
}

function formatWithThousands(value: string, language: "no" | "en"): string {
  const trimmed = value.trim()
  if (trimmed === "") return value
  const normalized = trimmed.replace(/\s/g, "")
  const m = normalized.match(/^(-?)(\d+)([.,]\d+)?$/)
  if (!m) return value
  const sign = m[1] ?? ""
  const intPart = m[2] ?? ""
  const fraction = m[3] ?? ""
  const thousandsSeparator = language === "en" ? "," : " "
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
  return `${sign}${grouped}${fraction}`
}

/** Column index for editable incurred-cost value (`Mest sannsynlig`). */
const INCURRED_EDITABLE_COL = 2

function selectionIncludesIncurredLockedCell(
  current: NonNullable<GridSelection["current"]>,
  incurredRowIndex: number,
): boolean {
  const [col, row] = current.cell
  if (row === incurredRowIndex && col !== INCURRED_EDITABLE_COL) return true
  const inc = incurredRowIndex
  const { range } = current
  if (inc < range.y || inc >= range.y + range.height) return false
  const right = range.x + range.width - 1
  return range.x !== INCURRED_EDITABLE_COL || right !== INCURRED_EDITABLE_COL
}

export function ScenarioPercentTable({
  tableId,
  title,
  description,
  toolbarHelpText,
  toolbarHelpGuideHint,
  rows,
  onRowsChange,
  minRows,
  variant = "allPercent",
  incurredCosts = 0,
  onIncurredCostsChange,
  changedCellKeys,
  invalidCellKeys,
  driverImpactMode,
  costCorrelationMode,
  costImpactSliders,
  defineMode,
  guidedInputMode,
  readOnly = false,
}: ScenarioPercentTableProps) {
  const { t, language } = useI18n()
  const tableSectionRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [hostWidth, setHostWidth] = useState(0)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [gridSelection, setGridSelection] =
    useState<GridSelection>(emptyGridSelection)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const confirmActionRef = useRef<(() => void) | null>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const helpTooltipRef = useRef<HTMLSpanElement>(null)
  const [helpTooltipOpen, setHelpTooltipOpen] = useState(false)
  const [helpTooltipPosition, setHelpTooltipPosition] = useState({ top: 0, left: 0 })
  /** Stable refs for defined-row FileText icons (popover + hover preview). */
  const defineIconRefs = useRef(new Map<string, HTMLButtonElement>())
  const defineFallbackAnchorRef = useRef<HTMLSpanElement>(null)
  const definePreviewAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [definePreviewRowId, setDefinePreviewRowId] = useState<string | null>(
    null,
  )
  const definePreviewOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const definePreviewCloseTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w !== undefined) setHostWidth(Math.floor(w))
    })
    ro.observe(el)
    setHostWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  const correlationSelectedIdSet = useMemo(
    () => new Set(costCorrelationMode?.selectedCostRowIds ?? []),
    [costCorrelationMode?.selectedCostRowIds],
  )
  const correlationSelectedCount =
    costCorrelationMode?.selectedCostRowIds.length ?? 0
  const showCorrelationSelectInstruction = shouldShowCorrelationSelectInstruction({
    correlationActive: costCorrelationMode?.active,
    selectedCount: correlationSelectedCount,
    saveConfirmVisible: costCorrelationMode?.saveConfirmVisible,
  })
  const showCorrelationGroupControls = shouldShowCorrelationGroupControls({
    correlationActive: costCorrelationMode?.active,
    selectedCount: correlationSelectedCount,
  })
  const relationshipEditingActive = isRelationshipEditingModeActive({
    variant,
    driverImpactModeActive: driverImpactMode?.active,
    costCorrelationModeActive: costCorrelationMode?.active,
    defineModeActive: defineMode?.active,
  })
  const showDefineSelectHint = shouldShowDefineSelectHint({
    defineModeActive: defineMode?.active,
    selectedRowId: defineMode?.selectedRowId ?? null,
  })
  const showRelationshipSelectHint = shouldShowRelationshipSelectHint({
    variant,
    driverImpactMode,
  })
  const defineSelectedRow =
    defineMode?.active && defineMode.selectedRowId
      ? (rows.find((row) => row.id === defineMode.selectedRowId) ?? null)
      : null

  const defineSelectedHasIcon =
    defineSelectedRow !== null &&
    (variant === "costMixed"
      ? costRowHasDefinition(defineSelectedRow as CostElementRow)
      : variant === "driverMixed"
        ? driverRowHasDefinition(defineSelectedRow as DriverRow)
        : false)

  const getDefinePopoverAnchor = useCallback((): HTMLElement | null => {
    if (!defineSelectedRow) return null
    if (defineSelectedHasIcon) {
      return defineIconRefs.current.get(defineSelectedRow.id) ?? null
    }
    return defineFallbackAnchorRef.current
  }, [defineSelectedRow, defineSelectedHasIcon])

  const getDefinePreviewAnchor = useCallback((): HTMLElement | null => {
    return definePreviewAnchorRef.current
  }, [])

  const definePreviewText = (() => {
    if (!definePreviewRowId) return ""
    const row = rows.find((r) => r.id === definePreviewRowId)
    if (!row) return ""
    const description =
      typeof (row as CostElementRow).description === "string"
        ? ((row as CostElementRow).description ?? "").trim()
        : ""
    if (description !== "") return description
    if (variant === "driverMixed") {
      const notes = (row as DriverRow).uncertaintyNotes
      const bits = [
        ...(notes?.lowerOutcome ?? []),
        ...(notes?.higherOutcome ?? []),
      ]
        .map((item) => item.trim())
        .filter((item) => item !== "")
      return bits.slice(0, 4).join(" · ")
    }
    return ""
  })()

  const clearDefinePreviewTimers = useCallback(() => {
    if (definePreviewOpenTimerRef.current !== null) {
      clearTimeout(definePreviewOpenTimerRef.current)
      definePreviewOpenTimerRef.current = null
    }
    if (definePreviewCloseTimerRef.current !== null) {
      clearTimeout(definePreviewCloseTimerRef.current)
      definePreviewCloseTimerRef.current = null
    }
  }, [])

  const scheduleDefinePreviewOpen = useCallback(
    (rowId: string, anchor: HTMLButtonElement) => {
      clearDefinePreviewTimers()
      // Suppress hover preview while the full editor is open for the same row.
      if (defineMode?.selectedRowId === rowId) return
      definePreviewAnchorRef.current = anchor
      definePreviewOpenTimerRef.current = setTimeout(() => {
        setDefinePreviewRowId(rowId)
        definePreviewOpenTimerRef.current = null
      }, 280)
    },
    [clearDefinePreviewTimers, defineMode?.selectedRowId],
  )

  const scheduleDefinePreviewClose = useCallback(() => {
    if (definePreviewOpenTimerRef.current !== null) {
      clearTimeout(definePreviewOpenTimerRef.current)
      definePreviewOpenTimerRef.current = null
    }
    definePreviewCloseTimerRef.current = setTimeout(() => {
      setDefinePreviewRowId(null)
      definePreviewAnchorRef.current = null
      definePreviewCloseTimerRef.current = null
    }, 120)
  }, [])

  useEffect(() => {
    if (defineMode?.active) return
    clearDefinePreviewTimers()
    setDefinePreviewRowId(null)
    definePreviewAnchorRef.current = null
  }, [defineMode?.active, clearDefinePreviewTimers])

  useEffect(() => {
    // Hide preview when the editor opens for the hovered row.
    if (
      definePreviewRowId !== null &&
      defineMode?.selectedRowId === definePreviewRowId
    ) {
      clearDefinePreviewTimers()
      setDefinePreviewRowId(null)
    }
  }, [defineMode?.selectedRowId, definePreviewRowId, clearDefinePreviewTimers])

  const gridWidth = hostWidth > 0 ? hostWidth : 560
  const tableTheme = useMemo<Partial<Theme>>(
    () => ({
      fontFamily:
        "Geist Variable, Inter, Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
      baseFontStyle: "12px",
      headerFontStyle: "12px",
      textHeader: "rgba(115, 116, 131, 0.95)",
      textHeaderSelected: "#111827",
      textDark: "rgba(115, 116, 131, 0.95)",
      textMedium: "rgba(115, 116, 131, 0.95)",
      cellHorizontalPadding: 8,
      cellVerticalPadding: 4,
      bgCell: "#FAFAFA",
      bgCellMedium: "#FAFAFA",
      bgHeader: "#FAFAFA",
      bgHeaderHovered: "#F3F4F6",
      bgHeaderHasFocus: "#F3F4F6",
      borderColor: "transparent",
      horizontalBorderColor: "rgba(15, 23, 42, 0.10)",
      headerBottomBorderColor: "rgba(15, 23, 42, 0.10)",
    }),
    [],
  )

  const usesCostTableLayout =
    variant === "costMixed" || variant === "driverMixed"

  const columns = useMemo((): GridColumn[] => {
    if (usesCostTableLayout) {
      const [w0, w1, w2, w3] = getCostColumnWidths(gridWidth)
      return [
        { title: t("inputs.nameHeader"), width: w0, id: "name" },
        { title: t("inputs.optimisticHeader"), width: w1, id: "optimistic" },
        {
          title:
            variant === "costMixed"
              ? t("inputs.likelyHeader")
              : t("inputs.likelyPercentHeader"),
          width: w2,
          id: "likely",
        },
        { title: t("inputs.pessimisticHeader"), width: w3, id: "pessimistic" },
      ]
    }
    const [w0, w1, w2, w3] = distributeScenarioColumnWidths(gridWidth)
    return [
      { title: t("inputs.nameHeader"), width: w0, id: "name" },
      { title: t("inputs.optimisticHeader"), width: w1, id: "optimistic" },
      { title: t("inputs.likelyPercentHeader"), width: w2, id: "likely" },
      { title: t("inputs.pessimisticHeader"), width: w3, id: "pessimistic" },
    ]
  }, [variant, gridWidth, t, usesCostTableLayout])

  const costColumnWidths = useMemo((): readonly [number, number, number, number] | null => {
    if (variant !== "costMixed" && variant !== "driverMixed") return null
    return getCostColumnWidths(gridWidth)
  }, [variant, gridWidth])

  const driverLikelySpanRows = useMemo(() => {
    if (variant !== "driverMixed" || invalidCellKeys === undefined) return []
    return rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(
        ({ row }) =>
          driverLikelyOutsideSpan(row) &&
          invalidCellKeys.has(`${row.id}:likely`),
      )
      .sort((a, b) => a.rowIndex - b.rowIndex)
  }, [variant, rows, invalidCellKeys])

  const driverSupportInvalidRows = useMemo(() => {
    if (variant !== "driverMixed" || invalidCellKeys === undefined) return []
    return rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(
        ({ row }) =>
          driverCalibratedSupportInvalid(row) &&
          (invalidCellKeys.has(`${row.id}:optimistic`) ||
            invalidCellKeys.has(`${row.id}:pessimistic`)),
      )
      .sort((a, b) => a.rowIndex - b.rowIndex)
  }, [variant, rows, invalidCellKeys])

  const showIncurredRow =
    variant === "costMixed" && onIncurredCostsChange !== undefined
  const dataRowCount = rows.length
  const gridRowCount = showIncurredRow ? dataRowCount + 1 : dataRowCount
  const isIncurredRowIndex = (rowIndex: number) =>
    showIncurredRow && rowIndex === dataRowCount

  const costBaseSum = useMemo(() => {
    if (variant !== "costMixed") return null
    let sum = normalizeIncurredCosts(incurredCosts)
    for (const row of rows) {
      const v = parseNumberField(row.likely)
      if (v !== null) sum += v
    }
    return sum
  }, [rows, variant, incurredCosts])

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      if (isIncurredRowIndex(row)) {
        const key = SCENARIO_COLUMN_KEYS[col]
        if (key === "name") {
          return {
            kind: GridCellKind.Text,
            displayData: "",
            data: t("projects.incurredCosts"),
            allowOverlay: false,
            readonly: true,
            contentAlign: "left",
          }
        }
        if (key === "optimistic" || key === "pessimistic") {
          return {
            kind: GridCellKind.Text,
            displayData: "",
            data: "",
            allowOverlay: false,
            readonly: true,
            contentAlign: "center",
          }
        }
        if (key === "likely") {
          const raw = incurredCosts === 0 ? "" : String(incurredCosts)
          const finalDisplay = formatWithThousands(raw, language)
          return {
            kind: GridCellKind.Text,
            displayData: finalDisplay,
            data: raw,
            copyData: raw,
            allowOverlay: !relationshipEditingActive && !readOnly,
            readonly: relationshipEditingActive || readOnly,
            contentAlign: "right",
            themeOverride: cellThemeOverride(
              INCURRED_COSTS_CELL_KEY,
              changedCellKeys,
              invalidCellKeys,
            ),
          }
        }
        return {
          kind: GridCellKind.Text,
          displayData: "",
          data: "",
          allowOverlay: false,
          readonly: true,
        }
      }

      const dataRow = rows[row]
      if (dataRow === undefined) {
        return {
          kind: GridCellKind.Text,
          displayData: "",
          data: "",
          allowOverlay: false,
          readonly: true,
        }
      }
      const key = SCENARIO_COLUMN_KEYS[col]
      if (key === undefined) {
        return {
          kind: GridCellKind.Text,
          displayData: "",
          data: "",
          allowOverlay: false,
          readonly: true,
        }
      }
      const value = dataRow[key] ?? ""
      const hideNameForImpactSlider =
        variant === "costMixed" &&
        col === 0 &&
        costImpactSliders?.active === true &&
        costImpactSliders.selectedDriverRowId !== null &&
        parseCostForSimulation(dataRow) !== null
      const indentNameForCorrelationSelect =
        variant === "costMixed" &&
        col === 0 &&
        costCorrelationMode?.active === true &&
        parseCostForSimulation(dataRow) !== null
      const blockCellEditing =
        readOnly || relationshipEditingActive || hideNameForImpactSlider
      const showAsPercent =
        usesCostTableLayout &&
        (variant === "driverMixed"
          ? key === "optimistic" || key === "likely" || key === "pessimistic"
          : key === "optimistic" || key === "pessimistic")
      const showAsAbsolute = variant === "costMixed" && key === "likely"
      const percentDisplay =
        showAsPercent && value !== "" ? `${value.replace(/%$/, "")} %` : value
      const baseDisplay = hideNameForImpactSlider
        ? ""
        : showAsAbsolute
          ? formatWithThousands(percentDisplay, language)
          : percentDisplay
      const finalDisplay =
        indentNameForCorrelationSelect && baseDisplay !== ""
          ? `\u2003${baseDisplay}`
          : indentNameForCorrelationSelect
            ? "\u2003"
            : baseDisplay
      const contentAlign =
        col === 0
          ? "left"
          : variant === "costMixed" && col === 2
            ? "right"
            : "center"
      const fieldKey = SCENARIO_COLUMN_KEYS[col]
      return {
        kind: GridCellKind.Text,
        displayData: finalDisplay,
        data: value,
        copyData: value,
        allowOverlay: !blockCellEditing,
        readonly: blockCellEditing,
        contentAlign,
        themeOverride: cellThemeOverride(
          `${dataRow.id}:${fieldKey}`,
          changedCellKeys,
          invalidCellKeys,
        ),
      }
    },
    [
      rows,
      variant,
      usesCostTableLayout,
      language,
      changedCellKeys,
      invalidCellKeys,
      showIncurredRow,
      dataRowCount,
      incurredCosts,
      t,
      costImpactSliders,
      costCorrelationMode?.active,
      relationshipEditingActive,
      readOnly,
    ],
  )

  const onCellEdited = useCallback(
    ([col, row]: Item, newValue: GridCell) => {
      if (readOnly || relationshipEditingActive) return
      if (newValue.kind !== GridCellKind.Text) return
      if (col >= SCENARIO_COLUMN_KEYS.length) return
      if (showIncurredRow && row === dataRowCount) {
        if (col !== 2 || !onIncurredCostsChange) return
        const raw = sanitizeScenarioNumericInput(newValue.data)
        const clamped = clampCostLikelyAbs(raw)
        const parsed = parseNumberField(clamped)
        onIncurredCostsChange(normalizeIncurredCosts(parsed ?? 0))
        return
      }
      const key = SCENARIO_COLUMN_KEYS[col]
      if (key === undefined) return
      const raw = newValue.data
      const nextVal =
        key === "name"
          ? raw.slice(0, NAME_MAX_LENGTH)
          : sanitizeScenarioNumericInput(raw)
      let normalizedVal = nextVal
      if (variant === "costMixed") {
        if (key === "optimistic") normalizedVal = clampCostOptimisticPercent(nextVal)
        else if (key === "likely") normalizedVal = clampCostLikelyAbs(nextVal)
        else if (key === "pessimistic")
          normalizedVal = clampCostPessimisticPercent(nextVal)
      } else if (variant === "driverMixed") {
        const dataRow = rows[row]
        if (dataRow === undefined) return
        if (key === "optimistic") normalizedVal = clampCostOptimisticPercent(nextVal)
        else if (key === "likely")
          normalizedVal = clampDriverLikelyPercent(
            nextVal,
            dataRow.optimistic,
            dataRow.pessimistic,
          )
        else if (key === "pessimistic")
          normalizedVal = clampCostPessimisticPercent(nextVal)
      }
      onRowsChange(patchScenarioRow(rows, row, { [key]: normalizedVal }))
    },
    [
      rows,
      onRowsChange,
      variant,
      onIncurredCostsChange,
      showIncurredRow,
      dataRowCount,
      relationshipEditingActive,
      readOnly,
    ],
  )

  const onPaste = useCallback(
    (target: Item, valueMatrix: readonly (readonly string[])[]) => {
      if (readOnly || relationshipEditingActive) return false
      const [startCol, startRow] = target
      if (startCol >= SCENARIO_COLUMN_KEYS.length) return false
      if (showIncurredRow && startRow >= dataRowCount) return false
      const matrix = valueMatrix.map((line) =>
        [...line].map((c) => c ?? ""),
      )
      let next = applyPastedGrid(
        rows,
        [...SCENARIO_COLUMN_KEYS],
        startRow,
        startCol,
        matrix,
        emptyScenarioRow,
      )
      const maxRows =
        variant === "costMixed"
          ? COST_MAX_ROWS
          : variant === "driverMixed"
            ? DRIVER_MAX_ROWS
            : undefined
      if (maxRows !== undefined && next.length > maxRows) {
        next = next.slice(0, maxRows)
      }
      next = next.map((r) => normalizePastedRow(r))
      if (variant === "costMixed") {
        next = next.map((r) => ({
          ...r,
          optimistic: clampCostOptimisticPercent(r.optimistic),
          likely: clampCostLikelyAbs(r.likely),
          pessimistic: clampCostPessimisticPercent(r.pessimistic),
        }))
      } else if (variant === "driverMixed") {
        next = next.map((r) => {
          const optimistic = clampCostOptimisticPercent(r.optimistic)
          const pessimistic = clampCostPessimisticPercent(r.pessimistic)
          return {
            ...r,
            optimistic,
            likely: clampDriverLikelyPercent(r.likely, optimistic, pessimistic),
            pessimistic,
          }
        })
      }
      onRowsChange(next)
      return false
    },
    [
      rows,
      onRowsChange,
      variant,
      showIncurredRow,
      dataRowCount,
      relationshipEditingActive,
      readOnly,
    ],
  )

  const onRowAppended = useCallback(() => {
    if (readOnly) return
    if (variant === "costMixed" && rows.length >= COST_MAX_ROWS) return
    if (variant === "driverMixed" && rows.length >= DRIVER_MAX_ROWS) return
    onRowsChange([...rows, emptyScenarioRow()])
  }, [rows, onRowsChange, variant, readOnly])

  const onDeleteSelectedRow = useCallback(() => {
    if (readOnly) return
    if (selectedRow === null) return
    if (selectedRow < 0 || selectedRow >= dataRowCount) return
    if (rows.length <= minRows) return
    onRowsChange(rows.filter((_, i) => i !== selectedRow))
  }, [selectedRow, dataRowCount, rows, minRows, onRowsChange, readOnly])

  const onGridSelectionChange = useCallback(
    (newSelection: GridSelection) => {
      if (
        showIncurredRow &&
        newSelection.current !== undefined &&
        selectionIncludesIncurredLockedCell(newSelection.current, dataRowCount)
      ) {
        return
      }
      setGridSelection(newSelection)
      const row = newSelection.current?.cell[1]
      if (row === undefined) {
        setSelectedRow(null)
      } else {
        setSelectedRow(row >= 0 ? row : null)
      }
    },
    [showIncurredRow, dataRowCount],
  )

  const onCellClicked = useCallback(
    (cell: Item) => {
      const [, row] = cell
      if (row < 0 || row >= dataRowCount) return
      const dataRow = rows[row]
      if (dataRow === undefined) return

      // Archived/read-only: allow selection for inspection modes; block other clicks.
      if (defineMode?.active) {
        if (!isMeaningfullyFilledRow(dataRow)) return
        defineMode.onSelectRow(dataRow.id)
        return
      }

      if (costCorrelationMode?.active && variant === "costMixed") {
        if (parseCostForSimulation(dataRow) === null) return
        costCorrelationMode.onToggleCostSelection(dataRow.id)
        return
      }

      if (driverImpactMode?.active && variant === "driverMixed") {
        if (parseDriverForSimulation(dataRow) === null) return
        driverImpactMode.onSelectDriver(dataRow.id)
        return
      }

      if (readOnly) return
    },
    [
      costCorrelationMode,
      defineMode,
      driverImpactMode,
      variant,
      dataRowCount,
      rows,
      readOnly,
    ],
  )

  const getRowThemeOverride = useCallback(
    (row: number) => {
      if (defineMode?.active && defineMode.selectedRowId !== null) {
        const dataRow = rows[row]
        if (dataRow?.id === defineMode.selectedRowId) {
          return {
            bgCell: CHANGED_VS_SIM_CELL_BG,
            bgCellMedium: CHANGED_VS_SIM_CELL_BG,
          }
        }
      }

      if (costCorrelationMode?.active && variant === "costMixed") {
        const dataRow = rows[row]
        if (dataRow === undefined) return undefined
        if (!correlationSelectedIdSet.has(dataRow.id)) return undefined
        return {
          bgCell: CHANGED_VS_SIM_CELL_BG,
          bgCellMedium: CHANGED_VS_SIM_CELL_BG,
        }
      }

      if (
        !driverImpactMode?.active ||
        variant !== "driverMixed" ||
        driverImpactMode.selectedDriverRowId === null
      ) {
        return undefined
      }
      const dataRow = rows[row]
      if (dataRow?.id !== driverImpactMode.selectedDriverRowId) return undefined
      return {
        bgCell: CHANGED_VS_SIM_CELL_BG,
        bgCellMedium: CHANGED_VS_SIM_CELL_BG,
      }
    },
    [
      costCorrelationMode,
      correlationSelectedIdSet,
      defineMode,
      driverImpactMode,
      variant,
      rows,
    ],
  )

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      const t = event.target
      if (!(t instanceof Node)) return
      if (tableSectionRef.current?.contains(t)) return
      const portal = document.getElementById("portal")
      if (portal?.contains(t)) return
      setGridSelection(emptyGridSelection)
      setSelectedRow(null)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  const updateHelpTooltipPosition = useCallback(() => {
    const trigger = helpTriggerRef.current
    if (!trigger) return
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = helpTooltipRef.current?.getBoundingClientRect()
    const tooltipWidth = tooltipRect?.width ?? 320
    const tooltipHeight = tooltipRect?.height ?? 72
    const viewportPad = 8
    const gap = 6

    let left = triggerRect.right - tooltipWidth
    left = Math.max(viewportPad, Math.min(left, window.innerWidth - tooltipWidth - viewportPad))

    let top = triggerRect.top - tooltipHeight - gap
    if (top < viewportPad) {
      top = Math.min(
        triggerRect.bottom + gap,
        window.innerHeight - tooltipHeight - viewportPad,
      )
    }

    setHelpTooltipPosition({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!helpTooltipOpen) return
    updateHelpTooltipPosition()
  }, [helpTooltipOpen, updateHelpTooltipPosition, toolbarHelpText, toolbarHelpGuideHint])

  useEffect(() => {
    if (!helpTooltipOpen) return
    const onViewportChange = () => updateHelpTooltipPosition()
    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onViewportChange, true)
    return () => {
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onViewportChange, true)
    }
  }, [helpTooltipOpen, updateHelpTooltipPosition])

  const drawCostHeader: DrawHeaderCallback = useCallback((args, draw) => {
      draw()
      const idx = args.columnIndex
      if (idx !== 1 && idx !== 2 && idx !== 3) return

      const { ctx, rect, column, theme, isSelected, hasSelectedCell, hoverAmount } =
        args
      const { x, y, width, height } = rect
      const xOffset = 1
      const headerFont = `${theme.headerFontStyle} ${theme.fontFamily}`

      ctx.save()
      if (isSelected) {
        ctx.fillStyle = theme.accentColor
      } else if (hasSelectedCell) {
        ctx.fillStyle = theme.bgHeaderHasFocus
      } else {
        ctx.fillStyle = theme.bgHeader
      }
      ctx.fillRect(x + xOffset, y, width - xOffset, height)

      if (!isSelected && hoverAmount > 0) {
        ctx.globalAlpha = hoverAmount
        ctx.fillStyle = theme.bgHeaderHovered
        ctx.fillRect(x + xOffset, y, width - xOffset, height)
        ctx.globalAlpha = 1
      }

      ctx.font = headerFont
      ctx.fillStyle = isSelected ? theme.textHeaderSelected : theme.textHeader
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(
        column.title,
        x + width / 2,
        y + height / 2,
      )
      ctx.textAlign = "left"
      ctx.restore()
  }, [])

  const bodyPx = Math.max(1, gridRowCount) * ROW_HEIGHT
  const height = HEADER_HEIGHT + bodyPx

  const hasMeta = title != null || description != null
  const maxRowsReached =
    (variant === "costMixed" && rows.length >= COST_MAX_ROWS) ||
    (variant === "driverMixed" && rows.length >= DRIVER_MAX_ROWS)
  const hasTableData =
    rows.some(
      (row) =>
        row.name.trim() !== "" ||
        row.optimistic.trim() !== "" ||
        row.likely.trim() !== "" ||
        row.pessimistic.trim() !== "",
    ) ||
    (showIncurredRow && normalizeIncurredCosts(incurredCosts) > 0)
  const requestConfirm = (message: string, onConfirm: () => void) => {
    confirmActionRef.current = onConfirm
    setConfirmMessage(message)
    setConfirmOpen(true)
  }
  const clearTableRows = () => {
    if (readOnly || !hasTableData) return
    requestConfirm(t("inputs.clearTableConfirm"), () => {
      onRowsChange(rows.map(() => emptyScenarioRow()))
      onIncurredCostsChange?.(0)
    })
  }

  return (
    <section
      id={tableId}
      className={cn(hasMeta ? "space-y-3" : "space-y-0")}
      aria-label={title ?? tableId}
    >
      <ConfirmDialog
        open={confirmOpen}
        message={confirmMessage}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.confirm")}
        onCancel={() => {
          confirmActionRef.current = null
          setConfirmOpen(false)
        }}
        onConfirm={() => {
          const action = confirmActionRef.current
          confirmActionRef.current = null
          setConfirmOpen(false)
          action?.()
        }}
      />
      {title ? <h2 className="section-heading">{title}</h2> : null}
      {description ? (
        <div className="section-body">{description}</div>
      ) : null}
      <div ref={tableSectionRef} className="space-y-0">
        <div className="space-y-1.5" data-guided-mode-toolbar="">
        {(() => {
            const showCorrelationReturn =
              variant === "costMixed" &&
              costCorrelationMode?.active === true &&
              costCorrelationMode.onReturnToGuided != null
            const showImpactReturn =
              variant === "driverMixed" &&
              driverImpactMode?.active === true &&
              driverImpactMode.onReturnToGuided != null
            const showTableHandoffReturn =
              guidedInputMode?.onReturnToGuided != null &&
              !showCorrelationReturn &&
              !showImpactReturn
            const showGuidedReturn =
              showCorrelationReturn || showImpactReturn || showTableHandoffReturn
            const guidedReturnKind = showCorrelationReturn
              ? "correlation"
              : showImpactReturn
                ? "impact"
                : variant === "costMixed"
                  ? "costItems"
                  : "drivers"
            const onGuidedReturn = showCorrelationReturn
              ? costCorrelationMode!.onReturnToGuided
              : showImpactReturn
                ? driverImpactMode?.onReturnToGuided
                : guidedInputMode?.onReturnToGuided
            const returnButtonClassName = buttonVariants({
              variant: "outline",
              className:
                "h-8 border-[#1d868c]/45 px-2.5 text-[11px] text-[#1d868c] hover:bg-[#1d868c]/10 hover:text-[#1d868c]",
            })
            return (
              <>
                {showGuidedReturn ? (
                  <div
                    className="flex w-full justify-end sm:hidden"
                    data-guided-return-row=""
                  >
                    <button
                      type="button"
                      onClick={onGuidedReturn}
                      className={returnButtonClassName}
                      data-guided-return={guidedReturnKind}
                    >
                      {t("inputs.guidedReturnToReview")}
                    </button>
                  </div>
                ) : null}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            {showRelationshipSelectHint ? (
              <p className="section-body text-[11px] text-muted-foreground/80">
                {t("inputs.driverImpactSelectHint")}
              </p>
            ) : null}
            {showDefineSelectHint ? (
              <p className="section-body text-[11px] text-muted-foreground/80">
                {t(
                  readOnly
                    ? "inputs.defineSelectHintReadOnly"
                    : "inputs.defineSelectHint",
                )}
              </p>
            ) : null}
            {costCorrelationMode?.active &&
            costCorrelationMode.savedSummaries.length > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {(() => {
                  const nameById = new Map(
                    rows.map((row, index) => [
                      row.id,
                      row.name.trim() ||
                        (language === "no"
                          ? `Kost ${index + 1}`
                          : `Cost ${index + 1}`),
                    ]),
                  )
                  return costCorrelationMode.savedSummaries.map((summary) => {
                    const label = formatSavedCorrelationSummaryLabel({
                      summary,
                      nameById,
                      language,
                      costItemsWord: t("inputs.costCorrelationCostItemsWord"),
                    })
                    return (
                      <div
                        key={summary.id}
                        className={cn(
                          "group/corr-summary relative inline-flex max-w-full items-center",
                          "rounded border border-border/70 bg-background",
                          "hover:border-[#1d868c]/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            costCorrelationMode.onOpenSummary(summary.rowIds)
                          }
                          aria-label={t(
                            "inputs.costCorrelationOpenSummary",
                          ).replace("{summary}", label)}
                          className={cn(
                            "min-w-0 truncate py-0.5 pl-2 pr-5 text-left",
                            "font-sans text-[11px] leading-snug text-muted-foreground",
                            "hover:text-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                          )}
                        >
                          {label}
                        </button>
                        {!readOnly ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            costCorrelationMode.onRemoveSummary(summary.rowIds)
                          }}
                          aria-label={t("inputs.costCorrelationRemove")}
                          title={t("inputs.costCorrelationRemove")}
                          className={cn(
                            "corr-summary-remove absolute right-0.5 top-0.5",
                            "flex size-3.5 items-center justify-center rounded-sm",
                            "text-muted-foreground/70 hover:bg-muted hover:text-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                          )}
                        >
                          <X className="size-2.5" strokeWidth={2.25} aria-hidden />
                        </button>
                        ) : null}
                      </div>
                    )
                  })
                })()}
              </div>
            ) : null}
            {costCorrelationMode?.active &&
            costCorrelationMode.saveConfirmVisible ? (
              <p
                role="status"
                aria-live="polite"
                className="section-body flex items-center gap-1 text-[11px] text-[#1d868c] motion-safe:transition-opacity motion-safe:duration-200"
              >
                <Check className="size-3.5 shrink-0" aria-hidden />
                <span>
                  {costCorrelationMode.saveConfirmKind === "removed"
                    ? t("inputs.costCorrelationRemoved")
                    : t("inputs.costCorrelationSaved")}
                </span>
              </p>
            ) : null}
            {showCorrelationSelectInstruction ? (
              <p className="section-body text-[11px] text-muted-foreground/80">
                {t("inputs.costCorrelationSelectHint")}
              </p>
            ) : null}
            {showCorrelationGroupControls && costCorrelationMode ? (
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="section-body shrink-0 text-[11px] tabular-nums text-muted-foreground/80">
                  {t("inputs.costCorrelationSelectedCount").replace(
                    "{count}",
                    String(correlationSelectedCount),
                  )}
                </span>
                <span className="section-body shrink-0 text-[11px] text-muted-foreground/80">
                  {t("expanders.costCorrelation")}
                </span>
                <InlineMagnitudeSlider
                  min={-0.9}
                  max={0.9}
                  step={0.1}
                  value={costCorrelationMode.pendingRho}
                  origin={0}
                  ariaLabel={t("expanders.costCorrelation")}
                  onChange={(next) => {
                    if (readOnly) return
                    costCorrelationMode.onPendingRhoChange(
                      snapCorrelationCoefficient(next),
                    )
                  }}
                  disabled={readOnly}
                />
                <span className="section-body w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                  {formatCorrelationControlValue(
                    costCorrelationMode.pendingRho,
                    language,
                    costCorrelationMode.pendingMixed,
                  )}
                </span>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={costCorrelationMode.onApplyGroupCorrelation}
                    disabled={costCorrelationMode.pendingMixed}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: cn(
                        "h-7 px-2.5 text-[11px]",
                        "border-[#1d868c]/45 text-[#1d868c] hover:bg-[#1d868c]/10 hover:text-[#1d868c]",
                        "disabled:opacity-40",
                      ),
                    })}
                  >
                    {t("inputs.costCorrelationApply")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
                <div className="flex shrink-0 items-center gap-2">
                  {showGuidedReturn ? (
                    <button
                      type="button"
                      onClick={onGuidedReturn}
                      className={cn(returnButtonClassName, "hidden sm:inline-flex")}
                      data-guided-return={guidedReturnKind}
                    >
                      {t("inputs.guidedReturnToReview")}
                    </button>
                  ) : null}
            {guidedInputMode && !readOnly ? (
              <button
                type="button"
                onClick={guidedInputMode.onOpen}
                aria-pressed={guidedInputMode.active}
                title={t("inputs.openFocusMode")}
                aria-label={t("inputs.openFocusMode")}
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                  className: cn(
                    guidedInputMode.active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ),
                })}
              >
                <Play className="size-4" aria-hidden />
              </button>
            ) : null}
            {defineMode ? (
              <button
                type="button"
                onClick={defineMode.onToggle}
                aria-pressed={defineMode.active}
                title={
                  readOnly
                    ? t("inputs.defineViewDetails")
                    : t("expanders.define")
                }
                aria-label={
                  readOnly
                    ? t("inputs.defineViewDetails")
                    : t("expanders.define")
                }
                className={buttonVariants({
                  variant: defineMode.active ? "outline" : "ghost",
                  size: "icon-sm",
                  className: cn(
                    defineMode.active
                      ? "border-[#1d868c]/45 bg-[#1d868c]/10 text-[#1d868c] hover:bg-[#1d868c]/15 hover:text-[#1d868c]"
                      : "text-muted-foreground hover:text-foreground",
                  ),
                })}
              >
                <FileText className="size-4" aria-hidden />
              </button>
            ) : null}
            {variant === "costMixed" && costCorrelationMode ? (
              <button
                type="button"
                onClick={costCorrelationMode.onToggle}
                aria-pressed={costCorrelationMode.active}
                title={t("expanders.costCorrelation")}
                aria-label={t("expanders.costCorrelation")}
                className={buttonVariants({
                  variant: costCorrelationMode.active ? "outline" : "ghost",
                  size: "icon-sm",
                  className: cn(
                    costCorrelationMode.active
                      ? "border-[#1d868c]/45 bg-[#1d868c]/10 text-[#1d868c] hover:bg-[#1d868c]/15 hover:text-[#1d868c]"
                      : "text-muted-foreground hover:text-foreground",
                  ),
                })}
              >
                <Link2 className="size-4" aria-hidden />
              </button>
            ) : null}
            {variant === "driverMixed" && driverImpactMode ? (
              <button
                type="button"
                onClick={driverImpactMode.onToggle}
                aria-pressed={driverImpactMode.active}
                title={t("expanders.driverImpact")}
                aria-label={t("expanders.driverImpact")}
                className={buttonVariants({
                  variant: driverImpactMode.active ? "outline" : "ghost",
                  size: "icon-sm",
                  className: cn(
                    driverImpactMode.active
                      ? "border-[#1d868c]/45 bg-[#1d868c]/10 text-[#1d868c] hover:bg-[#1d868c]/15 hover:text-[#1d868c]"
                      : "text-muted-foreground hover:text-foreground",
                  ),
                })}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearTableRows}
              aria-label={t("inputs.clearTableTooltip")}
              title={t("inputs.clearTableTooltip")}
              disabled={readOnly || !hasTableData}
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className:
                  "text-muted-foreground hover:text-foreground disabled:opacity-40",
              })}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onRowAppended}
              aria-label={t("inputs.addRow")}
              title={t("inputs.addRow")}
              disabled={readOnly || maxRowsReached}
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className:
                  "text-muted-foreground hover:text-foreground disabled:opacity-40",
              })}
            >
              <Plus className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDeleteSelectedRow}
              disabled={
                readOnly || selectedRow === null || rows.length <= minRows
              }
              aria-label={t("inputs.deleteSelectedRow")}
              title={t("inputs.deleteSelectedRow")}
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted-foreground hover:text-foreground",
              })}
            >
              <Minus className="size-4" aria-hidden />
            </button>
            {toolbarHelpText ? (
              <span
                className="relative inline-flex shrink-0"
                onMouseEnter={() => setHelpTooltipOpen(true)}
                onMouseLeave={() => setHelpTooltipOpen(false)}
                onFocusCapture={() => setHelpTooltipOpen(true)}
                onBlurCapture={(event) => {
                  const next = event.relatedTarget
                  if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
                    setHelpTooltipOpen(false)
                  }
                }}
              >
                <button
                  ref={helpTriggerRef}
                  type="button"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon-sm",
                    className:
                      "text-muted-foreground/55 hover:text-muted-foreground",
                  })}
                  aria-label={
                    toolbarHelpGuideHint
                      ? `${toolbarHelpText} ${t("inputs.guidanceUseGuide")} ${toolbarHelpGuideHint}`
                      : toolbarHelpText
                  }
                >
                  <HelpCircle className="size-4 stroke-[1.25]" aria-hidden />
                </button>
                {helpTooltipOpen && typeof document !== "undefined"
                  ? createPortal(
                      <span
                        ref={helpTooltipRef}
                        role="tooltip"
                        className="pointer-events-none fixed z-[120] w-max max-w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border/70 bg-card px-2.5 py-2 text-left text-[11px] leading-snug text-muted-foreground shadow-sm"
                        style={{
                          top: `${helpTooltipPosition.top}px`,
                          left: `${helpTooltipPosition.left}px`,
                        }}
                      >
                        <span className="block">{toolbarHelpText}</span>
                        {toolbarHelpGuideHint ? (
                          <span className="mt-1.5 flex items-center gap-1">
                            <span>{t("inputs.guidanceUseGuide")}</span>
                            <Play
                              className="size-3 shrink-0 fill-[#1d868c] text-[#1d868c]"
                              aria-hidden
                            />
                            <span>{toolbarHelpGuideHint}</span>
                          </span>
                        ) : null}
                      </span>,
                      document.body,
                    )
                  : null}
              </span>
            ) : null}
                </div>
        </div>
              </>
            )
          })()}
        </div>
        {variant === "costMixed" &&
        costCorrelationMode?.active &&
        costCorrelationMode.incompatibleEditWarning ? (
          <div className="mb-2 rounded border border-[#c24141]/35 bg-[#c24141]/8 px-2.5 py-1.5">
            <p className="font-sans text-[11px] leading-snug text-[#c24141]">
              {t("inputs.costCorrelationIncompatibleEdit")}
            </p>
          </div>
        ) : null}
        {variant === "costMixed" &&
        costCorrelationMode?.active &&
        (costCorrelationMode.prepStatus?.kind === "repaired" ||
          costCorrelationMode.prepStatus?.kind === "fallback_identity") ? (
          <div className="mb-2 rounded border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5">
            <p className="font-sans text-[11px] leading-snug text-amber-900 dark:text-amber-200">
              {costCorrelationMode.prepStatus.kind === "repaired"
                ? t("inputs.costCorrelationWarningRepaired")
                : t("inputs.costCorrelationWarningFallback")}
            </p>
          </div>
        ) : null}
        <div
          ref={hostRef}
          className="relative w-full min-w-0 overflow-x-hidden rounded-md border border-border bg-card"
        >
          <DataEditor
            className="gdg-minimal block max-w-none min-w-0"
            columns={columns}
            rows={gridRowCount}
            width={gridWidth}
            overscrollX={0}
            theme={tableTheme}
            drawHeader={usesCostTableLayout ? drawCostHeader : undefined}
            getCellContent={getCellContent}
            onCellEdited={readOnly ? undefined : onCellEdited}
            onCellClicked={onCellClicked}
            onCellActivated={onCellClicked}
            getRowThemeOverride={getRowThemeOverride}
            gridSelection={gridSelection}
            onGridSelectionChange={onGridSelectionChange}
            onPaste={readOnly ? undefined : onPaste}
            getCellsForSelection={true}
            rowHeight={ROW_HEIGHT}
            headerHeight={HEADER_HEIGHT}
            height={height}
            rangeSelect="multi-rect"
            rowMarkers="none"
            fillHandle={false}
            smoothScrollY
            keybindings={{
              downFill: false,
              rightFill: false,
              search: false,
            }}
          />
          {variant === "driverMixed" &&
          (driverLikelySpanRows.length > 0 ||
            driverSupportInvalidRows.length > 0) ? (
            <div className="space-y-1 border-t border-border/70 bg-background px-2 py-2">
              {driverLikelySpanRows.map(({ row }) => (
                <div
                  key={`order-${row.id}`}
                  role="alert"
                  className="rounded-md border border-[#c24141]/40 bg-background px-2.5 py-1.5"
                >
                  <p className="text-[11px] font-medium leading-snug text-[#c24141]">
                    {t("inputs.driverLikelyOutsideSpan").replace(
                      "{driverName}",
                      row.name.trim() || "—",
                    )}
                  </p>
                </div>
              ))}
              {driverSupportInvalidRows.map(({ row }) => (
                <div
                  key={`support-${row.id}`}
                  role="alert"
                  className="rounded-md border border-[#c24141]/40 bg-background px-2.5 py-1.5"
                >
                  <p className="text-[11px] font-medium leading-snug text-[#c24141]">
                    {t("inputs.driverCalibratedSupportInvalid").replace(
                      "{driverName}",
                      row.name.trim() || "—",
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {variant === "costMixed" &&
          costImpactSliders?.active &&
          costImpactSliders.selectedDriverRowId &&
          costColumnWidths !== null
            ? rows.map((row, rowIndex) => {
                if (parseCostForSimulation(row) === null) return null
                const driverId = costImpactSliders.selectedDriverRowId!
                const impactValue = resolveDriverImpactPercentForSlider(
                  costImpactSliders.driverImpacts?.[driverId]?.[row.id],
                )
                const cellKey = driverImpactCellKey(driverId, row.id)
                const isChanged =
                  costImpactSliders.changedCellKeys !== undefined &&
                  costImpactSliders.changedCellKeys.size > 0 &&
                  costImpactSliders.changedCellKeys.has(cellKey)
                const label = row.name.trim() || `Kost ${rowIndex + 1}`
                return (
                  <div
                    key={row.id}
                    className="pointer-events-none absolute left-0 z-20 flex min-w-0 items-center gap-1 px-1.5"
                    style={{
                      top: HEADER_HEIGHT + rowIndex * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                      width: costColumnWidths[0],
                      backgroundColor: isChanged
                        ? CHANGED_VS_SIM_CELL_BG
                        : undefined,
                    }}
                  >
                    <InlineMagnitudeSlider
                      min={0}
                      max={100}
                      step={10}
                      value={impactValue}
                      origin={0}
                      ariaLabel={t("inputs.driverImpactCellLabel")
                        .replace(
                          "{driver}",
                          costImpactSliders.selectedDriverLabel ?? "",
                        )
                        .replace("{cost}", label)}
                      onChange={(next) => {
                        if (readOnly) return
                        costImpactSliders.onImpactChange(
                          driverId,
                          row.id,
                          snapDriverImpactPercent(next),
                        )
                      }}
                      disabled={readOnly}
                    />
                    <span className={INLINE_SLIDER_VALUE_CLASS}>
                      {impactValue}%
                    </span>
                    <span className={INLINE_SLIDER_NAME_CLASS} title={label}>
                      {label}
                    </span>
                  </div>
                )
              })
            : null}
          {variant === "costMixed" &&
          costCorrelationMode?.active &&
          costColumnWidths !== null
            ? rows.map((row, rowIndex) => {
                if (parseCostForSimulation(row) === null) return null
                const selected = correlationSelectedIdSet.has(row.id)
                const label = row.name.trim() || `Kost ${rowIndex + 1}`
                return (
                  <button
                    key={`corr-select-${row.id}`}
                    type="button"
                    aria-pressed={selected}
                    aria-label={t("inputs.costCorrelationToggleRow").replace(
                      "{cost}",
                      label,
                    )}
                    className="pointer-events-auto absolute left-0 z-20 flex items-center justify-center px-1.5"
                    style={{
                      top: HEADER_HEIGHT + rowIndex * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                      width: 28,
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      costCorrelationMode.onToggleCostSelection(row.id)
                    }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-[3px] border text-[9px] leading-none",
                        selected
                          ? "border-[#1d868c] bg-[#1d868c] text-white"
                          : "border-border/80 bg-background text-transparent",
                      )}
                    >
                      ✓
                    </span>
                  </button>
                )
              })
            : null}
          {showIncurredRow && costColumnWidths !== null ? (
            <div
              className="pointer-events-none absolute left-0 z-20 flex items-center px-2"
              style={{
                top: HEADER_HEIGHT + dataRowCount * ROW_HEIGHT,
                height: ROW_HEIGHT,
                width: costColumnWidths[0],
              }}
            >
              <div className="pointer-events-auto min-w-0 max-w-full">
                <LabelHelpTooltip
                  label={t("projects.incurredCosts")}
                  tooltip={t("projects.incurredCostsTooltip")}
                  labelClassName="text-[12px] font-normal leading-none text-[rgba(115,116,131,0.95)]"
                />
              </div>
            </div>
          ) : null}
          {costColumnWidths !== null && costBaseSum !== null ? (
            <div
              role="row"
              aria-label={t("keyMetrics.baseCost")}
              className="grid box-border border-t-2 border-[rgba(15,23,42,0.18)] bg-[#FAFAFA] text-[12px] font-normal text-[rgba(115,116,131,0.95)]"
              style={{
                gridTemplateColumns: `${costColumnWidths[0]}px ${costColumnWidths[1]}px ${costColumnWidths[2]}px ${costColumnWidths[3]}px`,
                height: ROW_HEIGHT,
              }}
            >
              <div className="flex h-full min-w-0 items-center truncate px-2 pr-1 text-left leading-none">
                <LabelHelpTooltip
                  label={t("keyMetrics.baseCost")}
                  tooltip={t("keyMetrics.baseCostTooltip")}
                  labelClassName="font-normal leading-none text-[rgba(115,116,131,0.95)]"
                />
              </div>
              <div className="min-h-0" aria-hidden />
              <div className="box-border flex h-full items-center justify-end px-2 text-[12px] font-normal leading-none">
                {formatWithThousands(String(costBaseSum), language)}
              </div>
              <div className="min-h-0" aria-hidden />
            </div>
          ) : null}
          {defineMode?.active && costColumnWidths !== null
            ? rows.map((row, rowIndex) => {
                if (!isMeaningfullyFilledRow(row)) return null
                const hasDefinition =
                  variant === "costMixed"
                    ? costRowHasDefinition(row as CostElementRow)
                    : variant === "driverMixed"
                      ? driverRowHasDefinition(row as DriverRow)
                      : false
                const isSelected = defineMode.selectedRowId === row.id
                const top = HEADER_HEIGHT + rowIndex * ROW_HEIGHT
                if (hasDefinition) {
                  return (
                    <button
                      key={`define-indicator-${row.id}`}
                      type="button"
                      ref={(el) => {
                        if (el) defineIconRefs.current.set(row.id, el)
                        else defineIconRefs.current.delete(row.id)
                      }}
                      data-define-indicator={row.id}
                      className={cn(
                        "absolute z-20 flex items-center justify-center rounded-sm",
                        "text-[#1d868c]/70 hover:text-[#1d868c] hover:bg-[#1d868c]/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                      )}
                      style={{
                        top,
                        height: ROW_HEIGHT,
                        right: 4,
                        width: 16,
                      }}
                      aria-label={t("inputs.defineDefinedIndicator")}
                      onMouseEnter={(event) => {
                        scheduleDefinePreviewOpen(
                          row.id,
                          event.currentTarget,
                        )
                      }}
                      onMouseLeave={() => {
                        scheduleDefinePreviewClose()
                      }}
                      onFocus={(event) => {
                        scheduleDefinePreviewOpen(
                          row.id,
                          event.currentTarget,
                        )
                      }}
                      onBlur={() => {
                        scheduleDefinePreviewClose()
                      }}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        clearDefinePreviewTimers()
                        setDefinePreviewRowId(null)
                        defineMode.onSelectRow(row.id)
                      }}
                    >
                      <FileText className="size-3" strokeWidth={2} aria-hidden />
                    </button>
                  )
                }
                if (isSelected) {
                  return (
                    <span
                      key={`define-anchor-${row.id}`}
                      ref={defineFallbackAnchorRef}
                      data-define-row-anchor={row.id}
                      className="pointer-events-none absolute z-10"
                      style={{
                        top,
                        height: ROW_HEIGHT,
                        right: 4,
                        width: 16,
                      }}
                      aria-hidden
                    />
                  )
                }
                return null
              })
            : null}
        </div>
        {defineSelectedRow && defineMode?.active ? (
          <DefineRowPopover
            open
            anchorKey={`${defineSelectedRow.id}:${defineSelectedHasIcon ? "icon" : "fallback"}`}
            getAnchor={getDefinePopoverAnchor}
            onAnchorLost={() => defineMode.onClearSelection()}
            className={
              variant === "driverMixed"
                ? "w-[min(40rem,calc(100vw-1.5rem))] max-h-[min(70vh,36rem)] overflow-y-auto"
                : undefined
            }
            popoverKind={
              variant === "driverMixed"
                ? "driver"
                : variant === "costMixed"
                  ? "cost"
                  : undefined
            }
          >
            {variant === "costMixed" ? (
              <DefineRowEditor
                kind="cost"
                readOnly={readOnly}
                rowId={defineSelectedRow.id}
                rowLabel={
                  defineSelectedRow.name.trim() ||
                  (language === "no" ? "Kostnadspost" : "Cost item")
                }
                description={
                  (defineSelectedRow as CostElementRow).description ?? ""
                }
                onCancel={() => defineMode.onClearSelection()}
                onSave={
                  readOnly
                    ? undefined
                    : (description) => {
                        onRowsChange(
                          rows.map((row) =>
                            row.id === defineSelectedRow.id
                              ? withCostDescription(
                                  row as CostElementRow,
                                  description,
                                )
                              : row,
                          ),
                        )
                        defineMode.onClearSelection()
                      }
                }
              />
            ) : variant === "driverMixed" ? (
              <DefineRowEditor
                kind="driver"
                readOnly={readOnly}
                rowId={defineSelectedRow.id}
                rowLabel={
                  defineSelectedRow.name.trim() ||
                  (language === "no" ? "Driver" : "Driver")
                }
                description={
                  (defineSelectedRow as DriverRow).description ?? ""
                }
                uncertaintyNotes={
                  (defineSelectedRow as DriverRow).uncertaintyNotes
                }
                onCancel={() => defineMode.onClearSelection()}
                onSave={
                  readOnly
                    ? undefined
                    : ({ description, uncertaintyNotes }) => {
                        onRowsChange(
                          rows.map((row) => {
                            if (row.id !== defineSelectedRow.id) return row
                            return withDriverUncertaintyNotes(
                              withDriverDescription(
                                row as DriverRow,
                                description,
                              ),
                              uncertaintyNotes,
                            )
                          }),
                        )
                        defineMode.onClearSelection()
                      }
                }
              />
            ) : null}
          </DefineRowPopover>
        ) : null}
        {defineMode?.active &&
        definePreviewRowId !== null &&
        definePreviewText !== "" ? (
          <DefineRowPreviewTooltip
            open
            anchorKey={definePreviewRowId}
            getAnchor={getDefinePreviewAnchor}
            text={definePreviewText}
          />
        ) : null}
      </div>
    </section>
  )
}
