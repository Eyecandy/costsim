import { useEffect, useId, useRef, useState } from "react"
import { Check } from "lucide-react"

import { DriverUncertaintyNotesEditor } from "@/features/scenario-tables/DriverUncertaintyNotesEditor"
import { buttonVariants } from "@/shared/ui/button"
import { useI18n } from "@/i18n/useI18n"
import {
  COST_DESCRIPTION_MAX_LENGTH,
  DRIVER_DESCRIPTION_MAX_LENGTH,
} from "@/domain/results/rowDefinitions"
import type { DriverUncertaintyNotes } from "@/domain/results/tableRows"
import { cn } from "@/shared/utils"

export type DefineCostEditorProps = {
  kind: "cost"
  rowId: string
  rowLabel: string
  description: string
  onCancel: () => void
  /** Inspection-only when viewing an archived analysis. */
  readOnly?: boolean
  /** Omitted in read-only inspection — no mutation path. */
  onSave?: (description: string) => void
}

export type DefineDriverSavePayload = {
  description: string
  uncertaintyNotes: DriverUncertaintyNotes | undefined
}

export type DefineDriverEditorProps = {
  kind: "driver"
  rowId: string
  rowLabel: string
  description: string
  uncertaintyNotes: DriverUncertaintyNotes | undefined
  onCancel: () => void
  /** Inspection-only when viewing an archived analysis. */
  readOnly?: boolean
  /** Omitted in read-only inspection — no mutation path. */
  onSave?: (payload: DefineDriverSavePayload) => void
}

export type DefineRowEditorProps = DefineCostEditorProps | DefineDriverEditorProps

export function DefineRowEditor(props: DefineRowEditorProps) {
  const { t } = useI18n()
  const readOnly = props.readOnly === true
  const descriptionId = useId()
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [descriptionDraft, setDescriptionDraft] = useState(props.description)
  const uncertaintyNotesProp = props.kind === "driver" ? props.uncertaintyNotes : undefined
  const [notesDraft, setNotesDraft] = useState<DriverUncertaintyNotes | undefined>(
    uncertaintyNotesProp,
  )

  useEffect(() => {
    setDescriptionDraft(props.description)
    if (props.kind === "driver") {
      setNotesDraft(props.uncertaintyNotes)
    }
  }, [props.rowId, props.description, props.kind, uncertaintyNotesProp])

  useEffect(() => {
    if (readOnly) return
    descriptionRef.current?.focus()
  }, [props.rowId, readOnly])

  const commit = () => {
    if (readOnly || !props.onSave) return
    if (props.kind === "cost") {
      props.onSave(descriptionDraft)
      return
    }
    props.onSave({
      description: descriptionDraft,
      uncertaintyNotes: notesDraft,
    })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      props.onCancel()
      return
    }
    if (readOnly) return
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      commit()
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Ctrl/Cmd+Enter shortcut for the whole form; the controls inside are the interactive elements
    <div
      className="space-y-2"
      onKeyDown={onKeyDown}
      data-define-row-editor=""
      data-define-kind={props.kind}
      data-readonly={readOnly ? "" : undefined}
    >
      <p className="truncate font-sans text-[11px] font-medium text-foreground/85">
        {props.rowLabel}
      </p>
      <div className="space-y-1">
        <label htmlFor={descriptionId} className="font-sans text-[11px] text-muted-foreground">
          {t("inputs.defineDescriptionLabel")}
        </label>
        <textarea
          ref={descriptionRef}
          id={descriptionId}
          rows={2}
          maxLength={
            props.kind === "cost" ? COST_DESCRIPTION_MAX_LENGTH : DRIVER_DESCRIPTION_MAX_LENGTH
          }
          value={descriptionDraft}
          readOnly={readOnly}
          onChange={(event) => {
            if (readOnly) return
            setDescriptionDraft(event.target.value)
          }}
          placeholder={
            props.kind === "cost"
              ? t("inputs.defineCostDescriptionPlaceholder")
              : t("inputs.defineDriverDescriptionPlaceholder")
          }
          className={cn(
            "w-full resize-y rounded-md border border-border/70 bg-background px-2 py-1.5",
            "font-sans text-[12px] leading-snug text-foreground",
            "placeholder:text-muted-foreground/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            readOnly && "cursor-default",
          )}
        />
      </div>

      {props.kind === "driver" ? (
        <div className="space-y-1.5 pt-1" data-define-driver-uncertainty-notes="">
          <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("inputs.guidedDriverUncertaintyNotesHeading")}
          </p>
          <DriverUncertaintyNotesEditor
            notes={notesDraft}
            readOnly={readOnly}
            onChange={(next) => {
              if (readOnly) return
              setNotesDraft(next)
            }}
          />
        </div>
      ) : null}

      <div className="flex justify-end">
        {readOnly ? (
          <button
            type="button"
            onClick={props.onCancel}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-7 px-2.5 text-[11px]",
            })}
          >
            {t("common.close")}
          </button>
        ) : (
          <button
            type="button"
            onClick={commit}
            aria-label={t("inputs.defineSave")}
            title={t("inputs.defineSave")}
            className={buttonVariants({
              variant: "outline",
              size: "icon-sm",
              className:
                "border-[#1d868c]/45 bg-[#1d868c]/10 text-[#1d868c] hover:bg-[#1d868c]/15 hover:text-[#1d868c]",
            })}
          >
            <Check className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
