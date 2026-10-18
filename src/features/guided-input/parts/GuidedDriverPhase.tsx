import { DriverUncertaintyNotesEditor } from "@/features/scenario-tables/DriverUncertaintyNotesEditor"
import { useI18n } from "@/i18n/useI18n"
import {
  GUIDED_DRIVER_MODE_SLIDER_RANGE,
  GUIDED_DRIVER_P10_SLIDER_RANGE,
  GUIDED_DRIVER_P90_SLIDER_RANGE,
  type computeGuidedDriverEndpointEffects,
  formatGuidedApproxImpactLabel,
  formatGuidedSignedPercent,
  getGuidedDriverRangeIssue,
  guidedPercentToStoredString,
  guidedSliderDisplayValue,
  isGuidedDriverValueOutsideWorkingRange,
  normalizeGuidedNumericField,
  pinGuidedSliderDisplayValue,
  type GuidedNumericField,
} from "@/domain/guided/guidedInput"
import { DRIVER_DESCRIPTION_MAX_LENGTH } from "@/domain/results/rowDefinitions"
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
import { SideLabel, SecondaryEffect } from "@/features/guided-input/parts/GuidedSidePieces"

export function GuidedDriverPhase({
  row,
  driverEffects,
  onPatchRow,
}: {
  row: DriverRow
  driverEffects: ReturnType<typeof computeGuidedDriverEndpointEffects>
  onPatchRow: (rowId: string, patch: Partial<CostElementRow & DriverRow>) => void
}) {
  const { t, language } = useI18n()

  const driverOptBlank = parseNumberField(row.optimistic) === null
  const driverLikelyBlank = parseNumberField(row.likely) === null
  const driverPesBlank = parseNumberField(row.pessimistic) === null
  const driverOptSlider = guidedSliderDisplayValue(row.optimistic, 0)
  const driverLikelySlider = guidedSliderDisplayValue(row.likely, 0)
  const driverPesSlider = guidedSliderDisplayValue(row.pessimistic, 0)
  const driverOptOutside = isGuidedDriverValueOutsideWorkingRange("optimistic", row.optimistic)
  const driverLikelyOutside = isGuidedDriverValueOutsideWorkingRange("likely", row.likely)
  const driverPesOutside = isGuidedDriverValueOutsideWorkingRange("pessimistic", row.pessimistic)
  const rangeIssue = getGuidedDriverRangeIssue(row)

  const patchNumeric = (field: GuidedNumericField, value: string) => {
    const normalized = normalizeGuidedNumericField({
      kind: "driver",
      field,
      value,
      row,
    })
    onPatchRow(row.id, { [field]: normalized })
  }

  const commitPercentField = (field: GuidedNumericField, value: number) => {
    patchNumeric(field, guidedPercentToStoredString(value))
  }

  const outsideCue = (
    <p
      className="m-0 font-sans text-[10px] leading-snug text-muted-foreground/80"
      data-guided-outside-working-range=""
    >
      {t("inputs.guidedDriverOutsideWorkingRange")}
    </p>
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5" data-guided-phase="driver">
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
          maxLength={DRIVER_DESCRIPTION_MAX_LENGTH}
          placeholder={t("inputs.defineDriverDescriptionPlaceholder")}
          onCommit={(id, description) => {
            onPatchRow(id, { description })
          }}
        />
      </div>

      <div className="space-y-1.5" data-guided-driver-uncertainty-notes="">
        <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("inputs.guidedDriverUncertaintyNotesHeading")}
        </p>
        <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
          {t("inputs.guidedDriverUncertaintyNotesHelper")}
        </p>
        <div className="pt-3" data-guided-driver-uncertainty-notes-body="">
          <DriverUncertaintyNotesEditor
            notes={row.uncertaintyNotes}
            onChange={(next) => {
              onPatchRow(row.id, { uncertaintyNotes: next })
            }}
          />
        </div>

        <p className="m-0 pt-2 font-sans text-[12px] leading-snug text-muted-foreground">
          {t("inputs.guidedDriverRangePrompt")}
        </p>

        <div className="space-y-2">
          <div
            className={rangeGridClassName}
            data-guided-driver-range=""
            data-guided-omp-align="primary"
          >
            <div className={sideCardClassName} data-guided-side="p10">
              <SideLabel>{t("inputs.guidedP10")}</SideLabel>
              <GuidedInlineValue
                rowId={row.id}
                field="optimistic"
                rawValue={row.optimistic}
                displayText={
                  driverOptBlank ? "—" : formatGuidedSignedPercent(driverOptSlider, language)
                }
                ariaLabel={t("inputs.guidedP10")}
                displayAttrs={{ "data-guided-driver-p10": "" }}
                commitMode="enter"
                onCommit={(next) => patchNumeric("optimistic", next)}
              />
              <SecondaryEffect
                text={formatGuidedApproxImpactLabel(driverEffects.p10Effect, language)}
                title={t("inputs.guidedDriverEffectHint")}
                testAttr="data-guided-driver-p10-effect"
              />
              <GuidedRangeSlider
                min={GUIDED_DRIVER_P10_SLIDER_RANGE.min}
                max={GUIDED_DRIVER_P10_SLIDER_RANGE.max}
                step={GUIDED_DRIVER_P10_SLIDER_RANGE.step}
                value={pinGuidedSliderDisplayValue(driverOptSlider, GUIDED_DRIVER_P10_SLIDER_RANGE)}
                origin={0}
                blank={driverOptBlank}
                ariaLabel={t("inputs.guidedP10")}
                testId="driver-p10"
                onCommit={(v) => commitPercentField("optimistic", v)}
              />
              {driverOptOutside ? outsideCue : null}
            </div>

            <div className={modeCardClassName} data-guided-side="mode">
              <SideLabel accent>{t("inputs.guidedMostLikely")}</SideLabel>
              <GuidedInlineValue
                rowId={row.id}
                field="likely"
                rawValue={row.likely}
                displayText={
                  driverLikelyBlank ? "—" : formatGuidedSignedPercent(driverLikelySlider, language)
                }
                ariaLabel={t("inputs.guidedMostLikely")}
                displayAttrs={{ "data-guided-driver-m": "" }}
                commitMode="enter"
                onCommit={(next) => patchNumeric("likely", next)}
              />
              <SecondaryEffect
                text={formatGuidedApproxImpactLabel(driverEffects.modeEffect, language)}
                title={t("inputs.guidedDriverEffectHint")}
                testAttr="data-guided-driver-m-effect"
              />
              <GuidedRangeSlider
                min={GUIDED_DRIVER_MODE_SLIDER_RANGE.min}
                max={GUIDED_DRIVER_MODE_SLIDER_RANGE.max}
                step={GUIDED_DRIVER_MODE_SLIDER_RANGE.step}
                value={pinGuidedSliderDisplayValue(
                  driverLikelySlider,
                  GUIDED_DRIVER_MODE_SLIDER_RANGE,
                )}
                origin={0}
                blank={driverLikelyBlank}
                ariaLabel={t("inputs.guidedMostLikely")}
                testId="driver-m"
                onCommit={(v) => commitPercentField("likely", v)}
              />
              {driverLikelyOutside ? outsideCue : null}
            </div>

            <div className={sideCardClassName} data-guided-side="p90">
              <SideLabel>{t("inputs.guidedP90")}</SideLabel>
              <GuidedInlineValue
                rowId={row.id}
                field="pessimistic"
                rawValue={row.pessimistic}
                displayText={
                  driverPesBlank ? "—" : formatGuidedSignedPercent(driverPesSlider, language)
                }
                ariaLabel={t("inputs.guidedP90")}
                displayAttrs={{ "data-guided-driver-p90": "" }}
                commitMode="enter"
                onCommit={(next) => patchNumeric("pessimistic", next)}
              />
              <SecondaryEffect
                text={formatGuidedApproxImpactLabel(driverEffects.p90Effect, language)}
                title={t("inputs.guidedDriverEffectHint")}
                testAttr="data-guided-driver-p90-effect"
              />
              <GuidedRangeSlider
                min={GUIDED_DRIVER_P90_SLIDER_RANGE.min}
                max={GUIDED_DRIVER_P90_SLIDER_RANGE.max}
                step={GUIDED_DRIVER_P90_SLIDER_RANGE.step}
                value={pinGuidedSliderDisplayValue(driverPesSlider, GUIDED_DRIVER_P90_SLIDER_RANGE)}
                origin={0}
                blank={driverPesBlank}
                ariaLabel={t("inputs.guidedP90")}
                testId="driver-p90"
                onCommit={(v) => commitPercentField("pessimistic", v)}
              />
              {driverPesOutside ? outsideCue : null}
            </div>
          </div>

          {rangeIssue !== null ? (
            <p
              role="status"
              data-guided-driver-range-warning={rangeIssue}
              className="m-0 font-sans text-[12px] leading-snug text-[#c24141]"
            >
              {rangeIssue === "support"
                ? t("inputs.guidedDriverSupportInvalid")
                : t("inputs.guidedDriverOrderInvalid")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
