import { BCard } from "@/design-lab/families/b/BCard"
import { createContext, useContext, type ReactNode } from "react"

import type { CardStyle } from "@/design-lab/families/c/types"
import { LabDevelopment, LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { KEY_FIGURES } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"

const CARD = "rounded-2xl border border-border bg-[var(--b-card)] p-5 shadow-sm"

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={CARD}>
      <p className="m-0 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="m-0 mt-1 text-[22px] font-semibold tracking-tight tabular-nums">{value}</p>
      {note ? (
        <p className="m-0 mt-1 inline-block rounded-full bg-[var(--lab-tint)] px-2 py-0.5 text-[11px] text-[var(--lab-brand)]">
          {note}
        </p>
      ) : null}
    </div>
  )
}

const CardStyleContext = createContext<CardStyle | undefined>(undefined)

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const cardStyle = useContext(CardStyleContext)
  if (cardStyle) {
    return (
      <BCard style={cardStyle} title={title}>
        {children}
      </BCard>
    )
  }
  return (
    <section className={CARD}>
      <h2 className="section-heading m-0 mb-3">{title}</h2>
      {children}
    </section>
  )
}

/** The change since the previous checkpoint as a table, as in family A. */
export function ChangeTable() {
  const rows = [
    ["P50", "9 650 000", "9 970 000", "+320 000", "+3,3 %"],
    ["P85", "11 100 000", "11 450 000", "+350 000", "+3,2 %"],
  ]
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-b border-border text-[10px] text-muted-foreground">
          <th className="px-2 py-1.5 text-left font-medium">Nøkkeltall</th>
          <th className="px-2 py-1.5 text-right font-medium">Forrige</th>
          <th className="px-2 py-1.5 text-right font-medium">Nå</th>
          <th className="px-2 py-1.5 text-right font-medium">Endring</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, previous, current, change, percent]) => (
          <tr key={label} className="border-b border-border/60">
            <td className="px-2 py-1.5 font-medium">{label}</td>
            <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
              {previous}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums">{current}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">
              {change} <span className="text-muted-foreground">({percent})</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Results lead with big key figures, then the S-curve, then tornado and development. With `full` the
 * complete key figure table and the change table from family A are shown as well.
 */
export function BResults({
  wide = false,
  full = false,
  hideTiles = false,
  cardStyle,
}: {
  wide?: boolean
  full?: boolean
  /** The key figures are shown elsewhere (the strip under the command bar). */
  hideTiles?: boolean
  cardStyle?: CardStyle
}) {
  const { t } = useI18n()
  return (
    <CardStyleContext.Provider value={cardStyle}>
      <div className={cardStyle ? "space-y-6" : "space-y-5"}>
        {hideTiles ? null : (
          <div
            className={
              wide
                ? "grid grid-cols-2 gap-4 lg:grid-cols-4"
                : "grid grid-cols-2 gap-4 2xl:grid-cols-4"
            }
          >
            <Tile label={t("keyMetrics.baseCost")} value={KEY_FIGURES.baseCost} />
            <Tile
              label={t("keyMetrics.p50")}
              value={KEY_FIGURES.p50}
              note={`${KEY_FIGURES.expectedAddition} ${KEY_FIGURES.expectedAdditionPercent}`}
            />
            <Tile label={t("keyMetrics.p85")} value={KEY_FIGURES.p85} />
            <Tile
              label={t("keyMetrics.uncertaintyReserve")}
              value={KEY_FIGURES.uncertaintyReserve}
            />
          </div>
        )}
        {wide ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title={t("charts.sCurveTitle")}>
              <LabSCurve />
            </Panel>
            <Panel title={t("charts.tornadoTitle")}>
              <LabTornado />
            </Panel>
            <Panel title={t("checkpoints.developmentTitle")}>
              <LabDevelopment />
            </Panel>
          </div>
        ) : (
          <>
            <Panel title={t("charts.sCurveTitle")}>
              <LabSCurve tall />
            </Panel>
            <div className="grid gap-5 md:grid-cols-2">
              <Panel title={t("charts.tornadoTitle")}>
                <LabTornado />
              </Panel>
              <Panel title={t("checkpoints.developmentTitle")}>
                <LabDevelopment />
              </Panel>
            </div>
          </>
        )}
        {full ? (
          <div className={wide ? "grid gap-5 xl:grid-cols-2" : "space-y-5"}>
            <Panel title={t("results.keyMetricsTitle")}>
              <KeyFiguresTable />
            </Panel>
            <Panel title={t("checkpoints.comparisonHeading")}>
              <ChangeTable />
            </Panel>
          </div>
        ) : (
          <Panel title={t("checkpoints.comparisonHeading")}>
            <p className="m-0 text-[13px]">
              P50: <span className="tabular-nums">9 650 000</span> →{" "}
              <span className="font-semibold tabular-nums">{KEY_FIGURES.p50}</span>{" "}
              <span className="text-muted-foreground">(+3,3 % siden Checkpoint 2)</span>
            </p>
          </Panel>
        )}
      </div>
    </CardStyleContext.Provider>
  )
}
