import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  PROJECT_PROFILE_CATEGORIES,
  PROJECT_PROFILE_LEGACY_MAPPINGS,
  PROJECT_TYPES_BY_AREA,
  clearStepsAfter,
  cloneProjectProfile,
  collectProjectProfileSummaryOptionIds,
  emptyProjectProfile,
  formatProjectProfileSummaryText,
  formatProjectQuantityValue,
  getPrimaryQuantityDefinition,
  getProjectTypeOptionIds,
  isKnownProfileOptionId,
  isPrimaryQuantityVisible,
  isProjectProfileEmpty,
  isProjectTypeValidForArea,
  normalizeProjectProfile,
  parseProjectQuantityInput,
  planMultiSelectChange,
  planSingleSelectChange,
  setPrimaryQuantityValue,
  toggleMultiOption,
  toggleSingleOption,
  toggleSinglePhase,
  visibleProjectProfileCategories,
  visibleProjectProfileFlowSteps,
} from "@/domain/analysis/projectProfile"
import {
  createProject,
  deriveProjectProfileBaseCost,
  patchProjectProfile,
  type Project,
} from "@/domain/analysis/project"
import { duplicateProject } from "@/domain/analysis/cloneAnalysisWorkspace"
import { parseProjectsPayload } from "@/persistence/storage"
import {
  buildShareCompactPayload,
  compactPayloadToProjects,
} from "@/persistence/shareLink"
import { repoRoot } from "@/test-utils/repoRoot"


describe("ProjectProfile taxonomy v1", () => {
  it("exposes exactly five top-level categories with expected selection modes", () => {
    expect(PROJECT_PROFILE_CATEGORIES.map((c) => c.id)).toEqual([
      "projectArea",
      "projectType",
      "interventionTypes",
      "phase",
      "deliveryModel",
    ])
    expect(
      PROJECT_PROFILE_CATEGORIES.find((c) => c.id === "interventionTypes")
        ?.selection,
    ).toBe("multi")
    for (const id of [
      "projectArea",
      "projectType",
      "phase",
      "deliveryModel",
    ] as const) {
      expect(
        PROJECT_PROFILE_CATEGORIES.find((c) => c.id === id)?.selection,
      ).toBe("single")
    }
  })

  it("does not include removed uncertainty-like / environment options", () => {
    const removed = [
      "many_stakeholders",
      "tight_time_window",
      "high_technical_complexity",
      "many_interfaces",
      "complex_site_logistics",
      "permits_authorities",
      "unknown_existing_conditions",
      "procurement",
      "greenfield",
      "brownfield",
      "existing_facility",
      "projectEnvironment",
    ]
    for (const id of removed) {
      expect(isKnownProfileOptionId(id)).toBe(false)
    }
    // early_phase is a legacy alias, not an active option id
    expect(isKnownProfileOptionId("early_phase")).toBe(false)
    expect(
      PROJECT_PROFILE_CATEGORIES.find((c) => c.id === "phase")?.optionIds,
    ).toEqual([
      "study",
      "concept",
      "preliminary_design",
      "detailed_design",
      "execution",
      "handover",
    ])
    expect(
      PROJECT_PROFILE_CATEGORIES.some((c) => c.id === ("projectEnvironment" as string)),
    ).toBe(false)
    const section = readFileSync(
      join(repoRoot, "src/components/ProjectProfileSection.tsx"),
      "utf8",
    )
    expect(section).not.toContain("projectEnvironment")
    expect(section).not.toContain("technicalComplexity")
    expect(section).not.toContain("constraints")
  })

  it("maps Project Area → Project Type options", () => {
    expect(getProjectTypeOptionIds("transport")).toEqual(
      PROJECT_TYPES_BY_AREA.transport,
    )
    expect(getProjectTypeOptionIds("buildings")).toContain("education")
    expect(getProjectTypeOptionIds("buildings")).not.toContain("tunnel")
    expect(getProjectTypeOptionIds(undefined)).toEqual([])
    expect(isProjectTypeValidForArea("tunnel", "transport")).toBe(true)
    expect(isProjectTypeValidForArea("tunnel", "buildings")).toBe(false)
  })
})

