import type { LabOptions } from "@/design-lab/variants/types"

/** Today's page. Every variant starts from this and changes only what it wants to show. */
export const BASE_OPTIONS: LabOptions = {
  theme: "current",
  header: { fileName: "center", bar: "plain", nav: "content", user: false },
  sidebar: "rail",
  checkpoint: "duplicate",
  checkpointNav: "tabs",
  documentActions: "none",
  inputCards: "collapsible",
  checkpointState: "active",
  focusButton: "beside",
  focusInToolbar: true,
  inputHeading: "label",
  toolbar: "icons",
  rowActions: "modes",
  cues: { editable: false, buttons: false },
  inputs: "stacked",
  results: "column",
  simulation: "side",
}
