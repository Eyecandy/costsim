import type { ThemeId } from "@/design-lab/themes"

/**
 * Everything a look can change. A variant is a name plus a complete set of these options;
 * the lab page reads them and renders the matching parts. See `src/design-lab/README.md`.
 */
export type LabOptions = {
  theme: ThemeId
  header: {
    /** Note 1: the analysis name in the header bar ("center") or not ("none"). */
    fileName: "center" | "none"
    /** Note 9: a header that is clearly its own bar. */
    bar: "plain" | "distinct"
    /** Note 7: links and language next to the content ("content") or pushed to the far right ("farRight"). */
    nav: "content" | "farRight"
    /** Note 7: logged-in user and account menu. */
    user: boolean
  }
  /** Note 2: a narrow hidden rail ("rail") or an open library sidebar with a collapse arrow ("open"). */
  sidebar: "rail" | "open"
  /** Note 3: "Checkpoint 1" twice ("duplicate") or once ("once"). */
  checkpoint: "duplicate" | "once"
  /** Where the checkpoints live: as tabs above the tables ("tabs") or as a vertical timeline on the left ("timeline"). */
  checkpointNav: "tabs" | "timeline"
  /** Visible Save and Checkpoint buttons: none (only in the "..." menu, as today), beside the file name, or in the header bar. */
  documentActions: "none" | "inputRow" | "headerBar"
  /** Cost item and driver cards: with the up/down collapse arrow as today ("collapsible") or as plain cards ("plain"). */
  inputCards: "collapsible" | "plain"
  /** Whether the checkpoint being worked on is still open ("active": Neste checkpoint is locked) or archived ("archived": Neste checkpoint is open). */
  checkpointState: "active" | "archived"
  /** Where Fokusmodus sits: beside the profile as a button ("beside"), small in the profile header ("profileHeader"), as a slim bar under the profile ("bar"), only in the table toolbars ("toolbarOnly"), or on the same row as the file name ("titleRow"). */
  focusButton: "beside" | "profileHeader" | "bar" | "toolbarOnly" | "titleRow"
  /** Whether table toolbars (cost items and drivers) also have a Fokusmodus button. */
  focusInToolbar: boolean
  /** Note 4: the small INPUT label ("label") or the analysis name ("fileName"). */
  inputHeading: "label" | "fileName"
  /** Note 5: icon-only toolbar ("icons") or icon plus text ("labelled"). */
  toolbar: "icons" | "labelled"
  /** Note 6: modes in the toolbar ("modes") or actions directly on each row ("inline"). */
  rowActions: "modes" | "inline"
  cues: {
    /** Note 10: editable cells and the profile look editable. */
    editable: boolean
    /** Note 11: Fokusmodus and other actions look like buttons. */
    buttons: boolean
  }
  /** Idea: cost items and drivers stacked ("stacked") or side by side ("sideBySide"). */
  inputs: "stacked" | "sideBySide"
  /** Idea: results in one long column ("column") or as horizontal cards ("cards"). */
  results: "column" | "cards"
  /** Idea: run button and result at the side ("side"), in a bottom bar ("bottom") or a full-screen view ("fullscreen"). */
  simulation: "side" | "bottom" | "fullscreen"
}

export type LabVariant = {
  /** Two digits, also the URL: /design/03 */
  id: string
  title: string
  description: string
  /** Numbers from tasks/todo/UI/notes.txt that this look addresses (cumulative with earlier steps is fine). */
  notes: readonly number[]
  /** Short bullet list shown on the gallery card: what is different compared with the previous step. */
  changes: readonly string[]
  options: LabOptions
}
