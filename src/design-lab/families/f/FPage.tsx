import { ChevronDown, ChevronUp, Presentation } from "lucide-react"
import { useState } from "react"

import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { DCheckpoints } from "@/design-lab/families/d/DCheckpoints"
import type { FVariant } from "@/design-lab/families/f/types"
import { LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabInputHeading } from "@/design-lab/parts/LabInputTop"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { COST_ROWS, DRIVER_ROWS, type SampleRow } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

type Column = "name" | "low" | "likely" | "high"

const COLUMNS: { id: Column; letter: string; label: string; width: string }[] = [
  { id: "name", letter: "A", label: "Navn", width: "w-[18rem]" },
  { id: "low", letter: "B", label: "Lav", width: "w-[10rem]" },
  { id: "likely", letter: "C", label: "Mest sannsynlig", width: "w-[12rem]" },
  { id: "high", letter: "D", label: "Høy", width: "w-[10rem]" },
]

type SheetRow = { key: string; number: number; data: SampleRow }

const COST_SHEET: SheetRow[] = COST_ROWS.map((data, i) => ({
  key: `cost-${data.name}`,
  number: i + 2,
  data,
}))
const DRIVER_SHEET: SheetRow[] = DRIVER_ROWS.map((data, i) => ({
  key: `driver-${data.name}`,
  number: COST_ROWS.length + i + 5,
  data,
}))

function amount(text: string): number {
  return Number(text.replace(/\D/g, ""))
}

function formatKr(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

function cellText(row: SampleRow, column: Column): string {
  if (column === "name") return row.name
  if (column === "low") return row.optimistic
  if (column === "likely") return row.likely
  return row.pessimistic
}

type Selected = { key: string; column: Column }

function RunButton() {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      className={cn(brandPrimaryButtonClass, "h-10 w-full text-[12px] font-semibold uppercase")}
    >
      {t("buttons.runSimulation")}
    </Button>
  )
}

