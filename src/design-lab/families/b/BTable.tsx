import { FileText, SlidersHorizontal } from "lucide-react"

import { BASE_COST, INCURRED_COSTS, type SampleRow } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"

/** A cell of fixed height and width: long or short content never changes its size. */
function Cell({ value, align }: { value: string; align: "left" | "right" }) {
  return (
    <span
      title={value}
      className={`block h-10 truncate rounded-lg border border-[var(--lab-field-border)] bg-background px-3 text-[13px] leading-10 tabular-nums hover:border-[var(--lab-brand)] hover:bg-[var(--lab-tint)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {value}
    </span>
  )
}

function RowButton({ label, Icon }: { label: string; Icon: typeof FileText }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-transparent text-[12px] whitespace-nowrap text-muted-foreground hover:border-[var(--lab-field-border)] hover:bg-[var(--lab-tint)] hover:text-foreground"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  )
}

/**
 * The roomy table: `table-fixed` with set column widths, 40 px tall cells and generous spacing, so
 * every cell has the same size whatever it holds. Define and Impact sit in a column of their own.
 */
export function BTable({ kind, rows }: { kind: "cost" | "driver"; rows: readonly SampleRow[] }) {
  const { t } = useI18n()
  const head = "px-1.5 pb-2 text-[12px] font-medium text-muted-foreground"
  return (
    <div className="overflow-x-auto">
      <table className="w-[40rem] table-fixed border-separate border-spacing-y-2 text-[13px]">
        <colgroup>
          <col className="w-[13rem]" />
          <col className="w-[7rem]" />
          <col className="w-[7rem]" />
          <col className="w-[7rem]" />
          <col className="w-[6rem]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${head} text-left`}>{t("inputs.nameHeader")}</th>
            <th className={`${head} text-right`}>{t("inputs.optimisticHeader")}</th>
            <th className={`${head} text-right`}>
              {kind === "cost" ? t("inputs.likelyHeader") : t("inputs.likelyPercentHeader")}
            </th>
            <th className={`${head} text-right`}>{t("inputs.pessimisticHeader")}</th>
            <th className={head} aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="px-1.5">
                <Cell value={row.name} align="left" />
              </td>
              <td className="px-1.5">
                <Cell value={row.optimistic} align="right" />
              </td>
              <td className="px-1.5">
                <Cell value={row.likely} align="right" />
              </td>
              <td className="px-1.5">
                <Cell value={row.pessimistic} align="right" />
              </td>
              <td className="px-1.5">
                <RowButton
                  label={kind === "cost" ? t("expanders.define") : t("expanders.driverImpact")}
                  Icon={kind === "cost" ? FileText : SlidersHorizontal}
                />
              </td>
            </tr>
          ))}
        </tbody>
        {kind === "cost" ? (
          <tfoot>
            <tr className="text-muted-foreground">
              <td className="px-3 pt-3">Påløpte kostnader</td>
              <td />
              <td className="px-3 pt-3 text-right tabular-nums">{INCURRED_COSTS}</td>
              <td colSpan={2} />
            </tr>
            <tr className="font-semibold">
              <td className="px-3 py-1">{t("keyMetrics.baseCost")}</td>
              <td />
              <td className="px-3 py-1 text-right tabular-nums">{BASE_COST}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
