import { useEffect, useId, useRef, useState } from "react"

import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { useI18n } from "@/i18n/useI18n"
import {
  PROJECT_PROFILE_CATEGORIES,
  collectProjectProfileSummaryOptionIds,
  formatProjectProfileSummaryText,
  formatProjectQuantityValue,
  getPrimaryQuantityDefinition,
  getProjectTypeOptionIds,
  isProjectProfileEmpty,
  isSingleSelectCategory,
  parseProjectQuantityInput,
  planMultiSelectChange,
  planSingleSelectChange,
  setPrimaryQuantityValue,
  visibleProjectProfileFlowSteps,
  type ProfileChangePlan,
  type ProjectProfile,
  type ProjectProfileCategoryId,
  type ProjectQuantityDefinition,
} from "@/domain/analysis/projectProfile"
import { cn } from "@/shared/utils"
import { profileOptionKey, type MessageKey } from "@/i18n/messages"
import type { ProjectQuantityType, ProjectQuantityUnit } from "@/domain/analysis/projectProfile"

/**
 * Shared vertical rhythm between Project Profile category / quantity groups
 * (normal Input and Focus embedded). One step above the previous compact
 * `gap-2` stack — clearer scan separation without large blank bands.
 */
const PROJECT_PROFILE_GROUPS_GAP_CLASS = "gap-3.5"

/**
 * Shared group heading treatment (categories + Size/BTA).
 * One modest contrast step darker than plain muted-foreground, still grey.
 */
const PROJECT_PROFILE_GROUP_HEADING_CLASS =
  "m-0 font-sans font-medium tracking-wide text-foreground/60"

type ProjectProfileSectionProps = {
  profile: ProjectProfile | undefined
  readOnly?: boolean
  onChange?: (next: ProjectProfile | undefined) => void
  className?: string
  /** Starts closed — opens via the title disclosure. */
  defaultOpen?: boolean
  /**
   * Focus-mode phase host: editor content is always visible and the page
   * disclosure chrome (title trigger + collapsed summary) is omitted, because
   * the Focus shell already owns the phase title. Option cards use a larger,
   * more deliberate Focus-only presentation.
   */
  embedded?: boolean
}

function categoryLabelKey(categoryId: ProjectProfileCategoryId): MessageKey {
  return `projectProfile.categories.${categoryId}`
}

function quantityTypeLabelKey(type: ProjectQuantityType): MessageKey {
  return `projectProfile.quantityTypes.${type}`
}

function quantityUnitLabelKey(unit: ProjectQuantityUnit): MessageKey {
  return `projectProfile.quantityUnits.${unit}`
}

