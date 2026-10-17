/**
 * Structured Project Profile — contextual metadata only.
 * Does not affect Monte Carlo or any analytical calculations.
 *
 * Project cost size is derived via {@link computeBaseCostSum} /
 * `deriveProjectProfileBaseCost` in project.ts — not a user chip.
 */

export type ProjectAreaId =
  | "buildings"
  | "transport"
  | "energy"
  | "water_wastewater"
  | "industry"
  | "other"

export type ProjectProfileCategoryId =
  | "projectArea"
  | "projectType"
  | "interventionTypes"
  | "phase"
  | "deliveryModel"

/** Ordered flow steps — includes non-chip steps such as primary quantity. */
export type ProjectProfileFlowStepId =
  | ProjectProfileCategoryId
  | "primaryQuantity"

export type ProjectProfileSelectionMode = "single" | "multi"

/** Stable quantity characteristic IDs (never localized labels). */
export type ProjectQuantityType =
  | "gross_floor_area"
  | "length"
  | "tunnel_length"
  | "bridge_length"
  | "capacity"

export type ProjectQuantityUnit = "m2" | "km" | "m" | "mw"

/** One optional primary size measure — metadata only, not used in simulation. */
export type ProjectPrimaryQuantity = {
  type: string
  value: number
  unit: string
}

export type ProjectQuantityDefinition = {
  type: ProjectQuantityType
  unit: ProjectQuantityUnit
}

/** Persisted profile: stable option IDs only (never localized labels). */
export type ProjectProfile = {
  projectArea?: string
  projectType?: string
  /** Optional type-specific size measure for future benchmarking. */
  primaryQuantity?: ProjectPrimaryQuantity
  interventionTypes?: string[]
  /** Primary stage at analysis (stable IDs). Field name kept as `phase` for share/storage compat. */
  phase?: string
  deliveryModel?: string
}

export type ProjectProfileCategoryDef = {
  id: ProjectProfileCategoryId
  selection: ProjectProfileSelectionMode
  /** Stable option IDs in display order (projectType is area-dependent — see mapping). */
  optionIds: readonly string[]
}

export const PROJECT_AREA_OPTION_IDS = [
  "buildings",
  "transport",
  "energy",
  "water_wastewater",
  "industry",
  "other",
] as const satisfies readonly ProjectAreaId[]

/** Project Type options keyed by Project Area. */
export const PROJECT_TYPES_BY_AREA: Readonly<
  Record<ProjectAreaId, readonly string[]>
> = {
  buildings: [
    "education",
    "healthcare",
    "office",
    "culture_sports",
    "emergency_defence",
    "residential",
    "other",
  ],
  transport: [
    "road",
    "rail",
    "tunnel",
    "bridge",
    "transport_hub",
    "other",
  ],
  energy: [
    "generation",
    "grid_transmission",
    "substation_transformer",
    "energy_storage",
    "other",
  ],
  water_wastewater: [
    "water_supply",
    "wastewater",
    "pipeline_network",
    "treatment_plant",
    "pumping_station",
    "other",
  ],
  industry: [
    "production_facility",
    "process_plant",
    "warehouse_logistics",
    "technical_infrastructure",
    "other",
  ],
  other: ["other"],
}

const ALL_PROJECT_TYPE_IDS = new Set(
  Object.values(PROJECT_TYPES_BY_AREA).flatMap((ids) => [...ids]),
)

const BTA: ProjectQuantityDefinition = {
  type: "gross_floor_area",
  unit: "m2",
}
const LENGTH_KM: ProjectQuantityDefinition = {
  type: "length",
  unit: "km",
}
const TUNNEL_LENGTH_KM: ProjectQuantityDefinition = {
  type: "tunnel_length",
  unit: "km",
}
const BRIDGE_LENGTH_M: ProjectQuantityDefinition = {
  type: "bridge_length",
  unit: "m",
}
const CAPACITY_MW: ProjectQuantityDefinition = {
  type: "capacity",
  unit: "mw",
}

/**
 * Central Project Type → primary quantity definition.
 * Unmapped types intentionally omit a quantity field.
 * Note: id `other` is area-scoped — only Buildings “other” uses BTA.
 */
export const PRIMARY_QUANTITY_BY_PROJECT_TYPE: Readonly<
  Partial<Record<string, ProjectQuantityDefinition>>
