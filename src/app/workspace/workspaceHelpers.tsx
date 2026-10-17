import type { ReactNode, SetStateAction } from "react"

import { normalizeIncurredCosts, type Project } from "@/domain/analysis/project"
import {
  type CostElementRow,
  type DriverRow,
  isMeaningfullyFilledRow,
  parseCostForSimulation,
  parseDriverForSimulation,
  parseNumberField,
} from "@/domain/results/tableRows"

export function noticeWithColorWord(text: string, word: string, wordClassName: string): ReactNode {
  const index = text.indexOf(word)
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <span className={wordClassName}>{word}</span>
      {text.slice(index + word.length)}
    </>
  )
}

export const EMPTY_STALE_CELL_KEYS: ReadonlySet<string> = new Set()
export const VALIDATION_ERROR_KEYS = [
  "projects.invalidInputForRun",
  "projects.emptyCostBasisForRun",
] as const
export type ValidationErrorKey = (typeof VALIDATION_ERROR_KEYS)[number]
export type RunErrorKey = ValidationErrorKey | "projects.workerError"

export function patchProjectCostRows(
  projects: Project[],
  projectId: string,
  updater: SetStateAction<CostElementRow[]>,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const costRows = typeof updater === "function" ? updater(p.costRows) : updater
    return { ...p, costRows }
  })
}

export function patchProjectDriverRows(
  projects: Project[],
  projectId: string,
  updater: SetStateAction<DriverRow[]>,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const driverRows = typeof updater === "function" ? updater(p.driverRows) : updater
    return { ...p, driverRows }
  })
}

export function baseCostSumForProject(project: Project): number | null {
  let sum = normalizeIncurredCosts(project.incurredCosts)
  let hasAny = sum > 0
  for (const row of project.costRows) {
    const value = parseNumberField(row.likely)
    if (value !== null) {
      sum += value
      hasAny = true
    }
  }
  return hasAny ? sum : null
}

export function projectHasMeaningfulTableInput(project: Project): boolean {
  if (normalizeIncurredCosts(project.incurredCosts) > 0) return true
  return (
    project.costRows.some(isMeaningfullyFilledRow) ||
    project.driverRows.some(isMeaningfullyFilledRow)
  )
}

export function runValidationErrorKey(projects: readonly Project[]): ValidationErrorKey | null {
  const hasIncompleteStartedCosts = projects.some((proj) =>
    proj.costRows.some(
      (row) => isMeaningfullyFilledRow(row) && parseCostForSimulation(row) === null,
    ),
  )
  const hasIncompleteStartedDrivers = projects.some((proj) =>
    proj.driverRows.some(
      (row) => isMeaningfullyFilledRow(row) && parseDriverForSimulation(row) === null,
    ),
  )
  const anyProjectWithoutCosts = projects.some((proj) =>
    proj.costRows.every((row) => parseCostForSimulation(row) === null),
  )
  if (hasIncompleteStartedCosts || hasIncompleteStartedDrivers) {
    return "projects.invalidInputForRun"
  }
  if (anyProjectWithoutCosts) {
    return "projects.emptyCostBasisForRun"
  }
  return null
}