describe("ProjectProfile progressive adaptive flow", () => {
  it("empty profile shows only the first step", () => {
    expect(visibleProjectProfileFlowSteps(undefined)).toEqual(["projectArea"])
    expect(visibleProjectProfileCategories(undefined).map((c) => c.id)).toEqual(
      ["projectArea"],
    )
  })

  it("selecting Project Area reveals Project Type only", () => {
    expect(
      visibleProjectProfileFlowSteps({ projectArea: "transport" }),
    ).toEqual(["projectArea", "projectType"])
    expect(
      visibleProjectProfileCategories({ projectArea: "transport" }).find(
        (c) => c.id === "projectType",
      )?.optionIds,
    ).toEqual(PROJECT_TYPES_BY_AREA.transport)
  })

  it("selecting mapped Project Type reveals quantity + Intervention only", () => {
    expect(
      visibleProjectProfileFlowSteps({
        projectArea: "buildings",
        projectType: "healthcare",
      }),
    ).toEqual([
      "projectArea",
      "projectType",
      "primaryQuantity",
      "interventionTypes",
    ])
    expect(
      isPrimaryQuantityVisible({
        projectArea: "buildings",
        projectType: "healthcare",
      }),
    ).toBe(true)
  })

  it("unmapped Project Type shows Intervention without quantity or Phase", () => {
    expect(
      visibleProjectProfileFlowSteps({
        projectArea: "transport",
        projectType: "transport_hub",
      }),
    ).toEqual(["projectArea", "projectType", "interventionTypes"])
    expect(
      isPrimaryQuantityVisible({
        projectArea: "transport",
        projectType: "transport_hub",
      }),
    ).toBe(false)
  })

  it("selecting Intervention Type reveals Project Phase", () => {
    expect(
      visibleProjectProfileFlowSteps({
        projectArea: "buildings",
        projectType: "healthcare",
        interventionTypes: ["rehabilitation_renewal"],
      }),
    ).toEqual([
      "projectArea",
      "projectType",
      "primaryQuantity",
      "interventionTypes",
      "phase",
    ])
  })

  it("hides Project Phase when Intervention Type is empty", () => {
    expect(
      visibleProjectProfileFlowSteps({
        projectArea: "buildings",
        projectType: "healthcare",
        interventionTypes: [],
        phase: "preliminary_design",
      }),
    ).toEqual([
      "projectArea",
      "projectType",
      "primaryQuantity",
      "interventionTypes",
    ])
  })

  it("selecting Phase reveals Delivery Model", () => {
    expect(
      visibleProjectProfileFlowSteps({
        projectArea: "buildings",
        projectType: "healthcare",
        interventionTypes: ["rehabilitation_renewal"],
        phase: "preliminary_design",
      }),
    ).toEqual([
      "projectArea",
      "projectType",
      "primaryQuantity",
      "interventionTypes",
      "phase",
      "deliveryModel",
    ])
  })

  it("saved populated profile reconstructs the full visible flow", () => {
    expect(
      visibleProjectProfileFlowSteps({
        projectArea: "buildings",
        projectType: "healthcare",
        primaryQuantity: {
          type: "gross_floor_area",
          value: 8500,
          unit: "m2",
        },
        interventionTypes: ["rehabilitation_renewal"],
        phase: "preliminary_design",
        deliveryModel: "design_build",
      }),
    ).toEqual([
      "projectArea",
      "projectType",
      "primaryQuantity",
      "interventionTypes",
      "phase",
      "deliveryModel",
    ])
  })

  it("hides later steps after area is cleared", () => {
    const cleared = clearStepsAfter(
      {
        projectArea: "buildings",
        projectType: "healthcare",
        interventionTypes: ["rehabilitation_renewal"],
        phase: "preliminary_design",
      },
      "projectArea",
    )
    expect(cleared).toEqual({ projectArea: "buildings" })
    expect(visibleProjectProfileFlowSteps({})).toEqual(["projectArea"])
  })
})

