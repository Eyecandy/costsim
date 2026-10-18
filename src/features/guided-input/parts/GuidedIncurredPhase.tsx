import { useI18n } from "@/i18n/useI18n"
import { formatGuidedCostAbsolute } from "@/domain/guided/guidedInput"
import { normalizeIncurredCosts } from "@/domain/analysis/project"
import { sanitizeScenarioNumericInput } from "@/domain/results/excelLikeTable"
import { clampCostLikelyAbs } from "@/domain/results/scenarioNumericClamps"
import { parseNumberField } from "@/domain/results/tableRows"
import { cn } from "@/shared/utils"
import { GuidedInlineValue } from "@/features/guided-input/parts/GuidedInlineValue"

export function GuidedIncurredPhase({
  incurredCosts,
  onIncurredCostsChange,
}: {
  incurredCosts: number
  onIncurredCostsChange: (value: number) => void
}) {
  const { t, language } = useI18n()
  const safe = normalizeIncurredCosts(incurredCosts)
  const rawValue = safe === 0 ? "" : String(safe)
  const displayText = safe === 0 ? "—" : formatGuidedCostAbsolute(safe, language)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="incurred">
      <div className="space-y-4">
        <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedIncurredGuidance")}
        </p>
        <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedIncurredSecondaryGuidance")}
        </p>
      </div>

      <div
        className={cn(
          "mx-auto w-full max-w-sm space-y-2 rounded-md border border-border/50 px-4 py-4 text-center",
        )}
        data-guided-incurred-value=""
      >
        <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("inputs.guidedIncurredValueLabel")}
        </p>
        <GuidedInlineValue
          rowId="__incurred__"
          field="likely"
          rawValue={rawValue}
          displayText={displayText}
          ariaLabel={t("projects.incurredCostsInputLabel")}
          displayAttrs={{ "data-guided-incurred-display": "true" }}
          commitMode="blur"
          onCommit={(next) => {
            const sanitized = sanitizeScenarioNumericInput(next)
            const clamped = clampCostLikelyAbs(sanitized)
            if (clamped.trim() === "") {
              onIncurredCostsChange(0)
              return
            }
            const parsed = parseNumberField(clamped)
            onIncurredCostsChange(normalizeIncurredCosts(parsed ?? 0))
          }}
        />
      </div>
    </div>
  )
}
