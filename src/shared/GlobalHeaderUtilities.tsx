import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Play, X } from "lucide-react"

import { useAuth } from "@/shared/auth/authContext"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { appFeatures } from "@/config/appVariant"
import { useI18n } from "@/i18n/useI18n"
import { formatNumber } from "@/domain/results/formatNumber"
import { METHOD_GUIDE_SECTION_IDS } from "@/domain/guided/methodGuide"
import { useOverlayPortalContainer } from "@/shared/overlayPortalContainer"
import { simulationConfig } from "@/domain/simulation/simulationConfig"
import { fillUncertaintyModelCopy } from "@/domain/simulation/uncertaintyModelConfig"
import { cn } from "@/shared/utils"

/** Same Play mark as the Guided Analysis control in Cost Items / Drivers toolbars. */
const GUIDE_ICON_CLASS =
  "inline size-3.5 shrink-0 fill-[#1d868c] text-[#1d868c] align-[-0.125em]"

/**
 * Viewport overlay shell — must portal to body (not render under sticky/backdrop-blur
 * headers). Uses dvh with vh fallback for Chromium/Safari viewport consistency.
 */
const INFO_MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"

const INFO_MODAL_PANEL_CLASS = cn(
  "flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border/60 bg-background shadow-md",
  "max-h-[min(90vh,40rem)] max-h-[min(90dvh,40rem)]",
)

const INFO_MODAL_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"

const INFO_MODAL_HEADER_CLASS =
  "mb-0 flex shrink-0 items-start justify-between gap-3 border-b border-border/40 px-4 pb-3 pt-4"

const UTILITY_LINK_CLASS =
  "shrink-0 cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-sans text-inherit no-underline transition-colors hover:text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

type GlobalHeaderUtilitiesProps = {
  /** Optional workspace cleanup before the shared sign-out redirect. */
  onBeforeSignOut?: () => void
  className?: string
  "aria-label"?: string
}

/**
 * Shared global header utilities: Method Guide, About the Model, Sign out, language.
 * Same controls/modals for Library and analysis workspace.
 */