> = {
  education: BTA,
  healthcare: BTA,
  office: BTA,
  culture_sports: BTA,
  emergency_defence: BTA,
  residential: BTA,
  road: LENGTH_KM,
  rail: LENGTH_KM,
  tunnel: TUNNEL_LENGTH_KM,
  bridge: BRIDGE_LENGTH_M,
  generation: CAPACITY_MW,
}

/**
 * Resolve quantity definition for a Project Type (optionally within an area).
 */
export function getPrimaryQuantityDefinition(
  projectType: string | undefined,
  projectArea?: string | undefined,
): ProjectQuantityDefinition | undefined {
  if (!projectType) return undefined
  if (projectType === "other") {
    return projectArea === "buildings" ? BTA : undefined
  }
  return PRIMARY_QUANTITY_BY_PROJECT_TYPE[projectType]
}

/** Central taxonomy — labels live in i18n; IDs stay stable. */
export const PROJECT_PROFILE_CATEGORIES: readonly ProjectProfileCategoryDef[] = [
  {
    id: "projectArea",
    selection: "single",
    optionIds: PROJECT_AREA_OPTION_IDS,
  },
  {
    id: "projectType",
    selection: "single",
    /** Display options come from {@link getProjectTypeOptionIds}; this is the union. */
    optionIds: [...ALL_PROJECT_TYPE_IDS],
  },
  {
    id: "interventionTypes",
    selection: "multi",
    optionIds: [
      "new_facility",
      "expansion",
      "rehabilitation_renewal",
      "modification",
      "combined",
    ],
  },
  {
    id: "phase",
    selection: "single",
    optionIds: [
      "study",
      "concept",
      "preliminary_design",
      "detailed_design",
      "execution",
      "handover",
    ],
  },
  {
    id: "deliveryModel",
    selection: "single",
    optionIds: [
      "not_contracted",
      "design_bid_build",
      "design_build",
      "partnering",
      "multiple_contracts",
    ],
  },
] as const

const OPTION_ID_SET_BY_CATEGORY: Record<
  ProjectProfileCategoryId,
  ReadonlySet<string>
> = {
  projectArea: new Set(PROJECT_AREA_OPTION_IDS),
  projectType: ALL_PROJECT_TYPE_IDS,
  interventionTypes: new Set(
    PROJECT_PROFILE_CATEGORIES.find((c) => c.id === "interventionTypes")!
      .optionIds,
  ),
  phase: new Set(
    PROJECT_PROFILE_CATEGORIES.find((c) => c.id === "phase")!.optionIds,
  ),
  deliveryModel: new Set(
    PROJECT_PROFILE_CATEGORIES.find((c) => c.id === "deliveryModel")!.optionIds,
  ),
}

const ALL_OPTION_IDS = new Set([
  ...PROJECT_AREA_OPTION_IDS,
  ...ALL_PROJECT_TYPE_IDS,
  ...OPTION_ID_SET_BY_CATEGORY.interventionTypes,
  ...OPTION_ID_SET_BY_CATEGORY.phase,
  ...OPTION_ID_SET_BY_CATEGORY.deliveryModel,
])

/**
 * Map renamed / legacy option IDs onto the current taxonomy.
 * Uncertainty-like legacy fields are dropped (not mapped).
 */
const LEGACY_OPTION_ALIASES: Readonly<Record<string, string>> = {
  // Phase / primary stage
  early_phase: "study",
  concept_preliminary: "preliminary_design",
  // Intervention
  rehabilitation: "rehabilitation_renewal",
  modification_renewal: "modification",
  renewal_maintenance: "rehabilitation_renewal",
  // Delivery
  main_contract: "design_bid_build",
}

function aliasOptionId(id: string): string {
  return LEGACY_OPTION_ALIASES[id] ?? id
}

export function isProjectAreaId(id: string): id is ProjectAreaId {
  return (PROJECT_AREA_OPTION_IDS as readonly string[]).includes(id)
}

export function getProjectTypeOptionIds(
  projectArea: string | undefined,
): readonly string[] {
  if (!projectArea || !isProjectAreaId(projectArea)) return []
  return PROJECT_TYPES_BY_AREA[projectArea]
}

export function isProjectTypeValidForArea(
  projectType: string | undefined,
  projectArea: string | undefined,
): boolean {
  if (!projectType || !projectArea) return false
  return getProjectTypeOptionIds(projectArea).includes(projectType)
}

export function emptyProjectProfile(): ProjectProfile {
  return {}
}

export function isProjectProfileEmpty(
  profile: ProjectProfile | null | undefined,
): boolean {
  if (!profile) return true
  if (profile.projectArea) return false
  if (profile.projectType) return false
  if (profile.primaryQuantity) return false
  if (profile.phase) return false
  if (profile.deliveryModel) return false
  if ((profile.interventionTypes?.length ?? 0) > 0) return false
  return true
}

