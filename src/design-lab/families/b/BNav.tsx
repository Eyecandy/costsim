import { USER } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

/** Links, language toggle and the user button. Used in the nav bar, or in the command bar when there is none. */
export function BNav() {
  const { t, language, setLanguage } = useI18n()
  return (
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
  )
}
