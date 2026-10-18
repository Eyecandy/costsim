import { Plus } from "lucide-react"

import type { GVariant } from "@/design-lab/families/g/types"
import type { SampleRow } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

const CARD_SIZE: Record<GVariant["cardSize"], string> = {
  regular: "h-40 p-4",
  large: "h-48 p-5",
}

const CORNERS: Record<GVariant["corners"], string> = {
  soft: "rounded-2xl",
  sharp: "rounded-md",
}

function toNumber(text: string): number {
  const value = Number.parseFloat(text.replace(/\s/g, "").replace(",", ".").replace("−", "-"))
  return Number.isFinite(value) ? value : 0
}

/** Where "most likely" sits between low and high, 0 to 100. Costs are amounts, so their marker sits at 0 % change. */
function markerPosition(kind: "cost" | "driver", row: SampleRow): number {
  const low = toNumber(row.optimistic)
  const high = toNumber(row.pessimistic)
  const likely = kind === "cost" ? 0 : toNumber(row.likely)
  if (high <= low) return 50
  return Math.min(100, Math.max(0, ((likely - low) / (high - low)) * 100))
}

/** The mini-scale: decorative, the numbers below it carry the meaning. */
function RangeBar({ style, position }: { style: GVariant["bar"]; position: number }) {
  return (
    <span aria-hidden className="relative block h-6 w-full">
      {style === "dots" ? (
        <>
          <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-[var(--lab-brand)]/40" />
          <span className="absolute top-1/2 left-0 size-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--lab-brand)] bg-background" />
          <span className="absolute top-1/2 right-0 size-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--lab-brand)] bg-background" />
        </>
      ) : (
        <span
          className={cn(
            "absolute inset-x-0 top-1/2 block h-3 -translate-y-1/2 rounded-full",
            style === "band" ? "bg-[var(--lab-tint-strong)]" : "",
          )}
          style={
            style === "gradient"
              ? {
                  backgroundImage:
                    "linear-gradient(to right, var(--lab-tint), var(--lab-brand), var(--lab-tint))",
                }
              : undefined
          }
        />
      )}
      <span
        className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-[var(--lab-brand)] shadow"
        style={{ left: `${position}%` }}
      />
    </span>
  )
}

function Value({ label, value, align }: { label: string; value: string; align: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col", align)}>
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      <span className="truncate text-[14px] font-semibold tabular-nums">{value}</span>
    </span>
  )
}

/** One cost item or driver as a card of fixed size: name, range bar, low / most likely / high. */
export function GItemCard({
  kind,
  row,
  variant,
}: {
  kind: "cost" | "driver"
  row: SampleRow
  variant: GVariant
}) {
  const { t } = useI18n()
  const clean = (text: string) => text.replace(" (%)", "")
  return (
    <li className="m-0 list-none">
      <button
        type="button"
        aria-label={`Rediger ${row.name}`}
        className={cn(
          "flex w-full flex-col justify-between border border-border bg-[var(--b-card)] text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--lab-brand)]",
          CARD_SIZE[variant.cardSize],
          CORNERS[variant.corners],
        )}
      >
        <span className="block truncate text-[16px] font-semibold tracking-tight">{row.name}</span>
        <RangeBar style={variant.bar} position={markerPosition(kind, row)} />
        <span className="grid grid-cols-3 gap-2">
          <Value
            label={clean(t("inputs.optimisticHeader"))}
            value={row.optimistic}
            align="items-start"
          />
          <Value
            label={clean(t("inputs.likelyHeader"))}
            value={row.likely}
            align="items-center text-center"
          />
          <Value
            label={clean(t("inputs.pessimisticHeader"))}
            value={row.pessimistic}
            align="items-end text-right"
          />
        </span>
      </button>
    </li>
  )
}

/** The "add" card at the end of a list; same size as the others. */
export function GAddCard({ label, variant }: { label: string; variant: GVariant }) {
  return (
    <li className="m-0 list-none">
      <button
        type="button"
        aria-label={label}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--lab-brand)]/50 bg-[var(--lab-tint)] text-[14px] font-medium text-[var(--lab-brand)] hover:bg-[var(--lab-tint-strong)]",
          CARD_SIZE[variant.cardSize],
          CORNERS[variant.corners],
        )}
      >
        <Plus className="size-7" aria-hidden />
        {label}
      </button>
    </li>
  )
}
