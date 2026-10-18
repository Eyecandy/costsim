import type { ReactNode } from "react"

import { B_VARIANTS } from "@/design-lab/families/b"
import { BPage } from "@/design-lab/families/b/BPage"
import { C_VARIANTS } from "@/design-lab/families/c"
import { CPage } from "@/design-lab/families/c/CPage"
import { D_VARIANTS } from "@/design-lab/families/d"
import { DPage } from "@/design-lab/families/d/DPage"
import { E_VARIANTS } from "@/design-lab/families/e"
import { EPage } from "@/design-lab/families/e/EPage"
import { G_VARIANTS } from "@/design-lab/families/g"
import { GPage } from "@/design-lab/families/g/GPage"
import { F_VARIANTS } from "@/design-lab/families/f"
import { FPage } from "@/design-lab/families/f/FPage"
import { H_VARIANTS } from "@/design-lab/families/h"
import { HPage } from "@/design-lab/families/h/HPage"
import { LabPage } from "@/design-lab/LabPage"
import { VARIANTS } from "@/design-lab/variants"

/**
 * A family is a design direction with its own layout, parts and variants. Variants inside a family
 * are small steps on the same idea; a new family is for something that is not a step on the others.
 * To add one: a folder under `families/`, its variants, an entry here (see README).
 */
export type FamilyId = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"

export type LabFamily = { id: FamilyId; name: string; description: string }

export const FAMILIES: readonly LabFamily[] = [
  {
    id: "a",
    name: "Dagens side, steg for steg",
    description:
      "Beholder dagens oppsett og endrer litt om gangen, etter punktene i notatene. Hvert steg bygger på forrige.",
  },
  {
    id: "b",
    name: "Arbeidsbord",
    description:
      "En helt ny design, ikke et steg fra dagens side: smal ikonmeny, kommandolinje med checkpoint-steg og handlinger, inndata i faner og resultater som store nøkkeltall og diagrammer.",
  },
  {
    id: "c",
    name: "Kort og celler",
    description:
      "Samme enkle side, men fokus på hvordan kortene og cellene ser ut: myke, flate, omrammede eller fargede kort, og celler som understrek, felt, piller, sebra eller spredningsstolper. Bibliotek med søk og mapper til venstre.",
  },
  {
    id: "d",
    name: "Veiviser",
    description:
      "Helt annerledes: ett steg om gangen (prosjekt, kostnadsposter, drivere, resultat) med en stegindikator, korte forklaringer og store, rolige celler. For den som ikke kan hele siden fra før.",
  },
  {
    id: "e",
    name: "Dokument med resultatskinne",
    description:
      "Én lang side som et dokument: profil, kostnadsposter og drivere under hverandre, mens resultatene alltid er i sikte, enten i en skinne til høyre eller som et felt øverst.",
  },
  {
    id: "f",
    name: "Regneark",
    description:
      "Som et regneark: kostnadsposter og drivere er to blokker i ett ark med kolonnebokstaver, fast topptekst og sumlinjer. En formellinje viser valgt celle (lav, mest sannsynlig, høy), og resultatene ligger under arket eller i et panel til høyre.",
  },
  {
    id: "g",
    name: "Kortliste, nettbrett først",
    description:
      "Berøringsvennlig: hver kostnadspost og hver driver er et eget kort av samme størrelse med navn og en liten skala for lav, mest sannsynlig og høy. Store trykkflater, et kort for å legge til, og en bunnskuff eller fast bunnlinje for resultater og Kjør simulering. To kolonner på bred skjerm, én på smal.",
  },
  {
    id: "h",
    name: "Rapport først",
    description:
      "Siden åpner som en ryddig rapport med store P50/P85-tall, S-kurve og tornado. Inndata ligger bak Les / Rediger: i Les er kostnadsposter og drivere rene oppsummeringer som passer i et møte, i Rediger åpnes romslige tabeller i en skuff eller på siden.",
  },
]

export type LabEntry = {
  /** "a04": family letter plus id. Used in URLs and compare links. */
  key: string
  family: FamilyId
  id: string
  title: string
  description: string
  notes: readonly number[]
  changes: readonly string[]
  render: () => ReactNode
}

export const ENTRIES: readonly LabEntry[] = [
  ...VARIANTS.map((variant): LabEntry => ({
    key: `a${variant.id}`,
    family: "a",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: variant.notes,
    changes: variant.changes,
    render: () => <LabPage variant={variant} />,
  })),
  ...C_VARIANTS.map((variant): LabEntry => ({
    key: `c${variant.id}`,
    family: "c",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <CPage variant={variant} />,
  })),
  ...D_VARIANTS.map((variant): LabEntry => ({
    key: `d${variant.id}`,
    family: "d",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <DPage variant={variant} />,
  })),
  ...E_VARIANTS.map((variant): LabEntry => ({
    key: `e${variant.id}`,
    family: "e",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <EPage variant={variant} />,
  })),
  ...G_VARIANTS.map((variant): LabEntry => ({
    key: `g${variant.id}`,
    family: "g",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <GPage variant={variant} />,
  })),
  ...F_VARIANTS.map((variant): LabEntry => ({
    key: `f${variant.id}`,
    family: "f",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <FPage variant={variant} />,
  })),
  ...B_VARIANTS.map((variant): LabEntry => ({
    key: `b${variant.id}`,
    family: "b",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <BPage variant={variant} />,
  })),
  ...H_VARIANTS.map((variant): LabEntry => ({
    key: `h${variant.id}`,
    family: "h",
    id: variant.id,
    title: variant.title,
    description: variant.description,
    notes: [],
    changes: variant.changes,
    render: () => <HPage variant={variant} />,
  })),
]

export function getEntry(family: string, id: string): LabEntry | undefined {
  return ENTRIES.find((entry) => entry.family === family && entry.id === id)
}

/** "A04": what to call a look when asking for changes. */
export function entryLabel(entry: LabEntry): string {
  return `${entry.family.toUpperCase()}${entry.id}`
}

export function entryPath(entry: LabEntry): string {
  return `/design/${entry.family}/${entry.id}`
}

export function entriesOf(family: FamilyId): LabEntry[] {
  return ENTRIES.filter((entry) => entry.family === family)
}

/** Old links like `a00` from before families, or bare ids like `00`, mean family A. */
export function entryByKey(key: string | null): LabEntry | undefined {
  if (!key) return undefined
  const match = key.match(/^([a-z])?(\d{2})$/)
  if (!match) return undefined
  return getEntry(match[1] ?? "a", match[2] ?? "")
}
