import { snapGuidedSliderValue } from "@/domain/guided/guidedInput"
import { sliderFillRangePct } from "@/domain/results/sliderFillRange"
import { cn } from "@/shared/utils"

export function GuidedRangeSlider({
  min,
  max,
  step,
  value,
  origin,
  blank,
  ariaLabel,
  onCommit,
  testId,
}: {
  min: number
  max: number
  step: number
  value: number
  origin: number
  blank: boolean
  ariaLabel: string
  onCommit: (value: number) => void
  testId?: string
}) {
  const { startPct, endPct } = sliderFillRangePct(value, min, max, origin)
  const fillWidthPct = Math.max(0, endPct - startPct)

  return (
    <div className="relative h-5 w-full">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[6px] right-[6px]">
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--border)_70%,var(--muted-foreground)_18%)]" />
        {!blank && fillWidthPct > 0 ? (
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
        aria-label={ariaLabel}
        data-guided-slider={testId}
        data-guided-slider-blank={blank ? "true" : "false"}
        className={cn(
          "inline-magnitude-slider pointer-events-auto relative z-10 h-5 w-full cursor-pointer",
          blank && "opacity-55",
        )}
        onChange={(e) => {
          const next = snapGuidedSliderValue(Number(e.target.value), step)
          onCommit(next)
        }}
      />
    </div>
  )
}
