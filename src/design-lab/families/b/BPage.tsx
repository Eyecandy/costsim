import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { useState, type ReactNode } from "react"

import { BCommandBar } from "@/design-lab/families/b/BCommandBar"
import { BInputs } from "@/design-lab/families/b/BInputs"
import { BNavBar } from "@/design-lab/families/b/BNavBar"
import { BResults, ChangeTable } from "@/design-lab/families/b/BResults"
import { BSidebar } from "@/design-lab/families/b/BSidebar"
import type { BVariant } from "@/design-lab/families/b/types"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"

/** The detail drawer on the right: the full key figure table and the change since the last checkpoint. */
function DetailDrawer() {
  const { t } = useI18n()
  return (
    <aside
      aria-label="Detaljer"
      className="sticky top-0 hidden h-screen w-[26rem] shrink-0 space-y-6 overflow-y-auto border-l border-border bg-[var(--b-card)] p-6 xl:block"
    >
      <section>
        <h2 className="section-heading m-0 mb-3">{t("results.keyMetricsTitle")}</h2>
        <KeyFiguresTable />
      </section>
      <section>
        <h2 className="section-heading m-0 mb-3">{t("checkpoints.comparisonHeading")}</h2>
        <ChangeTable />
      </section>
    </aside>
  )
}

/** Family B, the workbench: its own layout, independent of family A's page. */
export function BPage({ variant }: { variant: BVariant }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const full = variant.detail === "full"
  const space = variant.density === "roomy" ? "space-y-8 p-8" : "space-y-5 p-5"
  const inputs = (
    <BInputs
      mode={variant.inputs}
      showFocus={!variant.focusAtTitle}
      density={variant.density}
      cardStyle={variant.cardStyle}
    />
  )
  const results = (wide: boolean) => (
    <BResults wide={wide} full={full} hideTiles={variant.keyStrip} cardStyle={variant.cardStyle} />
  )

  let body: ReactNode
  if (variant.layout === "rows") {
    body = (
      <main className={`mx-auto w-full max-w-[96rem] ${space}`}>
        {variant.resultsFirst ? (
          <>
            {results(true)}
            {inputs}
          </>
        ) : (
          <>
            {inputs}
            {results(true)}
          </>
        )}
      </main>
    )
  } else {
    body = (
      <main
        className={`mx-auto grid w-full max-w-[96rem] items-start xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${
          variant.density === "roomy" ? "gap-8 p-8" : "gap-5 p-5"
        }`}
      >
        {inputs}
        {results(false)}
      </main>
    )
  }

  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`b${variant.id}`}
    >
      <BSidebar mode={variant.sidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        {variant.navBar ? <BNavBar /> : null}
        <BCommandBar
          navBar={variant.navBar}
          focusAtTitle={variant.focusAtTitle}
          distinctCheckpoints={variant.checkpointTone === "distinct"}
          keyStrip={variant.keyStrip}
        />
        {variant.detailDrawer ? (
          <div className="mx-auto flex w-full max-w-[96rem] justify-end px-8 pt-4">
            <button
              type="button"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg border border-border bg-[var(--b-card)] px-3 py-1.5 text-[12px] hover:border-[var(--lab-brand)]"
            >
              {drawerOpen ? (
                <PanelRightClose className="size-4" aria-hidden />
              ) : (
                <PanelRightOpen className="size-4" aria-hidden />
              )}
              {drawerOpen ? "Skjul detaljer" : "Vis detaljer"}
            </button>
          </div>
        ) : null}
        {body}
      </div>
      {variant.detailDrawer && drawerOpen ? <DetailDrawer /> : null}
    </div>
  )
}
