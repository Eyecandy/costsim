import { BCommandBar } from "@/design-lab/families/b/BCommandBar"
import { BInputs } from "@/design-lab/families/b/BInputs"
import { BNavBar } from "@/design-lab/families/b/BNavBar"
import { BSidebar } from "@/design-lab/families/b/BSidebar"
import { BResults } from "@/design-lab/families/b/BResults"
import type { BVariant } from "@/design-lab/families/b/types"
import { themeStyle } from "@/design-lab/themes"

/** Family B, the workbench: its own layout, independent of family A's page. */
export function BPage({ variant }: { variant: BVariant }) {
  const full = variant.detail === "full"
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
        />
        {variant.layout === "rows" ? (
          <main className="mx-auto w-full max-w-[96rem] space-y-5 p-5">
            <BInputs mode={variant.inputs} showFocus={!variant.focusAtTitle} />
            <BResults wide full={full} />
          </main>
        ) : (
          <main className="mx-auto grid w-full max-w-[96rem] items-start gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <BInputs mode={variant.inputs} showFocus={!variant.focusAtTitle} />
            <BResults full={full} />
          </main>
        )}
      </div>
    </div>
  )
}
