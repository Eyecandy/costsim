import type { ReactNode } from "react"

import { LabDevelopment, LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className="section-heading m-0 mb-3">{title}</h2>
      {children}
    </section>
  )
}

/** Results lead with big key figures, then the S-curve, then tornado and development side by side. */
export function BResults() {
  const { t } = useI18n()
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        <Tile label={t("keyMetrics.baseCost")} value={KEY_FIGURES.baseCost} />
        <Tile
          label={t("keyMetrics.p50")}
          value={KEY_FIGURES.p50}
          note={`${KEY_FIGURES.expectedAddition} ${KEY_FIGURES.expectedAdditionPercent}`}
        />
        <Tile label={t("keyMetrics.p85")} value={KEY_FIGURES.p85} />
        <Tile label={t("keyMetrics.uncertaintyReserve")} value={KEY_FIGURES.uncertaintyReserve} />
      </div>
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
      <Panel title={t("checkpoints.comparisonHeading")}>
        <p className="m-0 text-[13px]">
          P50: <span className="tabular-nums">9 650 000</span> →{" "}
          <span className="font-semibold tabular-nums">{KEY_FIGURES.p50}</span>{" "}
          <span className="text-muted-foreground">(+3,3 % siden Checkpoint 2)</span>
        </p>
      </Panel>
    </div>
  )
}
