import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Settings2, X } from "lucide-react"

import { buttonVariants } from "@/shared/ui/button"
import { useI18n } from "@/i18n/useI18n"
import {
  formatPercentileLabel,
  formatResultPreferenceAmount,
  parseResultPreferenceAmount,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import { cn } from "@/shared/utils"

type ResultPreferencesPanelProps = {
  preferences: ResultPreferencesV1
  onChange: (next: ResultPreferencesV1) => void
  onAddKeyFigurePercentile: (p: number) => void
  onRemoveKeyFigurePercentile: (p: number) => void
  onAddSCurvePercentile: (p: number) => void
  onRemoveSCurvePercentile: (p: number) => void
  onSaveAsDefault: () => void
  onReset: () => void
  /**
   * Compact-only results: new percentiles / cost-level probability need a rerun
   * to compute. Controls stay editable so prefs persist for the next simulation.
   */
  compactDerivedMetricsDeferred?: boolean
}

const PANEL_CLASS =
  "w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(75vh,32rem)] overflow-y-auto rounded-md border border-border/70 bg-card px-3 py-3 text-left shadow-md"

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-0.5">
      <span className="font-sans text-[12px] text-foreground">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-[#1d868c]"
      />
    </label>
  )
}

function ProbabilityBelowAmountField({
  amount,
  onCommit,
  amountLabel,
  invalidLabel,
}: {
  amount: number | null
  onCommit: (next: number | null) => void
  amountLabel: string
  invalidLabel: string
}) {
  const { language } = useI18n()
  const inputId = useId()
  const suppressBlurCommitRef = useRef(false)
  const [draft, setDraft] = useState(() => formatResultPreferenceAmount(amount, language))
  const [showInvalid, setShowInvalid] = useState(false)

  useEffect(() => {
    setDraft(formatResultPreferenceAmount(amount, language))
    setShowInvalid(false)
  }, [amount, language])

  /** Shared Enter/blur path — returns true when a value was committed (incl. blank→null). */
  const commit = (): boolean => {
    const trimmed = draft.trim()
    if (trimmed === "") {
      onCommit(null)
      setDraft("")
      setShowInvalid(true)
      return true
    }
    const parsed = parseResultPreferenceAmount(draft, language)
    if (parsed === null) {
      setShowInvalid(true)
      return false
    }
    onCommit(parsed)
    setDraft(formatResultPreferenceAmount(parsed, language))
    setShowInvalid(false)
    return true
  }

  return (
    <div className="space-y-1 pl-0.5" data-result-pref-prob-below-amount="">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="shrink-0 font-sans text-[11px] text-muted-foreground">
          {amountLabel}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={amountLabel}
          aria-invalid={showInvalid || amount === null}
          onChange={(e) => {
            setDraft(e.target.value)
            setShowInvalid(false)
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            if (!commit()) return
            // Enter already committed; skip the blur-driven commit that follows.
            suppressBlurCommitRef.current = true
            e.currentTarget.blur()
          }}
          onBlur={() => {
            if (suppressBlurCommitRef.current) {
              suppressBlurCommitRef.current = false
              return
            }
            commit()
          }}
          className={cn(
            "h-7 min-w-0 flex-1 rounded border bg-background px-1.5",
            "font-sans text-[12px] tabular-nums outline-none",
            "focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            showInvalid || amount === null ? "border-[#c24141]/55" : "border-border/70",
          )}
          data-result-pref-prob-below-input=""
        />
      </div>
      {showInvalid || amount === null ? (
        <p className="m-0 font-sans text-[10px] text-[#c24141]/90">{invalidLabel}</p>
      ) : null}
    </div>
  )
}

function PercentileChips({
  percentiles,
  onRemove,
  addLabel,
  onAdd,
  inputAriaLabel,
}: {
  percentiles: readonly number[]
  onRemove: (p: number) => void
  addLabel: string
  onAdd: (p: number) => void
  inputAriaLabel: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const commit = () => {
    const n = Number(draft.replace(",", "."))
    if (Number.isFinite(n)) onAdd(n)
    setDraft("")
    setAdding(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {percentiles.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onRemove(p)}
            className={cn(
              "inline-flex items-center gap-1 rounded border border-border/60",
              "px-1.5 py-0.5 font-sans text-[11px] tabular-nums text-foreground",
              "hover:border-[#c24141]/40 hover:text-[#c24141]",
            )}
            aria-label={`${formatPercentileLabel(p)} −`}
            data-result-pref-percentile={p}
          >
            {formatPercentileLabel(p)}
            <span aria-hidden className="text-[10px] opacity-60">
              ×
            </span>
          </button>
        ))}
      </div>
      {adding ? (
        <div className="flex items-center gap-1.5">
          <span className="font-sans text-[12px] text-muted-foreground">P</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            aria-label={inputAriaLabel}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
              }
              if (e.key === "Escape") {
                e.preventDefault()
                setAdding(false)
                setDraft("")
              }
            }}
            onBlur={commit}
            className={cn(
              "h-7 w-14 rounded border border-border/70 bg-background px-1.5",
              "font-sans text-[12px] tabular-nums outline-none",
              "focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            )}
            data-result-pref-add-input=""
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="font-sans text-[12px] text-[#1d868c] hover:underline"
          data-result-pref-add-percentile=""
        >
          {addLabel}
        </button>
      )}
    </div>
  )
}