function PrimaryQuantityRow({
  definition,
  value,
  readOnly,
  onCommit,
  embedded,
}: {
  definition: ProjectQuantityDefinition
  value: number | undefined
  readOnly: boolean
  onCommit: (next: number | null) => void
  embedded: boolean
}) {
  const { t, language } = useI18n()
  const inputId = useId()
  const [text, setText] = useState(() =>
    value != null ? formatProjectQuantityValue(value, language) : "",
  )
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    setText(value != null ? formatProjectQuantityValue(value, language) : "")
  }, [value, language])

  const label = t(quantityTypeLabelKey(definition.type))
  const unit = t(quantityUnitLabelKey(definition.unit))
  const hasValue = value != null && Number.isFinite(value) && value > 0
  const selectedLook = hasValue && !focused

  const commit = () => {
    if (readOnly) return
    const parsed = parseProjectQuantityInput(text, language)
    if (parsed === null) {
      setText("")
      onCommit(null)
      return
    }
    setText(formatProjectQuantityValue(parsed, language))
    onCommit(parsed)
  }

  return (
    <div
      className="min-w-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-reduce:animate-none"
      data-project-profile-step="primaryQuantity"
      data-project-profile-quantity-filled={hasValue ? "true" : "false"}
    >
      <p
        className={cn(
          PROJECT_PROFILE_GROUP_HEADING_CLASS,
          embedded ? "mb-1 text-[11px]" : "mb-0.5 text-[10px]",
        )}
        data-project-profile-group-heading="primaryQuantity"
      >
        {t("projectProfile.sizeHeading")}
      </p>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center",
          embedded ? "gap-x-1.5 gap-y-1" : "gap-x-1.5 gap-y-0.5",
        )}
      >
        <label
          htmlFor={readOnly ? undefined : inputId}
          className={cn(
            "m-0 shrink-0 font-sans font-medium tracking-wide",
            "transition-colors duration-150",
            embedded ? "text-[11px]" : "text-[10px]",
            selectedLook ? "text-[#1d868c]" : "text-muted-foreground",
          )}
        >
          {label}
        </label>

        {readOnly ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded border font-sans tabular-nums",
              embedded
                ? "min-h-8 px-2.5 py-1.5 text-[12px] leading-snug"
                : "px-1.5 py-px text-[10.5px] leading-snug",
              hasValue
                ? "border-[#1d868c]/55 bg-[rgba(29,134,140,0.10)] text-[#1d868c]"
                : "border-border/45 bg-transparent text-muted-foreground",
            )}
            data-project-profile-quantity-value=""
          >
            {hasValue ? `${formatProjectQuantityValue(value, language)} ${unit}` : "—"}
          </span>
        ) : (
          <>
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              value={text}
              data-project-profile-quantity-input=""
              data-selected={selectedLook ? "true" : "false"}
              aria-label={`${label} (${unit})`}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                commit()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              className={cn(
                "shrink-0 rounded border font-sans tabular-nums",
                "transition-[color,background-color,border-color] duration-150",
                "placeholder:text-muted-foreground/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                embedded
                  ? "h-8 w-[5.5rem] px-2 text-[12px] leading-snug"
                  : "h-[1.375rem] w-[4.75rem] px-1.5 text-[10.5px] leading-snug",
                selectedLook
                  ? "border-[#1d868c]/55 bg-[rgba(29,134,140,0.10)] text-[#1d868c]"
                  : "border-border/45 bg-transparent text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "shrink-0 font-sans leading-snug",
                "transition-colors duration-150",
                embedded ? "text-[12px]" : "text-[10.5px]",
                selectedLook ? "text-[#1d868c]" : "text-muted-foreground",
              )}
            >
              {unit}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Lightweight left-aligned contextual disclosure between project tabs and
 * Cost Items. Title trigger + compact summary; outside click / Escape close
 * (same pattern as AnalysisActionsMenu).
 *
 * Progressive adaptive flow: only unlocked steps are shown. Changing or
 * clearing a categorical step clears all later steps after confirmation.
 * Editing the primary quantity value does not reset later steps.
 */
export function ProjectProfileSection({
  profile,
  readOnly = false,
  onChange,
  className,
  defaultOpen = false,
  embedded = false,
}: ProjectProfileSectionProps) {
  const { t } = useI18n()
  const [openState, setOpenState] = useState(defaultOpen)
  const open = embedded || openState
  const [pendingChange, setPendingChange] = useState<ProfileChangePlan | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelId = useId()
  const hasSelection = !isProjectProfileEmpty(profile)

  const summaryOptionIds = collectProjectProfileSummaryOptionIds(profile)
  const summaryText = hasSelection
    ? formatProjectProfileSummaryText(summaryOptionIds.map((id) => t(profileOptionKey(id))))
    : t("projectProfile.collapsedEmptyHint")

  // Shared outside-click + Escape pattern (mousedown on document, root contains).
  // Skip while a destructive-change dialog is open so Cancel/Confirm stay atomic.
  // Embedded has no disclosure to close, and Escape belongs to the Focus shell.
  useEffect(() => {
    if (embedded || !open || pendingChange) return
    const onDoc = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      setOpenState(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      setOpenState(false)
      triggerRef.current?.focus()
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [embedded, open, pendingChange])

  const apply = (next: ProjectProfile | undefined) => {
    if (readOnly || !onChange) return
    onChange(next)
  }

  const requestChange = (plan: ProfileChangePlan) => {
    if (readOnly || !onChange) return
    if (plan.needsConfirmation) {
      setPendingChange(plan)
      return
    }
    apply(plan.next)
  }

  const confirmPending = () => {
    if (!pendingChange) return
    const next = pendingChange.next
    setPendingChange(null)
    apply(next)
  }

  const cancelPending = () => {
    setPendingChange(null)
  }

  const warningMessage = pendingChange
    ? `${t("projectProfile.changeWillClearLater")} ${t("projectProfile.changeWillClearLaterHint")}`
    : ""

  const flowSteps = visibleProjectProfileFlowSteps(profile)
  const quantityDef = getPrimaryQuantityDefinition(profile?.projectType, profile?.projectArea)

  return (
    <section
      ref={rootRef}
      className={cn("group/project-profile min-w-0", className)}
      aria-label={t("projectProfile.heading")}
      data-project-profile=""
      data-open={open ? "true" : "false"}
      data-has-selection={hasSelection ? "true" : "false"}
      {...(embedded ? { "data-project-profile-embedded": "" } : {})}
    >
      {embedded ? null : (
        <div className="group/profile-trigger min-w-0">
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              "-ml-1 cursor-pointer rounded px-1 py-0.5 text-left font-sans text-[12px] font-medium tracking-wide",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              open
                ? "text-foreground"
                : cn(
                    "text-muted-foreground",
                    "group-hover/profile-trigger:text-foreground/85",
                    "group-focus-within/profile-trigger:text-foreground/85",
                  ),
            )}
            aria-expanded={open}
            aria-controls={panelId}
            data-project-profile-toggle=""
            onClick={() => setOpenState((v) => !v)}
          >
            {t("projectProfile.heading")}
          </button>
          <p
            className={cn(
              "m-0 max-w-full truncate font-sans text-[11px] leading-snug",
              "transition-colors duration-150",
              open
                ? "text-muted-foreground"
                : cn(
                    hasSelection ? "text-muted-foreground/75" : "text-muted-foreground/65",
                    "group-hover/profile-trigger:text-muted-foreground",
                    "group-focus-within/profile-trigger:text-muted-foreground",
                  ),
            )}
            data-project-profile-summary=""
          >
            {summaryText}
          </p>
        </div>
      )}

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={t("projectProfile.heading")}
          data-project-profile-body=""
          className={cn("min-w-0", embedded ? "mt-0" : "mt-2")}
        >
          {embedded ? (
            <p
              className="m-0 mb-3 font-sans text-[13px] leading-relaxed text-muted-foreground"
              data-project-profile-focus-intro=""
            >
              {t("projectProfile.focusIntro")}
            </p>
          ) : null}
          <div
            className={cn("flex flex-col", PROJECT_PROFILE_GROUPS_GAP_CLASS)}
            data-project-profile-groups=""
          >
            {flowSteps.map((stepId, index) => {
              if (stepId === "primaryQuantity") {
                if (!quantityDef) return null
                return (
                  <PrimaryQuantityRow
                    key={stepId}
                    definition={quantityDef}
                    value={profile?.primaryQuantity?.value}
                    readOnly={readOnly}
                    embedded={embedded}
                    onCommit={(next) => {
                      apply(setPrimaryQuantityValue(profile, next))
                    }}
                  />
                )
              }

              const category = PROJECT_PROFILE_CATEGORIES.find((c) => c.id === stepId)
              if (!category) return null
              const optionIds =
                stepId === "projectType"
                  ? getProjectTypeOptionIds(profile?.projectArea)
                  : category.optionIds

              const selectedSet =
                category.selection === "single"
                  ? new Set(
                      typeof profile?.[category.id] === "string"
                        ? [profile[category.id] as string]
                        : [],
                    )
                  : new Set(profile?.interventionTypes ?? [])

              return (
                <div
                  key={category.id}
                  className={cn(
                    "min-w-0",
                    index > 0 &&
                      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-reduce:animate-none",
                  )}
                  data-project-profile-step={category.id}
                >
                  <p
                    className={cn(
                      PROJECT_PROFILE_GROUP_HEADING_CLASS,
                      embedded ? "mb-1 text-[11px]" : "mb-0.5 text-[10px]",
                    )}
                    data-project-profile-group-heading={category.id}
                  >
                    {t(categoryLabelKey(category.id))}
                  </p>
                  {(() => {
                    const optionButtons = optionIds.map((optionId) => {
                      const selected = selectedSet.has(optionId)
                      return (
                        <button
                          key={`${category.id}:${optionId}`}
                          type="button"
                          disabled={readOnly}
                          aria-pressed={selected}
                          data-project-profile-option={`${category.id}:${optionId}`}
                          onClick={() => {
                            if (readOnly) return
                            if (isSingleSelectCategory(category.id)) {
                              requestChange(planSingleSelectChange(profile, category.id, optionId))
                            } else {
                              requestChange(
                                planMultiSelectChange(profile, "interventionTypes", optionId),
                              )
                            }
                          }}
                          className={cn(
                            "font-sans transition-[color,background-color,border-color,opacity] duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                            "disabled:cursor-default",
                            embedded
                              ? cn(
                                  "min-h-8 w-full justify-start rounded-md border px-2.5 py-1.5 text-left text-[12px] leading-snug",
                                  selected
                                    ? "border-[#1d868c]/65 bg-[rgba(29,134,140,0.11)] font-medium text-[#1d868c]"
                                    : cn(
                                        "border-border/50 bg-transparent text-muted-foreground",
                                        !readOnly &&
                                          "hover:border-border hover:bg-muted/40 hover:text-foreground/85",
                                      ),
                                )
                              : cn(
                                  "rounded border px-1.5 py-px text-[10.5px] leading-snug",
                                  selected
                                    ? "border-[#1d868c]/55 bg-[rgba(29,134,140,0.10)] text-[#1d868c]"
                                    : cn(
                                        "border-border/45 bg-transparent text-muted-foreground",
                                        !readOnly && "hover:border-border hover:text-foreground/80",
                                        !hasSelection &&
                                          "opacity-80 group-hover/project-profile:opacity-100 group-focus-within/project-profile:opacity-100",
                                      ),
                                ),
                          )}
                        >
                          {t(profileOptionKey(optionId))}
                        </button>
                      )
                    })

                    return embedded ? (
                      <div
                        className={cn(
                          "grid gap-1.5",
                          optionIds.length <= 2
                            ? "grid-cols-1 sm:grid-cols-2"
                            : optionIds.length <= 4
                              ? "grid-cols-1 sm:grid-cols-2"
                              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                        )}
                        data-project-profile-option-grid=""
                      >
                        {optionButtons}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-0.5">{optionButtons}</div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingChange)}
        message={warningMessage}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("projectProfile.confirmChange")}
        onCancel={cancelPending}
        onConfirm={confirmPending}
      />
    </section>
  )
}
