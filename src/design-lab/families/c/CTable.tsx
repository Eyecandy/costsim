import type { CellStyle } from "@/design-lab/families/c/types"
import { EMPTY_ROW_COUNT, type SampleRow } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

/** The number as a signed percent value, e.g. "-10 %" -> -10. */
function percentValue(text: string): number {
  return Number(text.replace(/[^\d,.-]/g, "").replace(",", "."))
}

/** A small bar showing the spread from optimistic to pessimistic with a marker for most likely. */
function RangeBar({ row }: { row: SampleRow }) {
  const low = Math.abs(percentValue(row.optimistic))
  const high = Math.abs(percentValue(row.pessimistic))
  const total = Math.max(low + high, 1)
  const markerPercent = (low / total) * 100
  return (
    <span
      className="relative block h-2 w-full min-w-[5rem] rounded-full bg-[var(--lab-tint-strong)]"
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--lab-brand)]/55"
        style={{ width: "100%" }}
      />
      <span
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--lab-accent)]"
        style={{ left: `${markerPercent}%` }}
      />
    </span>
  )
}

function Value({
  text,
  style,
  align = "right",
}: {
  text: string
  style: CellStyle
  align?: "left" | "right"
}) {
  const negative = text.trim().startsWith("-")
  const base = align === "right" ? "text-right" : "text-left"
  switch (style) {
    case "underline":
      return (
        <span
          className={cn(
            "block w-full truncate border-b border-[var(--lab-field-border)] px-1 py-0.5 tabular-nums hover:border-[var(--lab-brand)] hover:bg-[var(--lab-tint)]",
            base,
          )}
        >
          {text}
        </span>
      )
    case "filled":
      return (
        <span
          className={cn(
            "block w-full truncate rounded-md bg-[var(--lab-tint)] px-2 py-1 tabular-nums hover:bg-[var(--lab-tint-strong)]",
            base,
          )}
        >
          {text}
        </span>
      )
    case "pill":
      return (
        <span
          className={cn(
            "block w-full truncate rounded-full border px-2.5 py-0.5 text-center tabular-nums",
            negative
              ? "border-[var(--lab-brand)]/40 bg-[var(--lab-tint)]"
              : "border-[var(--lab-accent)]/40 bg-background",
          )}
        >
          {text}
        </span>
      )
    case "zebra":
    case "range":
      return (
        <span
          className={cn(
            "block w-full truncate rounded px-1.5 py-0.5 tabular-nums outline-offset-0 hover:outline hover:outline-1 hover:outline-[var(--lab-brand)]",
            base,
          )}
        >
          {text}
        </span>
      )
  }
}

/** The cost item or driver table with the cell look of the variant. */
export function CTable({
  kind,
  rows,
  style,
}: {
  kind: "cost" | "driver"
  rows: readonly SampleRow[]
  style: CellStyle
}) {
  const { t } = useI18n()
  const head = "px-2 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
  const range = style === "range"
  return (
    <table className="w-full table-fixed border-collapse text-[12px]" data-cell-style={style}>
      {/* Fixed widths: a cell is the same size whatever is typed in it. */}
      <colgroup>
        <col />
        {range ? <col className="w-[22%]" /> : null}
        <col className="w-24" />
        <col className="w-24" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr>
          <th className={cn(head, "text-left")}>{t("inputs.nameHeader")}</th>
          {range ? <th className={cn(head, "text-left")}>Spredning</th> : null}
          <th className={cn(head, "text-right")}>{t("inputs.optimisticHeader")}</th>
          <th className={cn(head, "text-right")}>
            {kind === "cost" ? t("inputs.likelyHeader") : t("inputs.likelyPercentHeader")}
          </th>
          <th className={cn(head, "text-right")}>{t("inputs.pessimisticHeader")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={row.name}
            className={cn(
              "group",
              style === "zebra" && index % 2 === 0 && "bg-muted/60",
              style === "underline" || style === "filled" || style === "pill" || range
                ? "border-b border-border/50"
                : "",
            )}
          >
            <td className="px-2 py-2 font-medium">
              <Value text={row.name} style={style === "pill" ? "underline" : style} align="left" />
            </td>
            {range ? (
              <td className="px-2 py-2">
                <RangeBar row={row} />
              </td>
            ) : null}
            <td className="px-2 py-2 text-right">
              <Value text={row.optimistic} style={style} />
            </td>
            <td className="px-2 py-2 text-right">
              <Value text={row.likely} style={style} />
            </td>
            <td className="px-2 py-2 text-right">
              <Value text={row.pessimistic} style={style} />
            </td>
          </tr>
        ))}
        {Array.from({ length: EMPTY_ROW_COUNT - 2 }, (_, index) => (
          <tr key={`empty-${index}`}>
            <td colSpan={range ? 5 : 4} className="h-8 px-2 text-[11px] text-muted-foreground/50">
              {index === 0 ? "+ Legg til rad" : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
