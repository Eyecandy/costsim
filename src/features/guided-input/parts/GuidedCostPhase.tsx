import { useI18n } from "@/i18n/useI18n"
import {
  GUIDED_COST_P10_SLIDER,
  GUIDED_COST_P90_SLIDER,
  deriveGuidedCostEffect,
  formatGuidedApproxImpactLabel,
  formatGuidedCostAbsolute,
  formatGuidedSignedPercent,
  guidedPercentToStoredString,
  guidedSliderDisplayValue,
  normalizeGuidedNumericField,
  type GuidedNumericField,
} from "@/domain/guided/guidedInput"
import { COST_DESCRIPTION_MAX_LENGTH } from "@/domain/results/rowDefinitions"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { parseNumberField } from "@/domain/results/tableRows"
import {
  sideCardClassName,
  modeCardClassName,
  rangeGridClassName,
} from "@/features/guided-input/parts/guidedInputStyles"
import { GuidedRangeSlider } from "@/features/guided-input/parts/GuidedRangeSlider"
import { GuidedDefinitionTextarea } from "@/features/guided-input/parts/GuidedDefinitionTextarea"
import { GuidedInlineValue } from "@/features/guided-input/parts/GuidedInlineValue"
import {
  SideLabel,
  SecondaryEffect,
  SecondarySpacer,
} from "@/features/guided-input/parts/GuidedSidePieces"

