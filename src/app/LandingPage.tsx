import { useI18n } from "@/i18n/useI18n"
import { useNavigate } from "@/app/auth/auth"
import { cn } from "@/shared/utils"

const HEADER_NAV_LINK_CLASS =
  "shrink-0 cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-sans text-inherit no-underline transition-colors hover:text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export function LandingPage() {
  const { language, setLanguage, t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "sticky top-0 z-50 bg-background/95 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex max-w-[90rem] items-center justify-between px-3 py-3 md:px-5 lg:px-6">
          {/*
            Public landing: product wordmark withheld until brand/domain is secured.
            Restore the shared app wordmark in this left slot when ready
            (spacer height matches the wordmark line).
          */}
          <div className="min-h-[1.6875rem]" aria-hidden />
          <nav
            className="flex shrink-0 items-center gap-x-3 font-sans text-[11px] text-muted-foreground"
            aria-label={t("header.navLabel")}
          >
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={HEADER_NAV_LINK_CLASS}
            >
              {t("auth.title")}
            </button>
            <span className="select-none text-muted-foreground/60" aria-hidden>
              ·
            </span>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label={t("projects.languageGroup")}
            >
              <button
                type="button"
                className={cn(
                  "cursor-pointer rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground",
                  language === "no" && "font-medium text-foreground",
                )}
                onClick={() => setLanguage("no")}
              >
                NO
              </button>
              <span className="text-muted-foreground/60" aria-hidden>
                |
              </span>
              <button
                type="button"
                className={cn(
                  "cursor-pointer rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground",
                  language === "en" && "font-medium text-foreground",
                )}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
            </div>
          </nav>
        </div>
      </header>
      <footer
        className="fixed bottom-0 left-0 right-0 z-20 flex h-6 items-center justify-center bg-background/95 text-center font-sans text-[10px] text-muted-foreground/70 backdrop-blur-sm"
        role="contentinfo"
      >
        <span className="block leading-none">© 2026</span>
      </footer>
    </div>
  )
}