function sortIdsByTaxonomy(
  categoryId: ProjectProfileCategoryId,
  ids: readonly string[],
  projectArea?: string,
): string[] {
  const order =
    categoryId === "projectType"
      ? getProjectTypeOptionIds(projectArea)
      : PROJECT_PROFILE_CATEGORIES.find((c) => c.id === categoryId)?.optionIds
  if (!order || order.length === 0) return [...ids]
  const rank = new Map(order.map((id, i) => [id, i]))
  return [...ids].sort(
    (a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999),
  )
}

function sanitizeSingle(
  categoryId: Exclude<ProjectProfileCategoryId, "interventionTypes">,
  raw: unknown,
): string | undefined {
  if (typeof raw !== "string") return undefined
  const id = aliasOptionId(raw)
  return OPTION_ID_SET_BY_CATEGORY[categoryId].has(id) ? id : undefined
}

function sanitizeMulti(
  categoryId: "interventionTypes",
  raw: unknown,
): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const allowed = OPTION_ID_SET_BY_CATEGORY[categoryId]
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== "string") continue
    const id = aliasOptionId(item)
    if (!allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  if (out.length === 0) return undefined
  return sortIdsByTaxonomy(categoryId, out)
}

function sanitizePrimaryQuantity(
  raw: unknown,
  projectType: string | undefined,
  projectArea: string | undefined,
): ProjectPrimaryQuantity | undefined {
  const def = getPrimaryQuantityDefinition(projectType, projectArea)
  if (!def || raw == null || typeof raw !== "object") return undefined
  const o = raw as Record<string, unknown>
  const value = typeof o.value === "number" ? o.value : Number(o.value)
  if (!Number.isFinite(value) || !(value > 0)) return undefined
  // Coerce to the definition for the current project type (ignore stale type/unit).
  return { type: def.type, value, unit: def.unit }
}

/**
 * Normalize unknown JSON into a ProjectProfile.
 * Unsupported / uncertainty-like keys and unknown IDs are dropped.
 * Incompatible projectType for projectArea is cleared.
 * Empty → undefined (omit from Project). Document load never throws.
 */
export function normalizeProjectProfile(
  raw: unknown,
): ProjectProfile | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  const o = raw as Record<string, unknown>

  const projectArea = sanitizeSingle("projectArea", o.projectArea)
  // Accept legacy `projectPhase` alias if present.
  const phase =
    sanitizeSingle("phase", o.phase) ??
    sanitizeSingle("phase", o.projectPhase)
  const deliveryModel = sanitizeSingle("deliveryModel", o.deliveryModel)
  const interventionTypes = sanitizeMulti(
    "interventionTypes",
    o.interventionTypes,
  )

  let projectType = sanitizeSingle("projectType", o.projectType)
  if (!isProjectTypeValidForArea(projectType, projectArea)) {
    projectType = undefined
  }

  const primaryQuantity = sanitizePrimaryQuantity(
    o.primaryQuantity,
    projectType,
    projectArea,
  )

  const next: ProjectProfile = {
    ...(projectArea ? { projectArea } : {}),
    ...(projectType ? { projectType } : {}),
    ...(primaryQuantity ? { primaryQuantity } : {}),
    ...(interventionTypes ? { interventionTypes } : {}),
    ...(phase ? { phase } : {}),
    ...(deliveryModel ? { deliveryModel } : {}),
  }

  return isProjectProfileEmpty(next) ? undefined : next
}

/** Deep-clone profile arrays/objects so project duplication stays independent. */
export function cloneProjectProfile(
  profile: ProjectProfile | undefined,
): ProjectProfile | undefined {
  const normalized = normalizeProjectProfile(profile)
  if (!normalized) return undefined
  return {
    ...(normalized.projectArea ? { projectArea: normalized.projectArea } : {}),
    ...(normalized.projectType ? { projectType: normalized.projectType } : {}),
    ...(normalized.primaryQuantity
      ? { primaryQuantity: { ...normalized.primaryQuantity } }
      : {}),
    ...(normalized.interventionTypes
      ? { interventionTypes: [...normalized.interventionTypes] }
      : {}),
    ...(normalized.phase ? { phase: normalized.phase } : {}),
    ...(normalized.deliveryModel
      ? { deliveryModel: normalized.deliveryModel }
      : {}),
  }
}

