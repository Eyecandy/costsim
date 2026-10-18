import { BCommandBar } from "@/design-lab/families/b/BCommandBar"
import { BInputs } from "@/design-lab/families/b/BInputs"
import { BRail } from "@/design-lab/families/b/BRail"
import { BResults } from "@/design-lab/families/b/BResults"
import type { BVariant } from "@/design-lab/families/b/types"
import { themeStyle } from "@/design-lab/themes"

/** Family B, the workbench: its own layout, independent of family A's page. */
export function BPage({ variant }: { variant: BVariant }) {
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`b${variant.id}`}
    >
      <BRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <BCommandBar />
        {variant.layout === "rows" ? (
          <main className="mx-auto w-full max-w-[96rem] space-y-5 p-5">
            <BInputs mode={variant.inputs} />
            <BResults wide />
          </main>
        ) : (
          <main className="mx-auto grid w-full max-w-[96rem] items-start gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <BInputs mode={variant.inputs} />
            <BResults />
          </main>
        )}
      </div>
    </div>
  )
}
