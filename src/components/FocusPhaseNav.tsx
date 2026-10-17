import { cn } from "@/lib/utils"
import {
  FOCUS_USER_PHASES,
  focusUserPhaseMessageKey,
  isFocusPhaseReached,
  type FocusUserPhase,
} from "@/lib/focusPhaseNav"

type Translate = (key: string) => string

/**
 * Focus phase overview — optically centered in the header aux row.
 * Three-column grid keeps the nav centered even when item progress is present.
 */
export function FocusPhaseNav(props: {
  currentPhase: FocusUserPhase
  furthestReached: FocusUserPhase | null
  itemProgressLabel?: string
  onSelectPhase: (phase: FocusUserPhase) => void
  t: Translate
}) {
  const { currentPhase, furthestReached, itemProgressLabel, onSelectPhase, t } =
    props

  return (
    <div
      className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2"
      data-focus-phase-nav-row=""
    >
      <span className="min-w-0" aria-hidden />
      <nav
        className="flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 justify-self-center"
        aria-label={t("inputs.focusPhaseNavLabel")}
        data-focus-phase-nav=""
      >
        {FOCUS_USER_PHASES.map((phase, index) => {
          const reached = isFocusPhaseReached(phase, furthestReached)
          const current = phase === currentPhase
          const interactive = reached || current
          const label = t(focusUserPhaseMessageKey(phase))
          return (
            <span key={phase} className="inline-flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <span
                  className="select-none text-muted-foreground/35"
                  aria-hidden
                >
                  ·
                </span>
              ) : null}
              <button
                type="button"
                disabled={!interactive}
                aria-current={current ? "step" : undefined}
                onClick={() => {
                  if (!interactive) return
                  onSelectPhase(phase)
                }}
                className={cn(
                  "m-0 max-w-[7.5rem] truncate border-0 bg-transparent p-0 text-center font-sans text-[11px] leading-none tracking-wide",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35 focus-visible:ring-offset-1",
                  current &&
                    "font-medium text-foreground underline decoration-foreground/35 underline-offset-[3px]",
                  !current &&
                    reached &&
                    "text-muted-foreground hover:text-foreground",
                  !reached &&
                    !current &&
                    "cursor-default text-muted-foreground/40 disabled:opacity-100",
                )}
                data-focus-phase={phase}
                data-focus-phase-current={current ? "true" : undefined}
                data-focus-phase-reached={reached || current ? "true" : undefined}
              >
                {label}
              </button>
            </span>
          )
        })}
      </nav>
      <div className="flex min-w-0 justify-end justify-self-end">
        {itemProgressLabel ? (
          <span
            className="shrink-0 font-sans text-[11px] tabular-nums text-muted-foreground/70"
            data-guided-progress=""
          >
            {itemProgressLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