/** The thin bar above the sheet: address of the selected cell and its low / most likely / high. */
function FormulaBar({ selected }: { selected: Selected }) {
  const row = [...COST_SHEET, ...DRIVER_SHEET].find((r) => r.key === selected.key)
  const column = COLUMNS.find((c) => c.id === selected.column)
  if (!row || !column) return null
  return (
    <div
      aria-label="Formellinje"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-[var(--b-card)] px-4 py-3 text-[13px]"
    >
      <span className="grid h-8 min-w-14 place-items-center rounded-md bg-[var(--lab-tint-strong)] px-2 font-mono text-[12px] font-semibold">
        {column.letter}
        {row.number}
      </span>
      <span className="font-semibold">{row.data.name}</span>
      <dl className="m-0 flex flex-wrap items-center gap-x-6 gap-y-1">
        {[
          ["Lav", row.data.optimistic],
          ["Mest sannsynlig", row.data.likely],
          ["Høy", row.data.pessimistic],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="text-[11px] text-muted-foreground uppercase">{label}</dt>
            <dd className="m-0 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function BlockRow({ label, hint }: { label: string; hint: string }) {
  return (
    <tr className="h-11">
      <th
        colSpan={COLUMNS.length + 1}
        scope="colgroup"
        className="border-y border-border bg-muted px-4 text-left text-[12px] font-semibold tracking-wide uppercase"
      >
        {label}
        <span className="ml-3 font-normal tracking-normal text-muted-foreground normal-case">
          {hint}
        </span>
      </th>
    </tr>
  )
}

function Sheet({
  variant,
  selected,
  onSelect,
}: {
  variant: FVariant
  selected: Selected
  onSelect: (value: Selected) => void
}) {
  const rowHeight = variant.rows === "airy" ? "h-16" : "h-14"
  const grid = variant.lines === "grid"
  const base = COST_SHEET.reduce((sum, r) => sum + amount(r.data.likely), 0)

  const renderRow = (row: SheetRow, index: number) => (
    <tr
      key={row.key}
      className={cn(
        rowHeight,
        grid
          ? "bg-[var(--b-card)]"
          : cn(
              "border-b border-border/70",
              index % 2 === 0 ? "bg-[var(--b-card)]" : "bg-[var(--lab-tint)]",
            ),
      )}
    >
      <th
        scope="row"
        className="w-12 border-r border-border bg-muted/60 text-center text-[11px] font-normal text-muted-foreground"
      >
        {row.number}
      </th>
      {COLUMNS.map((column) => {
        const isSelected = selected.key === row.key && selected.column === column.id
        return (
          <td key={column.id} className={cn("p-0", grid && "border border-border")}>
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={`${column.letter}${row.number} ${column.label}: ${cellText(row.data, column.id)}`}
              onClick={() => onSelect({ key: row.key, column: column.id })}
              className={cn(
                "block size-full truncate px-4 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--lab-brand)] focus-visible:ring-inset",
                column.id === "name" ? "text-left font-medium" : "text-right tabular-nums",
                isSelected
                  ? "bg-[var(--lab-tint-strong)] shadow-[inset_0_0_0_2px_var(--lab-brand)]"
                  : "hover:bg-[var(--lab-tint)]",
              )}
            >
              {cellText(row.data, column.id)}
            </button>
          </td>
        )
      })}
    </tr>
  )

  return (
    <div className="max-h-[34rem] overflow-auto rounded-xl border border-border bg-[var(--b-card)]">
      <table aria-label="Regneark" className="w-max table-fixed border-collapse">
        <colgroup>
          <col className="w-12" />
          {COLUMNS.map((c) => (
            <col key={c.id} className={c.width} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="h-8">
            <th className="border-r border-b border-border bg-muted" aria-label="Rad" />
            {COLUMNS.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="border-r border-b border-border bg-muted text-[11px] font-semibold text-muted-foreground"
              >
                {c.letter}
              </th>
            ))}
          </tr>
          <tr className="h-10">
            <th
              className="border-r border-b border-border bg-[var(--lab-bar-bg)]"
              aria-label="Nr"
            />
            {COLUMNS.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={cn(
                  "truncate border-r border-b border-border bg-[var(--lab-bar-bg)] px-4 text-[12px] font-semibold",
                  c.id === "name" ? "text-left" : "text-right",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <BlockRow label="Kostnadsposter" hint="Hva prosjektet koster (NOK)" />
          {COST_SHEET.map(renderRow)}
          <tr className="h-12 bg-[var(--lab-tint)] font-semibold">
            <th scope="row" className="border-r border-border" />
            <td className="px-4 text-[13px]">Sum kostnadsposter</td>
            <td />
            <td className="px-4 text-right text-[14px] tabular-nums">{formatKr(base)}</td>
            <td />
          </tr>
          <BlockRow label="Drivere" hint="Hva som kan flytte kostnaden (%)" />
          {DRIVER_SHEET.map(renderRow)}
          <tr className="h-12 bg-[var(--lab-tint)] font-semibold">
            <th scope="row" className="border-r border-border" />
            <td className="px-4 text-[13px]">Antall drivere</td>
            <td />
            <td className="px-4 text-right text-[14px] tabular-nums">{DRIVER_SHEET.length}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ResultsPanel({ variant }: { variant: FVariant }) {
  const [open, setOpen] = useState(true)
  const bottom = variant.results === "bottom"
  return (
    <section
      aria-label="Resultater"
      className={cn(
        "rounded-xl border border-border bg-[var(--b-card)] shadow-sm",
        bottom ? "sticky bottom-3 z-20" : "h-fit xl:sticky xl:top-6",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="m-0 text-[16px] font-semibold tracking-tight">Resultater</h2>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <RunButton />
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Skjul resultater" : "Vis resultater"}
            onClick={() => setOpen(!open)}
            className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
          >
            {open ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronUp className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
      {open ? (
        <div
          className={cn(
            "max-h-[22rem] gap-5 overflow-y-auto border-t border-border p-4",
            bottom ? "grid lg:grid-cols-3" : "space-y-5",
          )}
        >
          <KeyFiguresTable />
          <LabSCurve />
          {bottom ? <LabTornado /> : null}
        </div>
      ) : null}
    </section>
  )
}

/**
 * Family F, "Regneark": cost items and drivers are two blocks of one sheet with column letters, a
 * sticky header, totals rows and a formula bar that shows the selected cell. Results are docked
 * under the sheet or in a collapsible panel on the right.
 */
export function FPage({ variant }: { variant: FVariant }) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<Selected>({
    key: `cost-${COST_ROWS[1]?.name ?? ""}`,
    column: "likely",
  })
  const right = variant.results === "right"
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`f${variant.id}`}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        {variant.library ? <CSidebar /> : null}
        <main className="mx-auto w-full max-w-[96rem] min-w-0 flex-1 space-y-5 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <LabInputHeading mode="fileName" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
                <Presentation className="size-3.5 text-[var(--lab-brand)]" aria-hidden />
                {t("inputs.guidedFocusMode")}
              </Button>
            </div>
            <LabDocumentActions state="active" tone="accent" />
          </div>
          <section
            aria-label="Analysepunkter"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[var(--b-card)] px-4 py-3"
          >
            <h2 className="m-0 text-[13px] font-semibold">Analysepunkter</h2>
            <DCheckpoints style="row" />
          </section>
          <LabProjectProfile />
          <div className={cn("gap-6", right && "grid xl:grid-cols-[minmax(0,1fr)_24rem]")}>
            <div className="min-w-0 space-y-4">
              <FormulaBar selected={selected} />
              <Sheet variant={variant} selected={selected} onSelect={setSelected} />
              {right ? null : <ResultsPanel variant={variant} />}
            </div>
            {right ? <ResultsPanel variant={variant} /> : null}
          </div>
        </main>
      </div>
    </div>
  )
}
