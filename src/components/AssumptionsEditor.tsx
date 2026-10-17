import { useEffect, useId, useRef, useState } from "react"
import { Check, Plus, X } from "lucide-react"

import {
  ASSUMPTION_MAX_LENGTH,
  type ProjectAssumption,
  parseAssumptionText,
} from "@/domain/analysis/assumptions"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/lib/utils"

type AssumptionsEditorProps = {
  assumptions: readonly ProjectAssumption[]
  /** When true, list is inspectable but add/edit/remove are unavailable. */
  readOnly?: boolean
  onAdd?: (text: string) => void
  onUpdate?: (assumptionId: string, text: string) => void
  onRemove?: (assumptionId: string) => void
}

export function AssumptionsEditor({
  assumptions,
  readOnly = false,
  onAdd,
  onUpdate,
  onRemove,
}: AssumptionsEditorProps) {
  const { t } = useI18n()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (!readOnly) return
    setAdding(false)
    setDraft("")
    setEditingId(null)
    setEditDraft("")
  }, [readOnly])

  const openAdd = () => {
    if (readOnly || !onAdd) return
    setEditingId(null)
    setEditDraft("")
    setDraft("")
    setAdding(true)
  }

  const cancelAdd = () => {
    setAdding(false)
    setDraft("")
  }

  const commitAdd = () => {
    if (readOnly || !onAdd) return
    const parsed = parseAssumptionText(draft)
    if (parsed === null) {
      cancelAdd()
      return
    }
    onAdd(parsed)
    cancelAdd()
  }

  const startEdit = (assumption: ProjectAssumption) => {
    if (readOnly || !onUpdate) return
    setAdding(false)
    setDraft("")
    setEditingId(assumption.id)
    setEditDraft(assumption.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft("")
  }

  const commitEdit = () => {
    if (readOnly || !onUpdate || editingId === null) return
    const parsed = parseAssumptionText(editDraft)
    if (parsed === null) {
      cancelEdit()
      return
    }
    onUpdate(editingId, parsed)
    cancelEdit()
  }

  const collapse = () => {
    setOpen(false)
    cancelAdd()
    cancelEdit()
  }

  const onHeaderAction = () => {
    if (open) {
      collapse()
      return
    }
    setOpen(true)
    if (!readOnly && assumptions.length === 0) {
      openAdd()
    }
  }

  const count = assumptions.length
  const statusText =
    count === 0 ? t("inputs.assumptionsNoneDefined") : String(count)
  const actionLabel = open
    ? t("inputs.assumptionsHide")
    : count === 0
      ? readOnly
        ? t("inputs.assumptionsShow")
        : t("inputs.assumptionsAddShort")
      : t("inputs.assumptionsShow")

  return (
    <div
      className="mb-2.5"
      data-assumptions-editor=""
      data-readonly={readOnly ? "" : undefined}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p
          className={cn(
            "m-0 min-w-0 font-sans text-[12px] font-medium leading-snug",
            "text-muted-foreground",
          )}
          data-assumptions-summary=""
        >
          <span>{t("inputs.assumptionsLabel")}</span>
          <span className="text-muted-foreground/70" aria-hidden>
            {" · "}
          </span>
          <span>{statusText}</span>
        </p>
        <button
          type="button"
          onClick={onHeaderAction}
          className={cn(
            "shrink-0 font-sans text-[12px] font-medium leading-snug",
            "text-muted-foreground/90 transition-colors",
            "hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35 focus-visible:ring-offset-1",
          )}
          data-assumptions-toggle=""
          aria-expanded={open}
        >
          {actionLabel}
        </button>
      </div>

      {open ? (
        <div className="mt-1.5 space-y-1.5" data-assumptions-panel="">
          {assumptions.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {assumptions.map((assumption) =>
                !readOnly && editingId === assumption.id ? (
                  <div
                    key={assumption.id}
                    className="relative flex min-w-[12rem] max-w-full flex-1 items-center"
                  >
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editDraft}
                      maxLength={ASSUMPTION_MAX_LENGTH}
                      aria-label={t("inputs.assumptionsPlaceholder")}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          commitEdit()
                        } else if (e.key === "Escape") {
                          e.preventDefault()
                          cancelEdit()
                        }
                      }}
                      className={cn(
                        "h-7 min-w-0 w-full rounded border border-border/70 bg-background py-0 pl-2 pr-7",
                        "font-sans text-[11px] text-foreground",
                        "outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                      )}
                    />
                    <button
                      type="button"
                      onClick={commitEdit}
                      aria-label={t("inputs.assumptionsSave")}
                      title={t("inputs.assumptionsSave")}
                      className={cn(
                        "absolute right-0.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded",
                        "text-[#1d868c] hover:bg-[#1d868c]/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                      )}
                    >
                      <Check className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div
                    key={assumption.id}
                    className={cn(
                      "group/assumption-chip relative inline-flex max-w-full items-center",
                      "rounded border border-border/70 bg-background",
                      !readOnly && "hover:border-border",
                    )}
                  >
                    {readOnly ? (
                      <span
                        className={cn(
                          "min-w-0 truncate py-0.5 pl-2 pr-2 text-left",
                          "font-sans text-[11px] leading-snug text-foreground",
                        )}
                      >
                        {assumption.text}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(assumption)}
                          className={cn(
                            "min-w-0 truncate py-0.5 pl-2 pr-5 text-left",
                            "font-sans text-[11px] leading-snug text-muted-foreground",
                            "hover:text-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                          )}
                        >
                          {assumption.text}
                        </button>
                        {onRemove ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onRemove(assumption.id)
                            }}
                            aria-label={t("inputs.assumptionsRemove")}
                            title={t("inputs.assumptionsRemove")}
                            className={cn(
                              "assumption-chip-remove absolute right-0.5 top-0.5",
                              "flex size-3.5 items-center justify-center rounded-sm",
                              "text-muted-foreground/70 hover:bg-muted hover:text-foreground",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                            )}
                          >
                            <X
                              className="size-2.5"
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : readOnly ? (
            <p className="m-0 font-sans text-[11px] text-muted-foreground">
              {t("inputs.assumptionsNoneDefined")}
            </p>
          ) : null}

          {readOnly ? null : adding ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <input
                ref={addInputRef}
                id={inputId}
                type="text"
                value={draft}
                maxLength={ASSUMPTION_MAX_LENGTH}
                placeholder={t("inputs.assumptionsPlaceholder")}
                aria-label={t("inputs.assumptionsPlaceholder")}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitAdd()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    cancelAdd()
                  }
                }}
                className={cn(
                  "h-7 min-w-0 flex-1 rounded border border-border/70 bg-background px-2",
                  "font-sans text-[11px] text-foreground placeholder:text-muted-foreground/60",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                )}
              />
              <button
                type="button"
                onClick={commitAdd}
                aria-label={t("inputs.assumptionsSave")}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded",
                  "text-[#1d868c] hover:bg-[#1d868c]/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                )}
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAdd}
              className={cn(
                "inline-flex items-center gap-1 font-sans text-[11px] leading-none",
                "text-muted-foreground/80 transition-colors",
                "hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35 focus-visible:ring-offset-1",
              )}
              data-assumptions-add=""
            >
              <Plus className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />
              {t("inputs.assumptionsAdd")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
