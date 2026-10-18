import { Check, Flag, Play, Plus, Save } from "lucide-react"

import { CHECKPOINTS, FILE_NAME, USER } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

/** The checkpoints as connected steps: finished ones with a check, the active one filled, then "next". */
function CheckpointSteps() {
  const { t } = useI18n()
  return (
    <ol
      aria-label={t("checkpoints.region")}
      className="m-0 flex list-none flex-wrap items-center gap-y-2 p-0"
    >
      {CHECKPOINTS.map((checkpoint) => {
        const active = checkpoint.status === "active"
        return (
          <li key={checkpoint.sequence} className="flex items-center">
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px]",
                active
                  ? "border-transparent bg-[var(--lab-action)] font-semibold text-white shadow-sm"
                  : "border-[var(--lab-brand)]/40 bg-[var(--lab-tint)] text-foreground hover:border-[var(--lab-brand)]",
              )}
            >
              {active ? (
                <span className="size-1.5 rounded-full bg-white" aria-hidden />
              ) : (
                <Check className="size-3.5 text-[var(--lab-brand)]" strokeWidth={3} aria-hidden />
              )}
              <span className="opacity-70">CP{checkpoint.sequence}</span>
              {checkpoint.name}
            </button>
            <span aria-hidden className="mx-1.5 h-px w-5 bg-border" />
          </li>
        )
      })}
      <li>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-dashed border-[var(--lab-brand)] px-3 py-1 text-[12px] text-[var(--lab-brand)] hover:bg-[var(--lab-tint)]"
        >
          <Plus className="size-3.5" aria-hidden />
          {t("checkpoints.nextAction")}
        </button>
      </li>
    </ol>
  )
}

/** Title, saved state, links and user on the first row; checkpoint steps and the main actions on the second. */
export function BCommandBar() {
  const { t, language, setLanguage } = useI18n()
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-[var(--b-canvas)]/90 backdrop-blur">
      <div className="mx-auto w-full max-w-[96rem] space-y-3 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] text-muted-foreground">Bygg / Ullern renovering</p>
            <div className="flex items-baseline gap-3">
              <h1 className="m-0 truncate text-[20px] font-semibold tracking-tight">{FILE_NAME}</h1>
              <span className="rounded-full bg-[var(--lab-tint)] px-2 py-0.5 text-[11px] text-muted-foreground">
                {t("library.saved")} 14:32
              </span>
            </div>
          </div>
          <nav
            aria-label={t("header.navLabel")}
            className="flex items-center gap-3 text-[11px] text-muted-foreground"
          >
            <button type="button" className="hover:text-foreground">
              {t("header.navMethodGuide")}
            </button>
            <button type="button" className="hover:text-foreground">
              {t("header.navAbout")}
            </button>
            <span role="group" aria-label={t("projects.languageGroup")} className="flex gap-1">
              <button
                type="button"
                onClick={() => setLanguage("no")}
                className={cn(language === "no" && "font-medium text-foreground")}
              >
                NO
              </button>
              <span aria-hidden>|</span>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(language === "en" && "font-medium text-foreground")}
              >
                EN
              </button>
            </span>
            <button
              type="button"
              aria-label="Konto"
              className="grid size-8 place-items-center rounded-full bg-[var(--lab-brand)] text-[11px] font-semibold text-white"
            >
              {USER.initials}
            </button>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CheckpointSteps />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
              <Save className="size-3.5" aria-hidden />
              Lagre
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
              <Flag className="size-3.5" aria-hidden />
              Nytt checkpoint
            </Button>
            <Button
              type="button"
              className="h-9 gap-1.5 border-transparent bg-[var(--lab-action)] px-5 text-[12px] font-semibold tracking-wide text-white uppercase shadow-sm hover:bg-[var(--lab-action)]/90 hover:text-white"
            >
              <Play className="size-3.5 fill-current" aria-hidden />
              {t("buttons.runSimulation")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
