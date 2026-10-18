import { useEffect, useRef, useState } from "react"
import { Check, Plus, X } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import {
  ASSUMPTION_MAX_LENGTH,
  parseAssumptionText,
  type ProjectAssumption,
} from "@/domain/analysis/assumptions"
import { cn } from "@/shared/utils"
import { assumptionInputClassName } from "@/features/guided-input/parts/guidedInputStyles"

export function GuidedAssumptionsPhase({
  assumptions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  assumptions: readonly ProjectAssumption[]
  onAdd: (text: string) => void
  onUpdate: (assumptionId: string, text: string) => void
  onRemove: (assumptionId: string) => void
}) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const addInputRef = useRef<HTMLInputElement | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus()
  }, [editingId])

  const openAdd = () => {
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
    const parsed = parseAssumptionText(draft)
    if (parsed === null) {
      cancelAdd()
      return
    }
    onAdd(parsed)
    cancelAdd()
  }

  const startEdit = (assumption: ProjectAssumption) => {
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
    if (editingId === null) return
    const parsed = parseAssumptionText(editDraft)
    if (parsed === null) {
      cancelEdit()
      return
    }
    onUpdate(editingId, parsed)
    cancelEdit()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="assumptions">
      <div className="space-y-2.5">
        <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedAssumptionsGuidance")}
        </p>
        <p className="m-0 font-sans text-[12px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedAssumptionsSecondaryGuidance")}
        </p>
        <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground/85">
          {t("inputs.guidedAssumptionsExamples")}
        </p>
      </div>

      {assumptions.length === 0 && !adding ? (
        <div className="space-y-3">
          <p className="m-0 font-sans text-[13px] text-muted-foreground">
            {t("inputs.guidedAssumptionsEmpty")}
          </p>
          <button
            type="button"
            onClick={openAdd}
            className={cn(
              "inline-flex items-center gap-1.5 font-sans text-[13px]",
              "text-[#1d868c] hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            )}
            data-guided-assumption-add=""
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            {t("inputs.guidedAssumptionsAdd")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={openAdd}
            className={cn(
              "inline-flex items-center gap-1.5 font-sans text-[12px]",
              "text-muted-foreground hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            )}
            data-guided-assumption-add=""
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            {t("inputs.guidedAssumptionsAdd")}
          </button>

          {adding ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <input
                ref={addInputRef}
                type="text"
                value={draft}
                maxLength={ASSUMPTION_MAX_LENGTH}
                placeholder={t("inputs.assumptionsPlaceholder")}
                aria-label={t("inputs.assumptionsPlaceholder")}
                data-guided-assumption-draft=""
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    e.stopPropagation()
                    commitAdd()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    e.stopPropagation()
                    cancelAdd()
                  }
                }}
                className={assumptionInputClassName}
              />
              <button
                type="button"
                onClick={commitAdd}
                aria-label={t("inputs.assumptionsSave")}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  "text-[#1d868c] hover:bg-[#1d868c]/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                )}
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : null}

          <ul className="m-0 list-none space-y-2 p-0">
            {assumptions.map((assumption) =>
              editingId === assumption.id ? (
                <li key={assumption.id} className="flex min-w-0 items-center gap-1.5">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editDraft}
                    maxLength={ASSUMPTION_MAX_LENGTH}
                    aria-label={t("inputs.assumptionsPlaceholder")}
                    data-guided-assumption-edit=""
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                        commitEdit()
                      } else if (e.key === "Escape") {
                        e.preventDefault()
                        e.stopPropagation()
                        cancelEdit()
                      }
                    }}
                    className={assumptionInputClassName}
                  />
                  <button
                    type="button"
                    onClick={commitEdit}
                    aria-label={t("inputs.assumptionsSave")}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      "text-[#1d868c] hover:bg-[#1d868c]/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                    )}
                  >
                    <Check className="size-3.5" aria-hidden />
                  </button>
                </li>
              ) : (
                <li
                  key={assumption.id}
                  className={cn(
                    "group/assumption flex min-w-0 items-center gap-1",
                    "rounded-md border border-border/60 bg-background",
                  )}
                  data-guided-assumption=""
                >
                  <button
                    type="button"
                    onClick={() => startEdit(assumption)}
                    className={cn(
                      "min-w-0 flex-1 truncate px-3 py-2 text-left",
                      "font-sans text-[13px] text-foreground",
                      "hover:bg-[#1d868c]/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d868c]/35",
                    )}
                  >
                    {assumption.text}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(assumption.id)}
                    aria-label={t("inputs.assumptionsRemove")}
                    className={cn(
                      "mr-1 flex size-7 shrink-0 items-center justify-center rounded",
                      "text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive",
                      "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                      "sm:opacity-0 sm:group-hover/assumption:opacity-100",
                    )}
                    data-guided-assumption-remove=""
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