export function ResultPreferencesPanel({
  preferences,
  onChange,
  onAddKeyFigurePercentile,
  onRemoveKeyFigurePercentile,
  onAddSCurvePercentile,
  onRemoveSCurvePercentile,
  onSaveAsDefault,
  onReset,
  compactDerivedMetricsDeferred = false,
}: ResultPreferencesPanelProps) {
  const { t } = useI18n()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
    }
  }, [open])

  const kf = preferences.keyFigures

  return (
    <span className="inline-flex shrink-0 items-center" data-result-preferences="">
      <button
        ref={triggerRef}
        type="button"
        className={buttonVariants({
          variant: "ghost",
          size: "icon-sm",
          className: cn("text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground"),
        })}
        aria-label={t("resultPreferences.open")}
        title={t("resultPreferences.open")}
        aria-expanded={open}
        data-result-preferences-trigger=""
        onClick={() => setOpen((v) => !v)}
      >
        <Settings2 className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-3 sm:p-5"
              role="presentation"
              data-result-preferences-backdrop=""
              onClick={close}
            >
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={PANEL_CLASS}
                data-result-preferences-panel=""
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h4
                    id={titleId}
                    className="m-0 font-sans text-[13px] font-medium text-foreground"
                  >
                    {t("resultPreferences.title")}
                  </h4>
                  <button
                    type="button"
                    className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                    aria-label={t("resultPreferences.close")}
                    onClick={close}
                  >
                    <X className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </div>

                {compactDerivedMetricsDeferred ? (
                  <p
                    className="m-0 font-sans text-[11px] leading-snug text-muted-foreground"
                    role="note"
                    data-result-pref-compact-deferred=""
                  >
                    {t("resultPreferences.compactDerivedMetricsDeferred")}
                  </p>
                ) : null}

                <div className="space-y-3">
                  <section className="space-y-1">
                    <p className="m-0 font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("resultPreferences.keyFiguresHeading")}
                    </p>
                    <ToggleRow
                      id="rp-base"
                      label={t("resultPreferences.showBaseCost")}
                      checked={kf.showBaseCost}
                      onChange={(showBaseCost) =>
                        onChange({
                          ...preferences,
                          keyFigures: { ...kf, showBaseCost },
                        })
                      }
                    />
                    <ToggleRow
                      id="rp-ev"
                      label={t("resultPreferences.showExpectedValue")}
                      checked={kf.showExpectedValue}
                      onChange={(showExpectedValue) =>
                        onChange({
                          ...preferences,
                          keyFigures: { ...kf, showExpectedValue },
                        })
                      }
                    />
                    <ToggleRow
                      id="rp-ea"
                      label={t("resultPreferences.showExpectedAddition")}
                      checked={kf.showExpectedAddition}
                      onChange={(showExpectedAddition) =>
                        onChange({
                          ...preferences,
                          keyFigures: { ...kf, showExpectedAddition },
                        })
                      }
                    />
                    <ToggleRow
                      id="rp-reserve"
                      label={t("resultPreferences.showUncertaintyReserve")}
                      checked={kf.showUncertaintyReserve}
                      onChange={(showUncertaintyReserve) =>
                        onChange({
                          ...preferences,
                          keyFigures: { ...kf, showUncertaintyReserve },
                        })
                      }
                    />
                    <ToggleRow
                      id="rp-std"
                      label={t("resultPreferences.showStdDev")}
                      checked={kf.showStdDev}
                      onChange={(showStdDev) =>
                        onChange({
                          ...preferences,
                          keyFigures: { ...kf, showStdDev },
                        })
                      }
                    />
                    <ToggleRow
                      id="rp-prob"
                      label={t("resultPreferences.showProbabilityAtBaseCost")}
                      checked={kf.showProbabilityAtBaseCost}
                      onChange={(showProbabilityAtBaseCost) =>
                        onChange({
                          ...preferences,
                          keyFigures: { ...kf, showProbabilityAtBaseCost },
                        })
                      }
                    />
                    <div className="space-y-1">
                      <ToggleRow
                        id="rp-prob-below"
                        label={t("resultPreferences.showProbabilityBelowCostLevel")}
                        checked={kf.probabilityBelowCostLevel.enabled}
                        onChange={(enabled) =>
                          onChange({
                            ...preferences,
                            keyFigures: {
                              ...kf,
                              probabilityBelowCostLevel: {
                                ...kf.probabilityBelowCostLevel,
                                enabled,
                              },
                            },
                          })
                        }
                      />
                      {kf.probabilityBelowCostLevel.enabled ? (
                        <ProbabilityBelowAmountField
                          amount={kf.probabilityBelowCostLevel.amount}
                          amountLabel={t("resultPreferences.probabilityBelowAmount")}
                          invalidLabel={t("resultPreferences.probabilityBelowAmountInvalid")}
                          onCommit={(amount) =>
                            onChange({
                              ...preferences,
                              keyFigures: {
                                ...kf,
                                probabilityBelowCostLevel: {
                                  ...kf.probabilityBelowCostLevel,
                                  amount,
                                },
                              },
                            })
                          }
                        />
                      ) : null}
                    </div>
                  </section>

                  <section className="space-y-1.5">
                    <p className="m-0 font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("resultPreferences.percentilesHeading")}
                    </p>
                    <PercentileChips
                      percentiles={kf.percentiles}
                      onRemove={onRemoveKeyFigurePercentile}
                      onAdd={onAddKeyFigurePercentile}
                      addLabel={t("resultPreferences.addPercentile")}
                      inputAriaLabel={t("resultPreferences.percentileInput")}
                    />
                  </section>

                  <section className="space-y-1.5">
                    <p className="m-0 font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("resultPreferences.sCurveHeading")}
                    </p>
                    <ToggleRow
                      id="rp-scurve-sync"
                      label={t("resultPreferences.useSamePercentiles")}
                      checked={preferences.sCurve.useKeyFigurePercentiles}
                      onChange={(useKeyFigurePercentiles) =>
                        onChange({
                          ...preferences,
                          sCurve: {
                            ...preferences.sCurve,
                            useKeyFigurePercentiles,
                          },
                        })
                      }
                    />
                    {!preferences.sCurve.useKeyFigurePercentiles ? (
                      <PercentileChips
                        percentiles={preferences.sCurve.percentiles}
                        onRemove={onRemoveSCurvePercentile}
                        onAdd={onAddSCurvePercentile}
                        addLabel={t("resultPreferences.addPercentile")}
                        inputAriaLabel={t("resultPreferences.percentileInput")}
                      />
                    ) : null}
                  </section>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "default",
                        className: "h-8 bg-[#1d868c] px-2.5 text-[12px] hover:bg-[#1d868c]/90",
                      })}
                      data-result-pref-save=""
                      onClick={() => {
                        onSaveAsDefault()
                        setSavedFlash(true)
                        window.setTimeout(() => setSavedFlash(false), 1600)
                      }}
                    >
                      {t("resultPreferences.saveAsDefault")}
                    </button>
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className:
                          "h-8 px-2 text-[12px] text-muted-foreground hover:text-foreground",
                      })}
                      data-result-pref-reset=""
                      onClick={onReset}
                    >
                      {t("resultPreferences.reset")}
                    </button>
                  </div>
                  {savedFlash ? (
                    <p className="m-0 font-sans text-[11px] text-muted-foreground">
                      {t("resultPreferences.saved")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
