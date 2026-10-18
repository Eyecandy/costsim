import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

export function GuidedConceptIntro(args: {
  phase: "estimateUncertaintyIntro" | "driversIntro"
  paragraphs: readonly string[]
}) {
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-4"
      data-guided-phase={args.phase}
      data-guided-concept-intro=""
    >
      {args.paragraphs.map((text, index) => (
        <p
          key={`${args.phase}-${index}`}
          className={cn(
            "m-0 font-sans text-[13px] leading-relaxed",
            index === args.paragraphs.length - 1 ? "text-muted-foreground" : "text-foreground/90",
          )}
        >
          {text}
        </p>
      ))}
    </div>
  )
}

/** Entry step of the primary Focus mode session — orientation only, no inputs. */
export function GuidedFocusIntroPhase({ projectName }: { projectName: string }) {
  const { t } = useI18n()
  const overview = [
    t("inputs.focusOverviewPhase1"),
    t("inputs.focusOverviewPhase2"),
    t("inputs.focusOverviewPhase3"),
    t("inputs.focusOverviewPhase4"),
  ]

  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-4"
      data-guided-phase="focusIntro"
      data-focus-intro=""
    >
      <p className="m-0 font-sans text-[13px] leading-relaxed text-foreground/90">
        {t("inputs.focusIntroBody")}
      </p>
      {projectName.trim() ? (
        <p
          className="m-0 font-sans text-[12px] leading-snug text-muted-foreground"
          data-focus-intro-context=""
        >
          {projectName}
        </p>
      ) : null}
      <ol className="m-0 flex list-none flex-col gap-2 p-0" data-focus-intro-overview="">
        {overview.map((label, index) => (
          <li
            key={label}
            className="flex items-center gap-2.5 font-sans text-[13px] leading-snug text-foreground/90"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                "border border-[#1d868c]/45 bg-[#1d868c]/10",
                "font-sans text-[11px] font-medium tabular-nums text-[#1d868c]",
              )}
            >
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