describe("ProjectProfile primary quantity mapping", () => {
  it("maps Buildings types to BTA / m²", () => {
    for (const type of PROJECT_TYPES_BY_AREA.buildings) {
      expect(getPrimaryQuantityDefinition(type, "buildings")).toEqual({
        type: "gross_floor_area",
        unit: "m2",
      })
    }
  })

  it("maps road/rail/tunnel/bridge; omits hub and other", () => {
    expect(getPrimaryQuantityDefinition("road", "transport")).toEqual({
      type: "length",
      unit: "km",
    })
    expect(getPrimaryQuantityDefinition("rail", "transport")).toEqual({
      type: "length",
      unit: "km",
    })
    expect(getPrimaryQuantityDefinition("tunnel", "transport")).toEqual({
      type: "tunnel_length",
      unit: "km",
    })
    expect(getPrimaryQuantityDefinition("bridge", "transport")).toEqual({
      type: "bridge_length",
      unit: "m",
    })
    expect(
      getPrimaryQuantityDefinition("transport_hub", "transport"),
    ).toBeUndefined()
    expect(getPrimaryQuantityDefinition("other", "transport")).toBeUndefined()
  })

  it("maps energy generation only; omits other energy/water/industry types", () => {
    expect(getPrimaryQuantityDefinition("generation", "energy")).toEqual({
      type: "capacity",
      unit: "mw",
    })
    expect(
      getPrimaryQuantityDefinition("grid_transmission", "energy"),
    ).toBeUndefined()
    expect(
      getPrimaryQuantityDefinition("water_supply", "water_wastewater"),
    ).toBeUndefined()
    expect(
      getPrimaryQuantityDefinition("production_facility", "industry"),
    ).toBeUndefined()
  })

  it("stores numeric quantity structurally and formats locale input", () => {
    let profile = setPrimaryQuantityValue(
      { projectArea: "buildings", projectType: "healthcare" },
      8500,
    )
    expect(profile?.primaryQuantity).toEqual({
      type: "gross_floor_area",
      value: 8500,
      unit: "m2",
    })
    expect(formatProjectQuantityValue(8500, "no")).toBe("8 500")
    expect(formatProjectQuantityValue(12.4, "no")).toBe("12,4")
    expect(formatProjectQuantityValue(8500, "en")).toBe("8,500")
    expect(formatProjectQuantityValue(12.4, "en")).toBe("12.4")
    expect(parseProjectQuantityInput("8 500", "no")).toBe(8500)
    expect(parseProjectQuantityInput("12,4", "no")).toBe(12.4)
    expect(parseProjectQuantityInput("8,500", "en")).toBe(8500)
    expect(parseProjectQuantityInput("0", "no")).toBeNull()
    expect(parseProjectQuantityInput("-1", "no")).toBeNull()
    profile = setPrimaryQuantityValue(profile, null)
    expect(profile?.primaryQuantity).toBeUndefined()
  })

  it("clearing quantity leaves later categorical selections intact", () => {
    const start = {
      projectArea: "buildings",
      projectType: "healthcare",
      primaryQuantity: {
        type: "gross_floor_area",
        value: 8500,
        unit: "m2",
      },
      interventionTypes: ["rehabilitation_renewal"],
      phase: "preliminary_design",
    }
    const next = setPrimaryQuantityValue(start, null)
    expect(next).toEqual({
      projectArea: "buildings",
      projectType: "healthcare",
      interventionTypes: ["rehabilitation_renewal"],
      phase: "preliminary_design",
    })
  })
})

