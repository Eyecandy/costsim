import { FileText, SlidersHorizontal } from "lucide-react"

import {
  BASE_COST,
  EMPTY_ROW_COUNT,
  IMPACT_ON_COSTS,
  INCURRED_COSTS,
  SELECTED_DRIVER,
  type SampleRow,
} from "@/design-lab/sampleData"
import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

const COLUMN_COUNT = 5

/** Note 10: a value that looks editable (field border, hover) or the plain text of today. */
function Cell({
  value,
  editable,
  align,
}: {
  value: string
  editable: boolean
  align: "left" | "right"
}) {
  if (!editable) return <span className="tabular-nums">{value}</span>
  return (
    <span
      className={cn(
        "inline-block min-w-[4.5rem] rounded border border-[var(--lab-field-border)] bg-background px-2 py-0.5 tabular-nums hover:border-[var(--lab-brand)] hover:bg-[var(--lab-tint)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {value}
    </span>
  )
}

function RowButton({
  label,
  active,
  Icon,
}: {
  label: string
  active?: boolean
  Icon: typeof FileText
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] whitespace-nowrap",
        active
          ? "border-[var(--lab-brand)] bg-[var(--lab-tint-strong)] text-foreground"
          : "border-transparent text-muted-foreground opacity-70 group-hover:border-[var(--lab-field-border)] group-hover:opacity-100 hover:bg-[var(--lab-tint)]",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </button>
  )
}

/** Note 6: what impact on each cost item looks like when it opens directly under the driver row. */
function ImpactPanel() {
  const { t } = useI18n()
  return (
    <tr>
      <td colSpan={COLUMN_COUNT} className="px-2 pb-3">
        <div className="rounded-md border border-[var(--lab-brand)]/40 bg-[var(--lab-tint)] p-3">
          <p className="m-0 mb-2 text-[11px] font-semibold">
            {t("expanders.driverImpact")} · {SELECTED_DRIVER}
          </p>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {IMPACT_ON_COSTS.map((item) => (
              <li
                key={item.name}
                className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-[11px]"
              >
                <span className="truncate">{item.name}</span>
                <span className="relative h-1 rounded-full bg-border">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--lab-brand)]"
                    style={{ width: `${item.percent}%` }}
                  />
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lab-brand)]"
                    style={{ left: `${item.percent}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">{item.percent} %</span>
              </li>
            ))}
          </ul>
        </div>
      </td>
    </tr>
  )
}

/**
 * The cost item or driver table. `rowActions="inline"` puts Define and Impact on every row and opens
 * the impact for the selected driver under that row (note 6).
 */
export function LabTable({
  kind,
  rows,
  editable,
  rowActions,
}: {
  kind: "cost" | "driver"
  rows: readonly SampleRow[]
  editable: boolean
  rowActions: LabOptions["rowActions"]
}) {
  const { t } = useI18n()
  const inline = rowActions === "inline"
  const headCell = "px-2 py-1.5 text-[10px] font-medium text-muted-foreground"

  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-b border-border">
          <th className={cn(headCell, "text-left")}>{t("inputs.nameHeader")}</th>
          <th className={cn(headCell, "text-right")}>{t("inputs.optimisticHeader")}</th>
          <th className={cn(headCell, "text-right")}>
            {kind === "cost" ? t("inputs.likelyHeader") : t("inputs.likelyPercentHeader")}
          </th>
          <th className={cn(headCell, "text-right")}>{t("inputs.pessimisticHeader")}</th>
          <th className={headCell} aria-hidden />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const selected = inline && kind === "driver" && row.name === SELECTED_DRIVER
          return (
            <FragmentRows key={row.name}>
              <tr
                className={cn(
                  "group border-b border-border/60",
                  selected && "bg-[var(--lab-tint)]",
                )}
              >
                <td className="px-2 py-1.5">
                  <Cell value={row.name} editable={editable} align="left" />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Cell value={row.optimistic} editable={editable} align="right" />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Cell value={row.likely} editable={editable} align="right" />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Cell value={row.pessimistic} editable={editable} align="right" />
                </td>
                <td className="px-2 py-1.5 text-right">
                  {inline ? (
                    <span className="inline-flex items-center gap-1">
                      <RowButton label={t("expanders.define")} Icon={FileText} />
                      {kind === "driver" ? (
                        <RowButton
                          label={t("expanders.driverImpact")}
                          Icon={SlidersHorizontal}
                          active={selected}
                        />
                      ) : null}
                    </span>
                  ) : null}
                </td>
              </tr>
              {selected ? <ImpactPanel /> : null}
            </FragmentRows>
          )
        })}
        {Array.from({ length: EMPTY_ROW_COUNT }, (_, index) => (
          <tr key={`empty-${index}`} className="border-b border-border/60">
            <td colSpan={COLUMN_COUNT} className="h-8 px-2">
              {editable ? (
                <span className="inline-block h-5 w-full rounded border border-dashed border-[var(--lab-field-border)]/70" />
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
      {kind === "cost" ? (
        <tfoot>
          <tr className="text-muted-foreground">
            <td className="px-2 py-2">Påløpte kostnader</td>
            <td />
            <td className="px-2 py-2 text-right tabular-nums">{INCURRED_COSTS}</td>
            <td colSpan={2} />
          </tr>
          <tr className="border-t border-border font-medium">
            <td className="px-2 py-2">{t("keyMetrics.baseCost")}</td>
            <td />
            <td className="px-2 py-2 text-right tabular-nums">{BASE_COST}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      ) : null}
    </table>
  )
}

/** A table body may hold several rows per data row; a fragment keeps the key on one element. */
function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
