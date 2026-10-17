import { useEffect, useRef, useState } from "react"
import { Check, Plus, X } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import {
  DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH,
  DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE,
  parseDriverUncertaintyNote,
} from "@/domain/results/rowDefinitions"
import type { DriverUncertaintyNotes } from "@/domain/results/tableRows"
import { cn } from "@/shared/utils"

export type DriverUncertaintyNotesEditorProps = {
  notes: DriverUncertaintyNotes | undefined
  onChange: (next: DriverUncertaintyNotes | undefined) => void
  className?: string
  /** Inspection-only: cards visible, no add/edit/remove. */
  readOnly?: boolean
}

type SideKey = keyof DriverUncertaintyNotes

const noteInputClassName = cn(
  "h-8 min-w-0 flex-1 rounded-md border border-border/70 bg-background px-2.5",
  "font-sans text-[13px] text-foreground placeholder:text-muted-foreground/60",
  "outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)

function coerceNotes(notes: DriverUncertaintyNotes | undefined): DriverUncertaintyNotes {
  return {
    lowerOutcome: [...(notes?.lowerOutcome ?? [])],
    higherOutcome: [...(notes?.higherOutcome ?? [])],
  }
}

function omitIfEmpty(notes: DriverUncertaintyNotes): DriverUncertaintyNotes | undefined {
  if (notes.lowerOutcome.length === 0 && notes.higherOutcome.length === 0) {
    return undefined
  }
  return notes
}

function NoteSide({
  side,
  percentileLabel,
  prompt,
  items,
  canAdd,
  readOnly = false,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
}: {
  side: SideKey
  percentileLabel: string
  prompt: string
  items: string[]
  canAdd: boolean
  readOnly?: boolean
  onAddNote: (text: string) => void
  onUpdateNote: (index: number, text: string) => void
  onRemoveNote: (index: number) => void
}) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const addInputRef = useRef<HTMLInputElement | null>(null)
  const editInputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    if (editingIndex === null) return
    const el = editInputRef.current
    if (!el) return
    el.focus()
    el.style.height = "0px"
    el.style.height = `${el.scrollHeight}px`
  }, [editingIndex, editDraft])

  const openAdd = () => {
    if (readOnly || !canAdd) return
    setEditingIndex(null)
    setEditDraft("")
    setDraft("")
    setAdding(true)
  }

  const cancelAdd = () => {
    setAdding(false)
    setDraft("")
  }

  const commitAdd = () => {
    const parsed = parseDriverUncertaintyNote(draft)
    if (parsed === null) {
      cancelAdd()
      return
    }
    onAddNote(parsed)
    cancelAdd()
  }

  /** Outside click / blur: empty → cancel; meaningful text → commit (no silent loss). */
  const handleAddBlur = () => {
    if (parseDriverUncertaintyNote(draft) === null) {
      cancelAdd()
      return
    }
    commitAdd()
  }

  const startEdit = (index: number, text: string) => {
    if (readOnly) return
    setAdding(false)
    setDraft("")
    setEditingIndex(index)
    setEditDraft(text)
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditDraft("")
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const parsed = parseDriverUncertaintyNote(editDraft)
    if (parsed === null) {
      cancelEdit()
      return
    }
    onUpdateNote(editingIndex, parsed)
    cancelEdit()
  }

  const draftCanCommit = parseDriverUncertaintyNote(draft) !== null
  const editCanCommit = parseDriverUncertaintyNote(editDraft) !== null

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2.5" data-driver-uncertainty-side={side}>
      <div className="space-y-1">
        <p className="m-0 text-center font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {percentileLabel}
        </p>
        <p className="m-0 text-center font-sans text-[12px] leading-snug text-muted-foreground">
          {prompt}
        </p>
      </div>

      {/* Cards always stack above the add control. */}
      <ul
        className={cn(
          "m-0 flex max-h-[11rem] min-h-0 list-none flex-col gap-2 overflow-y-auto overscroll-contain p-0 pr-0.5",
        )}
        data-driver-uncertainty-list=""
      >
        {items.map((item, index) =>
          !readOnly && editingIndex === index ? (
            <li
              key={`${side}-edit-${index}`}
              className={cn(
                "flex min-w-0 items-start gap-1",
                "rounded-md border border-border/60 bg-background",
              )}
              data-driver-uncertainty-edit=""
              data-driver-uncertainty-card-expanded=""
            >
              <textarea
                ref={editInputRef}
                value={editDraft}
                maxLength={DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH}
                rows={1}
                aria-label={t("inputs.guidedDriverUncertaintyNotePlaceholder")}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={() => {
                  // Collapse back to compact card after leaving the field.
                  commitEdit()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    e.stopPropagation()
                    commitEdit()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    e.stopPropagation()
                    cancelEdit()
                  }
                }}
                className={cn(
                  "min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-3 py-2",
                  "font-sans text-[13px] leading-snug text-foreground",
                  "whitespace-pre-wrap break-words",
                  "outline-none focus-visible:ring-0",
                )}
                data-driver-uncertainty-edit-input=""
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  // Keep focus long enough for click to register before blur commit.
                  e.preventDefault()
                }}
                onClick={commitEdit}
                disabled={!editCanCommit}
                aria-label={t("inputs.guidedDriverUncertaintyNoteConfirm")}
                className={cn(
                  "mr-1 mt-1 flex size-7 shrink-0 items-center justify-center rounded",
                  "text-[#1d868c] hover:bg-[#1d868c]/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                  !editCanCommit && "pointer-events-none opacity-40",
                )}
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </li>
          ) : (
            <li
              key={`${side}-${index}-${item}`}
              className={cn(
                "group/note flex h-9 min-w-0 items-center gap-1",
                "rounded-md border border-border/60 bg-background",
              )}
              data-driver-uncertainty-card=""
            >
              {readOnly ? (
                <span
                  title={item}
                  className={cn(
                    "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-left",
                    "font-sans text-[13px] leading-none text-foreground",
                  )}
                  data-driver-uncertainty-card-text=""
                >
                  {item}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(index, item)}
                  title={item}
                  className={cn(
                    "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-left",
                    "font-sans text-[13px] leading-none text-foreground",
                    "hover:bg-[#1d868c]/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d868c]/35",
                  )}
                  data-driver-uncertainty-card-text=""
                >
                  {item}
                </button>
              )}
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => onRemoveNote(index)}
                  aria-label={t("inputs.guidedDriverUncertaintyNoteRemove")}
                  className={cn(
                    "mr-1 flex size-7 shrink-0 items-center justify-center rounded",
                    "text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive",
                    "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                    "sm:opacity-0 sm:group-hover/note:opacity-100",
                  )}
                  data-driver-uncertainty-remove=""
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </li>
          ),
        )}
      </ul>

      {/* Add control is always the final item in the column. */}
      {!readOnly && (canAdd || adding) ? (
        <div className="space-y-2" data-driver-uncertainty-add-area="">
          {!adding ? (
            <button
              type="button"
              onClick={openAdd}
              disabled={!canAdd}
              className={cn(
                "inline-flex items-center gap-1.5 font-sans text-[12px]",
                items.length === 0
                  ? "text-[#1d868c] hover:underline"
                  : "text-muted-foreground hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                !canAdd && "pointer-events-none opacity-40",
              )}
              data-driver-uncertainty-add=""
            >
              <Plus className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              {t("inputs.guidedDriverUncertaintyNoteAdd")}
            </button>
          ) : null}

          {adding ? (
            <div className="flex min-w-0 items-center gap-1.5" data-driver-uncertainty-draft="">
              <input
                ref={addInputRef}
                type="text"
                value={draft}
                maxLength={DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH}
                placeholder={
                  side === "lowerOutcome"
                    ? t("inputs.guidedDriverUncertaintyNotePlaceholderLower")
                    : t("inputs.guidedDriverUncertaintyNotePlaceholderHigher")
                }
                aria-label={
                  side === "lowerOutcome"
                    ? t("inputs.guidedDriverUncertaintyNotePlaceholderLower")
                    : t("inputs.guidedDriverUncertaintyNotePlaceholderHigher")
                }
                data-driver-uncertainty-input=""
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleAddBlur}
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
                className={noteInputClassName}
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  // Keep focus until click commits — avoid blur-cancel racing confirm.
                  e.preventDefault()
                }}
                onClick={commitAdd}
                disabled={!draftCanCommit}
                aria-label={t("inputs.guidedDriverUncertaintyNoteConfirm")}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  "text-[#1d868c] hover:bg-[#1d868c]/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                  !draftCanCommit && "pointer-events-none opacity-40",
                )}
                data-driver-uncertainty-confirm=""
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Lightweight two-column qualitative notes for driver P10 / P90 reasoning.
 * Card interaction mirrors Assumptions; documentation only — not a sim input.
 */
