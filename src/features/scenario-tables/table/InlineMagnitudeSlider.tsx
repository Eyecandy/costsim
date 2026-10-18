import "@glideapps/glide-data-grid/dist/index.css"

import { cn } from "@/shared/utils"
import { sliderFillRangePct } from "@/domain/results/sliderFillRange"

/** Inline impact/correlation slider track width (50% wider than the original 3.25rem). */
export const INLINE_SLIDER_WIDTH_CLASS = "w-[4.875rem] min-w-[3.25rem] shrink"
export const INLINE_SLIDER_NAME_CLASS =
  "pointer-events-none min-w-0 flex-1 truncate font-sans text-[12px] leading-none text-[rgba(115,116,131,0.95)]"
export const INLINE_SLIDER_VALUE_CLASS =
  "pointer-events-none w-7 shrink-0 text-right font-sans text-[10px] tabular-nums text-muted-foreground"

export function InlineMagnitudeSlider({
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