export function getMultiSelected(
  profile: ProjectProfile | undefined,
  categoryId: "interventionTypes",
): readonly string[] {
  return profile?.[categoryId] ?? []
}

export function getSingleSelected(
  profile: ProjectProfile | undefined,
  categoryId: Exclude<ProjectProfileCategoryId, "interventionTypes">,
): string | undefined {
  return profile?.[categoryId]
}

export function isSingleSelectCategory(
  categoryId: ProjectProfileCategoryId,
): categoryId is Exclude<ProjectProfileCategoryId, "interventionTypes"> {
  return categoryId !== "interventionTypes"
}

/**
 * Progressive adaptive flow — ordered steps are the source of truth for
 * reveal and for sequential reset (changing step N clears N+1…end).
 *
 * Extensible: append future steps (e.g. subtype) to stepOrder only.
 */
export const PROJECT_PROFILE_FLOW = {
  /** Display / reset order of progressive steps. */
  stepOrder: [
    "projectArea",
    "projectType",
    "primaryQuantity",
    "interventionTypes",
    "phase",
    "deliveryModel",
  ] as const satisfies readonly ProjectProfileFlowStepId[],
  stepIndex(stepId: ProjectProfileFlowStepId): number {
    return PROJECT_PROFILE_FLOW.stepOrder.indexOf(stepId)
  },
  /**
   * Progressive reveal: step becomes visible when its unlock predicate holds.
   * Primary quantity is optional and never gates later categorical steps.
   */
  isStepUnlocked(
    stepId: ProjectProfileFlowStepId,
    profile: ProjectProfile | undefined,
  ): boolean {
    switch (stepId) {
      case "projectArea":
        return true
      case "projectType":
        return Boolean(profile?.projectArea)
      case "primaryQuantity":
        return Boolean(
          profile?.projectArea &&
            profile?.projectType &&
            getPrimaryQuantityDefinition(
              profile.projectType,
              profile.projectArea,
            ),
        )
      case "interventionTypes":
        // Quantity is optional — Intervention unlocks with Project Type.
        return Boolean(profile?.projectArea && profile?.projectType)
      case "phase":
        // Multi-select Intervention is complete once at least one option is selected.
        return Boolean(
          profile?.projectArea &&
            profile?.projectType &&
            (profile.interventionTypes?.length ?? 0) > 0,
        )
      case "deliveryModel":
        return Boolean(
          profile?.projectArea &&
            profile?.projectType &&
            (profile.interventionTypes?.length ?? 0) > 0 &&
            profile?.phase,
        )
      default:
        return false
    }
  },
} as const

function clearFlowStep(
  profile: ProjectProfile,
  stepId: ProjectProfileFlowStepId,
): void {
  if (stepId === "primaryQuantity") {
    delete profile.primaryQuantity
    return
  }
  if (stepId === "interventionTypes") {
    delete profile.interventionTypes
    return
  }
  delete profile[stepId]
}

/** Clear every selection in steps after `changedStep` (positional reset). */
export function clearStepsAfter(
  profile: ProjectProfile | undefined,
  changedStep: ProjectProfileFlowStepId,
): ProjectProfile | undefined {
  if (!profile) return undefined
  const changedIdx = PROJECT_PROFILE_FLOW.stepIndex(changedStep)
  if (changedIdx < 0) return normalizeProjectProfile(profile)

  const next: ProjectProfile = { ...profile }
  for (const stepId of PROJECT_PROFILE_FLOW.stepOrder) {
    if (PROJECT_PROFILE_FLOW.stepIndex(stepId) <= changedIdx) continue
    clearFlowStep(next, stepId)
  }
  return normalizeProjectProfile(next)
}

/** Count selected values in steps after `changedStep` (for warning). */
export function countSelectionsAfterStep(
  profile: ProjectProfile | undefined,
  changedStep: ProjectProfileFlowStepId,
): number {
  if (!profile) return 0
  const changedIdx = PROJECT_PROFILE_FLOW.stepIndex(changedStep)
  if (changedIdx < 0) return 0
  let count = 0
  for (const stepId of PROJECT_PROFILE_FLOW.stepOrder) {
    if (PROJECT_PROFILE_FLOW.stepIndex(stepId) <= changedIdx) continue
    if (stepId === "primaryQuantity") {
      if (profile.primaryQuantity) count += 1
    } else if (stepId === "interventionTypes") {
      count += profile.interventionTypes?.length ?? 0
    } else if (typeof profile[stepId] === "string") {
      count += 1
    }
  }
  return count
}