export function DriverUncertaintyNotesEditor({
  notes,
  onChange,
  className,
  readOnly = false,
}: DriverUncertaintyNotesEditorProps) {
  const { t } = useI18n()
  const current = coerceNotes(notes)

  const commit = (next: DriverUncertaintyNotes) => {
    if (readOnly) return
    onChange(omitIfEmpty(next))
  }

  const addNote = (side: SideKey, text: string) => {
    const next = coerceNotes(current)
    if (next[side].length >= DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE) return
    const parsed = parseDriverUncertaintyNote(text)
    if (parsed === null) return
    next[side] = [...next[side], parsed]
    commit(next)
  }

  const updateNote = (side: SideKey, index: number, text: string) => {
    const next = coerceNotes(current)
    const parsed = parseDriverUncertaintyNote(text)
    if (parsed === null) return
    next[side] = [...next[side]]
    next[side][index] = parsed
    commit(next)
  }

  const removeNote = (side: SideKey, index: number) => {
    const next = coerceNotes(current)
    next[side] = next[side].filter((_, i) => i !== index)
    commit(next)
  }

  return (
    <div
      className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6", className)}
      data-driver-uncertainty-notes=""
      data-readonly={readOnly ? "" : undefined}
    >
      <NoteSide
        side="lowerOutcome"
        percentileLabel={t("inputs.guidedDriverUncertaintyLowerPercentile")}
        prompt={t("inputs.guidedDriverUncertaintyLowerPrompt")}
        items={current.lowerOutcome}
        canAdd={!readOnly && current.lowerOutcome.length < DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE}
        readOnly={readOnly}
        onAddNote={(text) => addNote("lowerOutcome", text)}
        onUpdateNote={(index, text) => updateNote("lowerOutcome", index, text)}
        onRemoveNote={(index) => removeNote("lowerOutcome", index)}
      />
      <NoteSide
        side="higherOutcome"
        percentileLabel={t("inputs.guidedDriverUncertaintyHigherPercentile")}
        prompt={t("inputs.guidedDriverUncertaintyHigherPrompt")}
        items={current.higherOutcome}
        canAdd={!readOnly && current.higherOutcome.length < DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE}
        readOnly={readOnly}
        onAddNote={(text) => addNote("higherOutcome", text)}
        onUpdateNote={(index, text) => updateNote("higherOutcome", index, text)}
        onRemoveNote={(index) => removeNote("higherOutcome", index)}
      />
    </div>
  )
}