describe("ProjectProfile sequential reset", () => {
  const fullProfile = {
    projectArea: "buildings",
    projectType: "healthcare",
    primaryQuantity: {
      type: "gross_floor_area",
      value: 8500,
      unit: "m2",
    },
    interventionTypes: ["rehabilitation_renewal"],
    phase: "preliminary_design",
    deliveryModel: "not_contracted",
  }

  it("changing early step clears all later steps including quantity", () => {
    const plan = planSingleSelectChange(fullProfile, "projectArea", "transport")
    expect(plan.needsConfirmation).toBe(true)
    expect(plan.laterSelectionCount).toBe(5)
    expect(plan.next).toEqual({ projectArea: "transport" })
  })

  it("changing Project Type clears quantity and later categorical steps", () => {
    const plan = planSingleSelectChange(fullProfile, "projectType", "office")
    expect(plan.needsConfirmation).toBe(true)
    expect(plan.next).toEqual({
      projectArea: "buildings",
      projectType: "office",
    })
  })

  it("editing quantity value does not clear later steps", () => {
    const next = setPrimaryQuantityValue(fullProfile, 9000)
    expect(next).toEqual({
      ...fullProfile,
      primaryQuantity: {
        type: "gross_floor_area",
        value: 9000,
        unit: "m2",
      },
    })
  })

  it("changing middle multi-select step clears only later steps", () => {
    const plan = planMultiSelectChange(
      fullProfile,
      "interventionTypes",
      "new_facility",
    )
    expect(plan.needsConfirmation).toBe(true)
    expect(plan.laterSelectionCount).toBe(2)
    expect(plan.next).toEqual({
      projectArea: "buildings",
      projectType: "healthcare",
      primaryQuantity: {
        type: "gross_floor_area",
        value: 8500,
        unit: "m2",
      },
      interventionTypes: ["new_facility", "rehabilitation_renewal"],
    })
  })

  it("warns when deselecting area with later data; cancel leaves state unchanged", () => {
    const start = {
      projectArea: "buildings",
      projectType: "healthcare",
    }
    const plan = planSingleSelectChange(start, "projectArea", "buildings")
    expect(plan.needsConfirmation).toBe(true)
    expect(plan.laterSelectionCount).toBe(1)
    expect(plan.next).toBeUndefined()
    expect(start).toEqual({
      projectArea: "buildings",
      projectType: "healthcare",
    })
  })

  it("deselects area immediately when no later selections exist", () => {
    const plan = planSingleSelectChange(
      { projectArea: "buildings" },
      "projectArea",
      "buildings",
    )
    expect(plan.needsConfirmation).toBe(false)
    expect(plan.laterSelectionCount).toBe(0)
    expect(plan.next).toBeUndefined()
  })

  it("warns when changing area even if Project Type would still be valid", () => {
    const plan = planSingleSelectChange(
      {
        projectArea: "transport",
        projectType: "other",
        phase: "study",
      },
      "projectArea",
      "energy",
    )
    expect(plan.needsConfirmation).toBe(true)
    expect(plan.next).toEqual({ projectArea: "energy" })
  })

  it("multi-select toggle with later data requires confirmation and clears later", () => {
    const start = {
      projectArea: "buildings",
      projectType: "healthcare",
      interventionTypes: ["rehabilitation_renewal", "expansion"],
      phase: "preliminary_design",
    }
    const plan = planMultiSelectChange(
      start,
      "interventionTypes",
      "expansion",
    )
    expect(plan.needsConfirmation).toBe(true)
    expect(plan.laterSelectionCount).toBe(1)
    expect(plan.next).toEqual({
      projectArea: "buildings",
      projectType: "healthcare",
      interventionTypes: ["rehabilitation_renewal"],
    })
  })

  it("multi-select toggle without later data applies immediately", () => {
    const plan = planMultiSelectChange(
      {
        projectArea: "buildings",
        projectType: "healthcare",
        interventionTypes: ["rehabilitation_renewal"],
      },
      "interventionTypes",
      "expansion",
    )
    expect(plan.needsConfirmation).toBe(false)
    expect(plan.next?.interventionTypes).toEqual([
      "expansion",
      "rehabilitation_renewal",
    ])
  })
})

describe("ProjectProfile single-select toggle-off and multi-select", () => {
  it("toggles single-select on and off", () => {
    let profile = toggleSingleOption(undefined, "projectArea", "transport")
    expect(profile?.projectArea).toBe("transport")
    profile = toggleSingleOption(profile, "projectArea", "transport")
    expect(profile?.projectArea).toBeUndefined()
  })

  it("multi-select adds and removes", () => {
    let profile = toggleMultiOption(
      undefined,
      "interventionTypes",
      "rehabilitation_renewal",
    )
    profile = toggleMultiOption(profile, "interventionTypes", "new_facility")
    expect(profile?.interventionTypes).toEqual([
      "new_facility",
      "rehabilitation_renewal",
    ])
    profile = toggleMultiOption(
      profile,
      "interventionTypes",
      "rehabilitation_renewal",
    )
    expect(profile?.interventionTypes).toEqual(["new_facility"])
  })
})