export type ProfileChangePlan = {
  /** Resulting profile after the change + clearing later steps. */
  next: ProjectProfile | undefined
  /** How many later option selections would be wiped. */
  laterSelectionCount: number
  /** True when confirming would discard later step selections. */
  needsConfirmation: boolean
}

/**
 * Plan a single-select toggle/replace: apply value, then clear all later steps.
 */
export function planSingleSelectChange(
  profile: ProjectProfile | undefined,
  categoryId: Exclude<ProjectProfileCategoryId, "interventionTypes">,
  optionId: string,
): ProfileChangePlan {
  const id = aliasOptionId(optionId)

  if (categoryId === "projectType") {
    if (!isProjectTypeValidForArea(id, profile?.projectArea)) {
      return {
        next: normalizeProjectProfile(profile),
        laterSelectionCount: 0,
        needsConfirmation: false,
      }
    }
  } else if (!OPTION_ID_SET_BY_CATEGORY[categoryId].has(id)) {
    return {
      next: normalizeProjectProfile(profile),
      laterSelectionCount: 0,
      needsConfirmation: false,
    }
  }

  const current = profile?.[categoryId]
  const nextValue = current === id ? undefined : id
  const laterSelectionCount = countSelectionsAfterStep(profile, categoryId)

  const draft: ProjectProfile = { ...(profile ?? {}) }
  if (nextValue === undefined) {
    delete draft[categoryId]
  } else {
    draft[categoryId] = nextValue
  }

  const next = clearStepsAfter(draft, categoryId)
  return {
    next,
    laterSelectionCount,
    needsConfirmation: laterSelectionCount > 0,
  }
}

/**
 * Plan a multi-select toggle: apply toggle, then clear all later steps.
 * Any modification to this step resets later steps (strict sequential flow).
 */
export function planMultiSelectChange(
  profile: ProjectProfile | undefined,
  categoryId: "interventionTypes",
  optionId: string,
): ProfileChangePlan {
  const id = aliasOptionId(optionId)
  if (!OPTION_ID_SET_BY_CATEGORY[categoryId].has(id)) {
    return {
      next: normalizeProjectProfile(profile),
      laterSelectionCount: 0,
      needsConfirmation: false,
    }
  }

  const laterSelectionCount = countSelectionsAfterStep(profile, categoryId)
  const current = new Set(profile?.[categoryId] ?? [])
  if (current.has(id)) current.delete(id)
  else current.add(id)

  const draft: ProjectProfile = {
    ...(profile ?? {}),
    [categoryId]: [...current],
  }
  const next = clearStepsAfter(draft, categoryId)
  return {
    next,
    laterSelectionCount,
    needsConfirmation: laterSelectionCount > 0,
  }
}

/**
 * Categories to render for the progressive adaptive flow (chip steps only).
 * Primary quantity is rendered separately when {@link isPrimaryQuantityVisible}.
 */
export function visibleProjectProfileCategories(
  profile: ProjectProfile | undefined,
): readonly ProjectProfileCategoryDef[] {
  const normalized = normalizeProjectProfile(profile) ?? profile
  return PROJECT_PROFILE_FLOW.stepOrder
    .filter(
      (id): id is ProjectProfileCategoryId =>
        id !== "primaryQuantity" &&
        PROJECT_PROFILE_FLOW.isStepUnlocked(id, normalized),
    )
    .map((id) => {
      const category = PROJECT_PROFILE_CATEGORIES.find((c) => c.id === id)!
      if (id === "projectType") {
        return {
          ...category,
          optionIds: getProjectTypeOptionIds(normalized?.projectArea),
        }
      }
      return category
    })
}

/** True when the type-specific quantity input should appear. */
export function isPrimaryQuantityVisible(
  profile: ProjectProfile | undefined,
): boolean {
  return PROJECT_PROFILE_FLOW.isStepUnlocked("primaryQuantity", profile)
}

/**
 * Ordered visible flow steps for progressive UI (categories + optional quantity).
 */
export function visibleProjectProfileFlowSteps(
  profile: ProjectProfile | undefined,
): readonly ProjectProfileFlowStepId[] {
  const normalized = normalizeProjectProfile(profile) ?? profile
  return PROJECT_PROFILE_FLOW.stepOrder.filter((id) =>
    PROJECT_PROFILE_FLOW.isStepUnlocked(id, normalized),
  )
}

/**
 * Set or clear the primary quantity value without resetting later steps.
 * Blank / invalid / non-positive → removes primaryQuantity.
 */
