import type { ReactNode } from "react"
import { Pencil, Trash2 } from "lucide-react"

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

type Extras = {
  unit?: boolean
  focusRing?: boolean
  pencil?: boolean
  heat?: boolean
  touch?: boolean
}

/** Splits "12 %" into the number and its unit; a cost "likely" cell gets "kr". */
function splitUnit(text: string, costLikely: boolean): { number: string; unit: string } {
  if (text.trim().endsWith("%")) return { number: text.trim().slice(0, -1).trim(), unit: "%" }
  return { number: text, unit: costLikely ? "kr" : "" }
}

function Value(props: {
  text: string
  style: CellStyle
  align?: "left" | "right"
  extras?: Extras
  /** What the cell is, for the unit and the heat colour. */
  column?: "name" | "low" | "likely" | "high"
  costLikely?: boolean
}) {
  const { text, style, align = "right", extras = {}, column, costLikely = false } = props
  const withUnit = extras.unit && column && column !== "name" ? splitUnit(text, costLikely) : null
  const heatClass =
    extras.heat && (column === "low" || column === "high")
      ? column === "low"
        ? "bg-sky-500/15"
        : "bg-orange-500/15"
      : ""
  const ring = extras.focusRing
    ? "focus-visible:ring-2 focus-visible:ring-[var(--lab-brand)] focus-visible:ring-offset-1 focus-visible:outline-none hover:ring-2 hover:ring-[var(--lab-brand)]/40"
    : ""
  const touch = extras.touch ? "min-h-12 flex items-center" : ""
  return (
    <span
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- mock-up: the cell stands in for an editable field
      tabIndex={extras.focusRing || extras.pencil ? 0 : undefined}
      className={cn(
        "group/cell relative block w-full rounded-md",
        touch,
        heatClass,
        ring,
        extras.pencil &&
          "border border-dashed border-transparent hover:border-[var(--lab-field-border)] hover:bg-background focus-visible:border-[var(--lab-brand)] focus-visible:outline-none",
      )}
    >
      <ValueShape
        text={text}
        style={style}
        align={align}
        content={
          withUnit ? (
            <>
              {withUnit.number}
              <span className="ml-1 inline-block w-5 text-left text-[0.8em] text-muted-foreground">
                {withUnit.unit}
              </span>
            </>
          ) : (
            text
          )
        }
      />
      {extras.pencil ? (
        <Pencil
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1 size-3 -translate-y-1/2 text-muted-foreground opacity-0 group-hover/cell:opacity-100"
        />
      ) : null}
    </span>
  )
}

function ValueShape({
  text,
  style,
  align = "right",
  content,
}: {
  text: string
  style: CellStyle
  align?: "left" | "right"
  content: ReactNode
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
          {content}
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
          {content}
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
          {content}
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
          {content}
        </span>
      )
  }
}

function numberOf(text: string): number {
  return Number(text.replace(/[^d-]/g, "")) || 0
}

/** The cost item or driver table with the cell look of the variant. */
export function CTable({
  kind,
  rows,
  style,
  airy = false,
  unit = false,
  focusRing = false,
  hoverActions = false,
  pencil = false,
  heat = false,
  stickyHead = false,
  totalsRow = false,
  touch = false,
}: {
  kind: "cost" | "driver"
  rows: readonly SampleRow[]
  style: CellStyle
  airy?: boolean
  unit?: boolean
  focusRing?: boolean
  hoverActions?: boolean
  pencil?: boolean
  heat?: boolean
  stickyHead?: boolean
  totalsRow?: boolean
  touch?: boolean
}) {
  const { t } = useI18n()
  const head = cn(
    "px-2 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase",
    stickyHead && "sticky top-0 z-10 bg-[var(--b-card)] shadow-[0_1px_0_var(--border)]",
  )
  const range = style === "range"
  const big = airy || touch
  const rowPad = touch ? "py-1.5" : airy ? "py-3.5" : "py-2"
  const extras: Extras = { unit, focusRing, pencil, heat, touch }
  const columns = (range ? 5 : 4) + (hoverActions ? 1 : 0)
  const costLikely = kind === "cost"
  const sum = rows.reduce((total, row) => total + numberOf(row.likely), 0)
  const table = (
    <table
      className={cn("w-full table-fixed border-collapse", big ? "text-[14px]" : "text-[12px]")}
      data-cell-style={style}
    >
      {/* Fixed widths: a cell is the same size whatever is typed in it. */}
      <colgroup>
        <col />
        {range ? <col className="w-[22%]" /> : null}
        <col className="w-24" />
        <col className="w-24" />
        <col className="w-24" />
        {hoverActions ? <col className="w-16" /> : null}
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
          {hoverActions ? <th className={head} /> : null}
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
              hoverActions && "hover:bg-[var(--lab-tint)] focus-within:bg-[var(--lab-tint)]",
            )}
          >
            <td className={`px-2 ${rowPad} font-medium`}>
              <Value
                text={row.name}
                style={style === "pill" ? "underline" : style}
                align="left"
                column="name"
                extras={{ ...extras, unit: false, heat: false }}
              />
            </td>
            {range ? (
              <td className={`px-2 ${rowPad}`}>
                <RangeBar row={row} />
              </td>
            ) : null}
            <td className={`px-2 ${rowPad} text-right`}>
              <Value text={row.optimistic} style={style} column="low" extras={extras} />
            </td>
            <td className={`px-2 ${rowPad} text-right`}>
              <Value
                text={row.likely}
                style={style}
                column="likely"
                costLikely={costLikely}
                extras={extras}
              />
            </td>
            <td className={`px-2 ${rowPad} text-right`}>
              <Value text={row.pessimistic} style={style} column="high" extras={extras} />
            </td>
            {hoverActions ? (
              <td className={`px-2 ${rowPad}`}>
                <span className="flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`Rediger ${row.name}`}
                    className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-[var(--lab-brand)]"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Slett ${row.name}`}
                    className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </span>
              </td>
            ) : null}
          </tr>
        ))}
        {Array.from({ length: EMPTY_ROW_COUNT - 2 }, (_, index) => (
          <tr key={`empty-${index}`}>
            <td colSpan={columns} className="h-8 px-2 text-[11px] text-muted-foreground/50">
              {index === 0 ? "+ Legg til rad" : ""}
            </td>
          </tr>
        ))}
      </tbody>
      {totalsRow ? (
        <tfoot>
          <tr className="border-t-2 border-[var(--lab-brand)]/40 font-semibold">
            <td className={`px-2 ${rowPad}`}>{kind === "cost" ? "Sum" : "Antall"}</td>
            {range ? <td /> : null}
            <td />
            <td className={`px-2 ${rowPad} text-right tabular-nums`}>
              {kind === "cost" ? `${sum.toLocaleString("nb-NO")} kr` : rows.length}
            </td>
            <td />
            {hoverActions ? <td /> : null}
          </tr>
        </tfoot>
      ) : null}
    </table>
  )
  return stickyHead ? <div className="max-h-64 overflow-y-auto">{table}</div> : table
}