describe("ProjectProfile model", () => {
  it("blank project has empty profile", () => {
    const p = createProject()
    expect(p.profile).toBeUndefined()
    expect(isProjectProfileEmpty(emptyProjectProfile())).toBe(true)
  })

  it("normalizes missing/invalid profile and drops unknown IDs", () => {
    expect(normalizeProjectProfile(undefined)).toBeUndefined()
    expect(normalizeProjectProfile(null)).toBeUndefined()
    expect(normalizeProjectProfile({ phase: "not_a_real_id" })).toBeUndefined()
    expect(
      normalizeProjectProfile({
        phase: "study",
        interventionTypes: [
          "rehabilitation_renewal",
          "bogus",
          "expansion",
        ],
      }),
    ).toEqual({
      phase: "study",
      interventionTypes: ["expansion", "rehabilitation_renewal"],
    })
  })

  it("aliases legacy option IDs and ignores unsupported legacy categories", () => {
    expect(PROJECT_PROFILE_LEGACY_MAPPINGS.rehabilitation).toBe(
      "rehabilitation_renewal",
    )
    expect(PROJECT_PROFILE_LEGACY_MAPPINGS.main_contract).toBe(
      "design_bid_build",
    )
    expect(PROJECT_PROFILE_LEGACY_MAPPINGS.early_phase).toBe("study")
    expect(
      normalizeProjectProfile({
        phase: "concept_preliminary",
        interventionTypes: ["rehabilitation", "modification_renewal"],
        deliveryModel: "main_contract",
        existingConditions: ["brownfield"],
        projectEnvironment: "greenfield",
        technicalComplexity: ["many_interfaces"],
        constraints: ["tight_time_window"],
      }),
    ).toEqual({
      phase: "preliminary_design",
      interventionTypes: ["rehabilitation_renewal", "modification"],
      deliveryModel: "design_bid_build",
    })
  })

  it("drops incompatible projectType from legacy payloads", () => {
    expect(
      normalizeProjectProfile({
        projectArea: "buildings",
        projectType: "tunnel",
      }),
    ).toEqual({ projectArea: "buildings" })
  })

  it("maps legacy early_phase to study; clears obsolete procurement without remapping", () => {
    expect(
      normalizeProjectProfile({
        projectArea: "buildings",
        projectType: "healthcare",
        phase: "early_phase",
        interventionTypes: ["new_facility"],
      }),
    ).toEqual({
      projectArea: "buildings",
      projectType: "healthcare",
      phase: "study",
      interventionTypes: ["new_facility"],
    })
    expect(
      normalizeProjectProfile({
        projectArea: "buildings",
        projectType: "healthcare",
        phase: "procurement",
        interventionTypes: ["new_facility"],
      }),
    ).toEqual({
      projectArea: "buildings",
      projectType: "healthcare",
      interventionTypes: ["new_facility"],
    })
  })

  it("phase / single-select can clear; multi-select toggles and sorts", () => {
    let profile = toggleSinglePhase(undefined, "study")
    expect(profile?.phase).toBe("study")
    profile = toggleSingleOption(profile, "projectArea", "transport")
    expect(profile?.projectArea).toBe("transport")
    profile = toggleSingleOption(profile, "projectArea", "transport")
    expect(profile?.projectArea).toBeUndefined()

    profile = toggleMultiOption(
      undefined,
      "interventionTypes",
      "rehabilitation_renewal",
    )
    profile = toggleMultiOption(profile, "interventionTypes", "new_facility")
    expect(profile?.interventionTypes).toEqual([
      "new_facility",
      "rehabilitation_renewal",
    ])
  })

  it("parseProjectsPayload restores profile and defaults old data", () => {
    const withProfile = createProject({ name: "A" })
    withProfile.profile = {
      phase: "detailed_design",
      projectArea: "transport",
      deliveryModel: "design_bid_build",
    }
    const restored = parseProjectsPayload([withProfile])
    expect(restored?.[0]?.profile).toEqual({
      phase: "detailed_design",
      projectArea: "transport",
      deliveryModel: "design_bid_build",
    })

    const legacy = {
      id: "x",
      name: "Legacy",
      incurredCosts: 0,
      costRows: withProfile.costRows,
      driverRows: withProfile.driverRows,
    }
    const legacyRestored = parseProjectsPayload([legacy])
    expect(legacyRestored?.[0]?.profile).toBeUndefined()
  })

  it("keeps profiles independent across projects", () => {
    const a = createProject({ name: "A" })
    const b = createProject({ name: "B" })
    let projects: Project[] = [a, b]
    projects = patchProjectProfile(projects, a.id, {
      phase: "study",
      interventionTypes: ["rehabilitation_renewal"],
    })
    projects = patchProjectProfile(projects, b.id, {
      phase: "execution",
      projectArea: "buildings",
    })
    expect(projects[0]!.profile).toEqual({
      phase: "study",
      interventionTypes: ["rehabilitation_renewal"],
    })
    expect(projects[1]!.profile).toEqual({
      phase: "execution",
      projectArea: "buildings",
    })
  })

  it("duplication copies profile deeply including primary quantity", () => {
    const source = createProject({ name: "A" })
    source.profile = {
      phase: "handover",
      projectArea: "transport",
      projectType: "tunnel",
      primaryQuantity: { type: "tunnel_length", value: 3.2, unit: "km" },
      interventionTypes: ["expansion", "rehabilitation_renewal"],
    }
    const { project: copy } = duplicateProject(source, { name: "A (2)" })
    expect(copy.profile).toEqual({
      phase: "handover",
      projectArea: "transport",
      projectType: "tunnel",
      primaryQuantity: { type: "tunnel_length", value: 3.2, unit: "km" },
      interventionTypes: ["expansion", "rehabilitation_renewal"],
    })
    copy.profile!.phase = "execution"
    copy.profile!.primaryQuantity!.value = 9
    copy.profile!.interventionTypes!.push("new_facility")
    expect(source.profile).toEqual({
      phase: "handover",
      projectArea: "transport",
      projectType: "tunnel",
      primaryQuantity: { type: "tunnel_length", value: 3.2, unit: "km" },
      interventionTypes: ["expansion", "rehabilitation_renewal"],
    })
  })

  it("cloneProjectProfile returns independent arrays and quantity", () => {
    const original = {
      projectArea: "buildings" as const,
      projectType: "healthcare",
      primaryQuantity: {
        type: "gross_floor_area",
        value: 8500,
        unit: "m2",
      },
      interventionTypes: ["expansion"],
    }
    const cloned = cloneProjectProfile(original)!
    cloned.interventionTypes!.push("rehabilitation_renewal")
    cloned.primaryQuantity!.value = 1
    expect(original.interventionTypes).toEqual(["expansion"])
    expect(original.primaryQuantity.value).toBe(8500)
  })

  it("derives base cost from authoritative computeBaseCostSum (not a profile chip)", () => {
    const p = createProject({ name: "Cost" })
    p.costRows = [
      {
        id: "c1",
        name: "A",
        description: "",
        optimistic: "0",
        likely: "100",
        pessimistic: "0",
      },
    ]
    p.incurredCosts = 25
    expect(deriveProjectProfileBaseCost(p)).toBe(125)
    const section = readFileSync(
      join(repoRoot, "src/components/ProjectProfileSection.tsx"),
      "utf8",
    )
    expect(section).not.toContain("deriveProjectProfileBaseCost")
    expect(section).not.toContain("Small")
  })
})