export function setPrimaryQuantityValue(
  profile: ProjectProfile | undefined,
  value: number | null,
): ProjectProfile | undefined {
  const def = getPrimaryQuantityDefinition(
    profile?.projectType,
    profile?.projectArea,
  )
  const draft: ProjectProfile = { ...(profile ?? {}) }
  if (!def || value === null || !Number.isFinite(value) || !(value > 0)) {
    delete draft.primaryQuantity
    return normalizeProjectProfile(draft)
  }
  draft.primaryQuantity = {
    type: def.type,
    value,
    unit: def.unit,
  }
  return normalizeProjectProfile(draft)
}

export function toggleSingleOption(
  profile: ProjectProfile | undefined,
  categoryId: Exclude<ProjectProfileCategoryId, "interventionTypes">,
  optionId: string,
): ProjectProfile | undefined {
  return planSingleSelectChange(profile, categoryId, optionId).next
}

/** @deprecated Prefer toggleSingleOption — kept for call-site clarity on phase. */
export function toggleSinglePhase(
  profile: ProjectProfile | undefined,
  optionId: string,
): ProjectProfile | undefined {
  return toggleSingleOption(profile, "phase", optionId)
}

export function toggleMultiOption(
  profile: ProjectProfile | undefined,
  categoryId: "interventionTypes",
  optionId: string,
): ProjectProfile | undefined {
  return planMultiSelectChange(profile, categoryId, optionId).next
}

/**
 * Selected option IDs in category display order (for collapsed summary).
 * Order: Area → Type → Intervention → Phase → Delivery.
 */
export function collectProjectProfileSummaryOptionIds(
  profile: ProjectProfile | undefined,
): string[] {
  const normalized = normalizeProjectProfile(profile)
  if (!normalized) return []
  const ids: string[] = []
  for (const category of PROJECT_PROFILE_CATEGORIES) {
    if (category.id === "projectType" && !normalized.projectArea) continue
    if (category.selection === "single") {
      const value = normalized[category.id as keyof ProjectProfile]
      if (typeof value === "string") ids.push(value)
    } else {
      const multi = normalized.interventionTypes ?? []
      ids.push(...sortIdsByTaxonomy("interventionTypes", multi))
    }
  }
  return ids
}

export const PROJECT_PROFILE_SUMMARY_MAX_VISIBLE = 3

/**
 * Join localized labels with middle dots; truncate with +N when long.
 */
export function formatProjectProfileSummaryText(
  labels: readonly string[],
  maxVisible = PROJECT_PROFILE_SUMMARY_MAX_VISIBLE,
): string {
  if (labels.length === 0) return ""
  if (labels.length <= maxVisible) return labels.join(" · ")
  const shown = labels.slice(0, maxVisible)
  const rest = labels.length - maxVisible
  return `${shown.join(" · ")} · +${rest}`
}

/** Compact share representation (clear keys; omit when empty). */
export type ProjectProfileShare = {
  projectArea?: string
  projectType?: string
  primaryQuantity?: ProjectPrimaryQuantity
  interventionTypes?: string[]
  phase?: string
  deliveryModel?: string
}

export function projectProfileToShare(
  profile: ProjectProfile | undefined,
): ProjectProfileShare | undefined {
  return cloneProjectProfile(profile)
}

export function projectProfileFromShare(
  raw: unknown,
): ProjectProfile | undefined {
  return normalizeProjectProfile(raw)
}

/** Format a stored quantity for display / input (locale-aware). */
export function formatProjectQuantityValue(
  value: number,
  language: "no" | "en",
): string {
  if (!Number.isFinite(value) || !(value > 0)) return ""
  const locale = language === "en" ? "en-GB" : "nb-NO"
  return value
    .toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
}

/** Parse locale-formatted quantity text → positive number or null. */
export function parseProjectQuantityInput(
  raw: string,
  language: "no" | "en",
): number | null {
  let s = raw
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
  if (s === "") return null
  if (language === "en") {
    s = s.replace(/,/g, "")
  } else {
    s = s.replace(/\s/g, "").replace(",", ".")
  }
  const n = Number(s)
  if (!Number.isFinite(n) || !(n > 0)) return null
  return n
}

/** @internal test helper */
export function isKnownProfileOptionId(id: string): boolean {
  return ALL_OPTION_IDS.has(id)
}

/** @internal — documented legacy mappings for regression tests. */
export const PROJECT_PROFILE_LEGACY_MAPPINGS = LEGACY_OPTION_ALIASES
