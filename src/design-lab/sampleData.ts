/** Static sample data for the mock pages. Nothing here is real; numbers are invented. */

export const FILE_NAME = "Ullern renovering"

export type SampleRow = { name: string; optimistic: string; likely: string; pessimistic: string }

export const COST_ROWS: readonly SampleRow[] = [
  { name: "Grunnarbeid", optimistic: "-10 %", likely: "1 250 000", pessimistic: "30 %" },
  { name: "Konstruksjon", optimistic: "-5 %", likely: "4 800 000", pessimistic: "20 %" },
  { name: "Elektro og VVS", optimistic: "-8 %", likely: "1 900 000", pessimistic: "25 %" },
  { name: "Prosjektering", optimistic: "-5 %", likely: "650 000", pessimistic: "15 %" },
]

export const DRIVER_ROWS: readonly SampleRow[] = [
  { name: "Markedsprisvekst", optimistic: "-2 %", likely: "3 %", pessimistic: "10 %" },
  { name: "Forsinkelse", optimistic: "-5 %", likely: "5 %", pessimistic: "20 %" },
  { name: "Grunnforhold", optimistic: "0 %", likely: "2 %", pessimistic: "15 %" },
]

/** The driver row that is shown as selected in the "row actions" looks. */
export const SELECTED_DRIVER = "Forsinkelse"

export const IMPACT_ON_COSTS: readonly { name: string; percent: number }[] = [
  { name: "Grunnarbeid", percent: 30 },
  { name: "Konstruksjon", percent: 70 },
  { name: "Elektro og VVS", percent: 40 },
  { name: "Prosjektering", percent: 10 },
]

export type SampleCheckpoint = {
  sequence: number
  name: string
  date: string
  status: "archived" | "active"
}

/** The timeline looks show an ongoing analysis that has two archived checkpoints and an active third. */
export const CHECKPOINTS: readonly SampleCheckpoint[] = [
  { sequence: 1, name: "Konseptfase", date: "12. mar 2026", status: "archived" },
  { sequence: 2, name: "Forprosjekt", date: "2. juni 2026", status: "archived" },
  { sequence: 3, name: "Detaljprosjekt", date: "Pågår", status: "active" },
]

export const EMPTY_ROW_COUNT = 4

export const INCURRED_COSTS = "250 000"
export const BASE_COST = "8 850 000"

export const KEY_FIGURES = {
  baseCost: "8 850 000",
  expectedAddition: "+1 120 000",
  expectedAdditionPercent: "(12,7 %)",
  p50: "9 970 000",
  uncertaintyReserve: "1 480 000",
  p85: "11 450 000",
} as const

export const LIBRARY_FOLDERS: readonly { name: string; analyses: readonly string[] }[] = [
  { name: "Bygg", analyses: ["Ullern renovering", "Skøyen skole"] },
  { name: "Samferdsel", analyses: ["Ring 3 utvidelse"] },
]

export type LibraryStatus = "draft" | "archived" | "deleted"

export const LIBRARY_ANALYSES: readonly {
  name: string
  status: LibraryStatus
  folder: string
  updated: string
}[] = [
  { name: "Ullern renovering", status: "draft", folder: "Bygg", updated: "I dag 14:32" },
  { name: "Ring 3 utvidelse", status: "draft", folder: "Samferdsel", updated: "3. okt" },
  { name: "Sandvika bru", status: "draft", folder: "Samferdsel", updated: "30. sep" },
  { name: "Skøyen skole", status: "archived", folder: "Bygg", updated: "12. sep" },
  { name: "Fornebu kontor", status: "archived", folder: "Bygg", updated: "28. aug" },
  { name: "Gammel variant", status: "deleted", folder: "Bygg", updated: "Slettet 2. okt" },
]

export const USER = { name: "Joakim N.", initials: "JN" }