describe("ProjectProfile collapsed summary", () => {
  it("empty profile yields no summary ids", () => {
    expect(collectProjectProfileSummaryOptionIds(undefined)).toEqual([])
    expect(formatProjectProfileSummaryText([])).toBe("")
  })

  it("orders Area → Type → Intervention → Phase → Delivery", () => {
    const ids = collectProjectProfileSummaryOptionIds({
      projectArea: "transport",
      projectType: "tunnel",
      interventionTypes: ["rehabilitation_renewal", "expansion"],
      phase: "preliminary_design",
      deliveryModel: "design_build",
    })
    expect(ids).toEqual([
      "transport",
      "tunnel",
      "expansion",
      "rehabilitation_renewal",
      "preliminary_design",
      "design_build",
    ])
    expect(formatProjectProfileSummaryText(["A", "B", "C", "D", "E"])).toBe(
      "A · B · C · +2",
    )
  })
})

describe("ProjectProfile UI disclosure wiring", () => {
  it("uses a left-aligned title trigger with summary and outside-click close", () => {
    const section = readFileSync(
      join(repoRoot, "src/components/ProjectProfileSection.tsx"),
      "utf8",
    )
    expect(section).toContain("defaultOpen = false")
    expect(section).toContain("visibleProjectProfileFlowSteps")
    expect(section).toContain("setPrimaryQuantityValue")
    expect(section).toContain("planSingleSelectChange")
    expect(section).toContain("planMultiSelectChange")
    expect(section).toContain("ConfirmDialog")
    expect(section).toContain("changeWillClearLater")
    expect(section).toContain("data-project-profile-toggle")
    expect(section).toContain("data-project-profile-summary")
    expect(section).toContain("data-project-profile-quantity-input")
    expect(section).toContain("data-project-profile-quantity-filled")
    expect(section).toContain("flex min-w-0 flex-wrap items-center")
    expect(section).toContain("border-[#1d868c]/55 bg-[rgba(29,134,140,0.10)]")
    expect(section).toContain('document.addEventListener("mousedown", onDoc)')
    expect(section).not.toContain("ChevronDown")
    expect(section).toContain("{open ? (")
    expect(section).not.toContain("Next")
    expect(section).not.toContain("Continue")
  })

  it("sits between tabs and Cost Items with matching md+ Results offset", () => {
    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    // Single Analysis: profile+Focus row remains between project tabs and Cost Items.
    const tablistIdx = app.indexOf('role="tablist"')
    const singleProfileIdx = app.indexOf(
      "data-project-profile-focus-row=\"\"",
      tablistIdx,
    )
    const costIdx = app.indexOf('title={t("expanders.costElements")}')
    expect(singleProfileIdx).toBeGreaterThan(tablistIdx)
    expect(costIdx).toBeGreaterThan(singleProfileIdx)
    expect(app).toContain(
      'PROJECT_PROFILE_SECTION_SPACING_CLASS = "mt-4 mb-5"',
    )
    expect(app).toContain("PROJECT_PROFILE_FOCUS_ROW_CLASS")
    expect(app).toContain("RESULTS_ALIGN_WITH_COST_ITEMS_CLASS")
    // Ongoing: profile is shared row 2; Cost Items / Results share row 3.
    expect(app).toContain("ONGOING_PROJECT_PROFILE_CELL_CLASS")
    expect(app).toContain("md:col-start-1 md:row-start-2")
    expect(app).toContain("md:col-start-1 md:row-start-3")
    expect(app).toContain("md:col-start-2 md:row-start-3")
    // Profile is omitted from stale-input signature (metadata only).
    const signatureSrc = readFileSync(
      join(repoRoot, "src/domain/simulation/simulationInputSignature.ts"),
      "utf8",
    )
    expect(signatureSrc).toContain("profile: _p")
  })
})

