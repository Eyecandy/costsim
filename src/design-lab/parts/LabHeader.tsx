import { ChevronDown } from "lucide-react"

import { FILE_NAME, USER } from "@/design-lab/sampleData"
import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { BrandWordmark } from "@/shared/BrandWordmark"
import { cn } from "@/shared/utils"

/** Notes 1, 7 and 9: where the file name goes, where the links go, and how much the bar stands out. */
export function LabHeader({ options }: { options: LabOptions["header"] }) {
  const { t, language, setLanguage } = useI18n()
  const distinct = options.bar === "distinct"
  const farRight = options.nav === "farRight"

  return (
    <header
      className={cn(
        "w-full",
        distinct
          ? "border-b border-[var(--lab-bar-border)] bg-[var(--lab-bar-bg)] shadow-sm"
          : "bg-background",
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center gap-4 py-3",
          farRight ? "px-4" : "max-w-[90rem] px-6",
        )}
      >
        <BrandWordmark />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {options.fileName === "center" ? (
            <>
              <h1 className="m-0 truncate text-[13px] font-medium">{FILE_NAME}</h1>
              <span aria-hidden className="text-muted-foreground">
                …
              </span>
              <span className="text-[11px] text-muted-foreground">{t("library.saved")}</span>
            </>
          ) : null}
        </div>
        <nav
          aria-label={t("header.navLabel")}
          className="flex items-center gap-3 text-[11px] text-muted-foreground"
        >
          <button type="button" className="hover:text-foreground">
            {t("header.navMethodGuide")}
          </button>
          <span aria-hidden>·</span>
          <button type="button" className="hover:text-foreground">
            {t("header.navAbout")}
          </button>
          <span aria-hidden>·</span>
          <div
            role="group"
            aria-label={t("projects.languageGroup")}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setLanguage("no")}
              className={cn(
                language === "no" ? "font-medium text-foreground" : "hover:text-foreground",
              )}
            >
              NO
            </button>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                language === "en" ? "font-medium text-foreground" : "hover:text-foreground",
              )}
            >
              EN
            </button>
          </div>
          {options.user ? (
            <button
              type="button"
              aria-label="Konto"
              className="ml-2 flex items-center gap-2 rounded-full border border-[var(--lab-field-border)] bg-background py-1 pr-2 pl-1 text-[11px] text-foreground"
            >
              <span className="grid size-6 place-items-center rounded-full bg-[var(--lab-brand)] text-[10px] font-semibold text-white">
                {USER.initials}
              </span>
              {USER.name}
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