export function GlobalHeaderUtilities({
  onBeforeSignOut,
  className,
  "aria-label": ariaLabel,
}: GlobalHeaderUtilitiesProps) {
  const { t, language, setLanguage } = useI18n()
  const { isAuthenticated, signOut } = useAuth()
  const portalContainer = useOverlayPortalContainer()
  const [methodGuideOpen, setMethodGuideOpen] = useState(false)
  const [aboutModelOpen, setAboutModelOpen] = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)

  const showSignOut = appFeatures.requireLoginGate && isAuthenticated

  useEffect(() => {
    if (!aboutModelOpen && !methodGuideOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setAboutModelOpen(false)
      setMethodGuideOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [aboutModelOpen, methodGuideOpen])

  const confirmSignOut = () => {
    setSignOutConfirmOpen(false)
    onBeforeSignOut?.()
    void signOut({ redirectTo: "/" })
  }

  const items: ReactNode[] = [
    <button
      key="method-guide"
      type="button"
      className={UTILITY_LINK_CLASS}
      onClick={() => {
        setAboutModelOpen(false)
        setMethodGuideOpen(true)
      }}
    >
      {t("header.navMethodGuide")}
    </button>,
    <button
      key="about"
      type="button"
      className={UTILITY_LINK_CLASS}
      onClick={() => {
        setMethodGuideOpen(false)
        setAboutModelOpen(true)
      }}
    >
      {t("header.navAbout")}
    </button>,
    ...(showSignOut
      ? [
          <button
            key="signout"
            type="button"
            className={UTILITY_LINK_CLASS}
            onClick={() => setSignOutConfirmOpen(true)}
          >
            {t("header.signOut")}
          </button>,
        ]
      : []),
    <div
      key="language"
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
    </div>,
  ]

  return (
    <>
      <nav
        className={cn(
          "flex shrink-0 items-center gap-x-3 font-sans text-[11px] text-muted-foreground",
          className,
        )}
        aria-label={ariaLabel ?? t("header.navLabel")}
      >
        {items.map((item, idx) => (
          <div key={idx} className="contents">
            {idx > 0 ? (
              <span
                className="select-none text-muted-foreground/60"
                aria-hidden
              >
                ·
              </span>
            ) : null}
            {item}
          </div>
        ))}
      </nav>
      {methodGuideOpen && portalContainer
        ? createPortal(
            <div
              className={INFO_MODAL_BACKDROP_CLASS}
              role="presentation"
              data-method-guide-backdrop=""
              onClick={() => setMethodGuideOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="method-guide-title"
                className={INFO_MODAL_PANEL_CLASS}
                data-method-guide-panel=""
                onClick={(e) => e.stopPropagation()}
              >
                <div className={INFO_MODAL_HEADER_CLASS}>
                  <h2
                    id="method-guide-title"
                    className="section-heading normal-case tracking-normal text-foreground/90"
                  >
                    {t("methodGuide.title")}
                  </h2>
                  <button
                    type="button"
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                    aria-label={t("methodGuide.closeDialog")}
                    onClick={() => setMethodGuideOpen(false)}
                  >
                    <X className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <div className={INFO_MODAL_BODY_CLASS}>
                  <div className="space-y-4">
                    <div className="space-y-1.5" data-method-guide-intro="">
                      <p className="section-body">{t("methodGuide.introLead")}</p>
                      <p className="section-body">
                        <span>{t("methodGuide.introGuideBefore")} </span>
                        <Play
                          className={GUIDE_ICON_CLASS}
                          aria-hidden
                          data-method-guide-guide-icon=""
                        />
                        <span> {t("methodGuide.introGuideName")} </span>
                        <span>{t("methodGuide.introGuideAfter")}</span>
                      </p>
                    </div>
                    {METHOD_GUIDE_SECTION_IDS.map((id) => (
                      <section
                        key={id}
                        className="space-y-1.5"
                        data-method-guide-section={id}
                      >
                        <h3 className="section-heading normal-case tracking-normal text-foreground/90">
                          {t(`methodGuide.${id}Heading`)}
                        </h3>
                        <p className="section-body">
                          {t(`methodGuide.${id}Text`)}
                        </p>
                        {id === "assumptions" ? (
                          <p
                            className="section-body flex flex-wrap items-center gap-x-1 gap-y-0.5 text-muted-foreground"
                            data-method-guide-tip="guide"
                          >
                            <span>{t("methodGuide.guideTipBefore")}</span>
                            <Play
                              className={GUIDE_ICON_CLASS}
                              aria-hidden
                              data-method-guide-guide-icon=""
                            />
                            <span>{t("methodGuide.guideTipName")}</span>
                            <span>{t("methodGuide.guideTipAfter")}</span>
                          </p>
                        ) : null}
                      </section>
                    ))}
                    <section
                      className="space-y-1.5"
                      data-method-guide-section="perspectives"
                      data-method-guide-tip="perspectives"
                    >
                      <h3 className="section-heading normal-case tracking-normal text-foreground/90">
                        {t("methodGuide.perspectivesTipHeading")}
                      </h3>
                      <p className="section-body">
                        {t("methodGuide.perspectivesTipText")}
                      </p>
                    </section>
                  </div>
                </div>
              </div>
            </div>,
            portalContainer,
          )
        : null}
      {aboutModelOpen && portalContainer
        ? createPortal(
            <div
              className={INFO_MODAL_BACKDROP_CLASS}
              role="presentation"
              data-about-model-backdrop=""
              onClick={() => setAboutModelOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="about-model-title"
                className={INFO_MODAL_PANEL_CLASS}
                data-about-model-panel=""
                onClick={(e) => e.stopPropagation()}
              >
                <div className={INFO_MODAL_HEADER_CLASS}>
                  <h2
                    id="about-model-title"
                    className="section-heading normal-case tracking-normal text-foreground/90"
                  >
                    {t("aboutModel.title")}
                  </h2>
                  <button
                    type="button"
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                    aria-label={t("aboutModel.closeDialog")}
                    onClick={() => setAboutModelOpen(false)}
                  >
                    <X className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <div className={INFO_MODAL_BODY_CLASS}>
                  <div className="space-y-2">
                    <p className="section-body">
                      {fillUncertaintyModelCopy(t("aboutModel.paragraph1"), {
                        language,
                        count: formatNumber(
                          simulationConfig.mainRuns,
                          0,
                          language,
                        ),
                      })}
                    </p>
                    <p className="section-body">{t("aboutModel.paragraph2")}</p>
                    <p className="section-body">{t("aboutModel.paragraph3")}</p>
                    <p className="section-body">{t("aboutModel.paragraph4")}</p>
                  </div>
                </div>
              </div>
            </div>,
            portalContainer,
          )
        : null}
      <ConfirmDialog
        open={signOutConfirmOpen}
        message={t("header.signOutConfirmMessage")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.confirm")}
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={confirmSignOut}
      />
    </>
  )
}