describe("ProjectProfile share", () => {
  it("round-trips profile in compact share payload", () => {
    const project = createProject({ name: "Share me" })
    project.profile = {
      phase: "preliminary_design",
      projectArea: "transport",
      projectType: "tunnel",
      primaryQuantity: { type: "tunnel_length", value: 3.2, unit: "km" },
      deliveryModel: "partnering",
    }
    const payload = buildShareCompactPayload({
      projects: [project],
      activeProjectId: project.id,
    })
    expect(payload.p[0]?.pp).toEqual({
      phase: "preliminary_design",
      projectArea: "transport",
      projectType: "tunnel",
      primaryQuantity: { type: "tunnel_length", value: 3.2, unit: "km" },
      deliveryModel: "partnering",
    })
    const decoded = compactPayloadToProjects(payload)
    expect(decoded?.[0]?.profile).toEqual({
      phase: "preliminary_design",
      projectArea: "transport",
      projectType: "tunnel",
      primaryQuantity: { type: "tunnel_length", value: 3.2, unit: "km" },
      deliveryModel: "partnering",
    })
  })

  it("old share payload without pp decodes with empty profile", () => {
    const project = createProject({ name: "Old" })
    const payload = buildShareCompactPayload({
      projects: [project],
      activeProjectId: project.id,
    })
    const legacy = {
      ...payload,
      p: payload.p.map(({ pp: _omit, ...rest }) => rest),
    }
    const decoded = compactPayloadToProjects(legacy)
    expect(decoded?.[0]?.profile).toBeUndefined()
  })

  it("legacy share taxonomy IDs decode safely (supported aliases only)", () => {
    const project = createProject({ name: "Legacy share" })
    const payload = buildShareCompactPayload({
      projects: [project],
      activeProjectId: project.id,
    })
    const withLegacyPp = {
      ...payload,
      p: [
        {
          ...payload.p[0]!,
          pp: {
            phase: "concept_preliminary",
            interventionTypes: ["rehabilitation"],
            deliveryModel: "main_contract",
            existingConditions: ["operational", "limited_access"],
            constraints: ["many_stakeholders"],
            projectEnvironment: "brownfield",
          },
        },
      ],
    }
    const decoded = compactPayloadToProjects(withLegacyPp)
    expect(decoded?.[0]?.profile).toEqual({
      phase: "preliminary_design",
      interventionTypes: ["rehabilitation_renewal"],
      deliveryModel: "design_bid_build",
    })
  })
})