export function GuidedCostPhase({
  row,
  onPatchRow,
}: {
  row: CostElementRow
  onPatchRow: (rowId: string, patch: Partial<CostElementRow & DriverRow>) => void
}) {
  const { t, language } = useI18n()

  const costOptBlank = parseNumberField(row.optimistic) === null
  const costPesBlank = parseNumberField(row.pessimistic) === null
  const costLikelyBlank = parseNumberField(row.likely) === null
  const costOptSlider = guidedSliderDisplayValue(row.optimistic, GUIDED_COST_P10_SLIDER.max)
  const costPesSlider = guidedSliderDisplayValue(row.pessimistic, GUIDED_COST_P90_SLIDER.min)
  const costP10Effect = deriveGuidedCostEffect(row.likely, row.optimistic)
  const costP90Effect = deriveGuidedCostEffect(row.likely, row.pessimistic)
  const costMAbs = parseNumberField(row.likely)

  const patchNumeric = (field: GuidedNumericField, value: string) => {
    const normalized = normalizeGuidedNumericField({
      kind: "cost",
      field,
      value,
      row,
    })
    onPatchRow(row.id, { [field]: normalized })
  }

  const commitPercentField = (field: GuidedNumericField, value: number) => {
    patchNumeric(field, guidedPercentToStoredString(value))
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="cost">
      <h3
        className="m-0 font-sans text-[22px] font-medium leading-snug tracking-tight text-foreground sm:text-[26px]"
        data-guided-factor-name=""
      >
        {row.name.trim() || t("inputs.guidedUnnamed")}
      </h3>

      <div className="space-y-1.5">
        <label
          htmlFor="guided-definition"
          className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          {t("inputs.guidedDefinitionLabel")}
        </label>
        <GuidedDefinitionTextarea
          rowId={row.id}
          sourceDescription={String(row.description ?? "")}
          maxLength={COST_DESCRIPTION_MAX_LENGTH}
          placeholder={t("inputs.defineCostDescriptionPlaceholder")}
          onCommit={(id, description) => {
            onPatchRow(id, { description })
          }}
        />
      </div>

      <div className="space-y-1.5" data-guided-cost-uncertainty="">
        <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("inputs.guidedDriverUncertaintyNotesHeading")}
        </p>
        <ul className="m-0 list-disc space-y-1.5 pl-4 marker:text-muted-foreground">
          <li className="font-sans text-[13px] leading-snug text-muted-foreground">
            {t("inputs.guidedCostLikelyPrompt")}
          </li>
          <li className="font-sans text-[13px] leading-snug text-muted-foreground">
            {t("inputs.guidedCostRangeSourcePrompt")}
          </li>
          <li className="font-sans text-[13px] leading-snug text-muted-foreground">
            {t("inputs.guidedCostRangePrompt")}
          </li>
        </ul>
        <p className="m-0 mt-2 font-sans text-[12px] leading-snug text-muted-foreground">
          {t("inputs.guidedCostRangeReminder")}
        </p>

        <div
          className={`${rangeGridClassName} pt-3`}
          data-guided-cost-range=""
          data-guided-omp-align="primary"
        >
          <div className={sideCardClassName} data-guided-side="p10">
            <SideLabel>{t("inputs.guidedP10")}</SideLabel>
            <GuidedInlineValue
              rowId={row.id}
              field="optimistic"
              rawValue={row.optimistic}
              displayText={costOptBlank ? "—" : formatGuidedSignedPercent(costOptSlider, language)}
              ariaLabel={t("inputs.guidedP10")}
              displayAttrs={{ "data-guided-cost-p10-pct": "" }}
              commitMode="enter"
              onCommit={(next) => patchNumeric("optimistic", next)}
            />
            <SecondaryEffect
              text={formatGuidedApproxImpactLabel(costP10Effect, language)}
              testAttr="data-guided-cost-p10-effect"
            />
            <GuidedRangeSlider
              min={GUIDED_COST_P10_SLIDER.min}
              max={GUIDED_COST_P10_SLIDER.max}
              step={GUIDED_COST_P10_SLIDER.step}
              value={Math.min(
                GUIDED_COST_P10_SLIDER.max,
                Math.max(GUIDED_COST_P10_SLIDER.min, costOptSlider),
              )}
              origin={0}
              blank={costOptBlank}
              ariaLabel={t("inputs.guidedP10")}
              testId="cost-p10"
              onCommit={(v) => commitPercentField("optimistic", v)}
            />
          </div>

          <div className={modeCardClassName} data-guided-side="mode">
            <SideLabel accent>{t("inputs.guidedMostLikely")}</SideLabel>
            <GuidedInlineValue
              rowId={row.id}
              field="likely"
              rawValue={row.likely}
              displayText={costLikelyBlank ? "—" : formatGuidedCostAbsolute(costMAbs, language)}
              ariaLabel={t("inputs.guidedMostLikely")}
              displayAttrs={{ "data-guided-cost-m-abs": "" }}
              commitMode="enter"
              onCommit={(next) => patchNumeric("likely", next)}
            />
            <SecondarySpacer />
            <div className="h-5" aria-hidden />
          </div>

          <div className={sideCardClassName} data-guided-side="p90">
            <SideLabel>{t("inputs.guidedP90")}</SideLabel>
            <GuidedInlineValue
              rowId={row.id}
              field="pessimistic"
              rawValue={row.pessimistic}
              displayText={costPesBlank ? "—" : formatGuidedSignedPercent(costPesSlider, language)}
              ariaLabel={t("inputs.guidedP90")}
              displayAttrs={{ "data-guided-cost-p90-pct": "" }}
              commitMode="enter"
              onCommit={(next) => patchNumeric("pessimistic", next)}
            />
            <SecondaryEffect
              text={formatGuidedApproxImpactLabel(costP90Effect, language)}
              testAttr="data-guided-cost-p90-effect"
            />
            <GuidedRangeSlider
              min={GUIDED_COST_P90_SLIDER.min}
              max={GUIDED_COST_P90_SLIDER.max}
              step={GUIDED_COST_P90_SLIDER.step}
              value={Math.min(
                GUIDED_COST_P90_SLIDER.max,
                Math.max(GUIDED_COST_P90_SLIDER.min, costPesSlider),
              )}
              origin={0}
              blank={costPesBlank}
              ariaLabel={t("inputs.guidedP90")}
              testId="cost-p90"
              onCommit={(v) => commitPercentField("pessimistic", v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
