import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus Project Profile presentation", () => {
  it("renders Focus-only intro copy (NO/EN)", () => {
    expect(messages.no.projectProfile.focusIntro).toBe(
      "Velg det som best beskriver prosjektet. Profilen gir kontekst til analysen og dokumenterer prosjektgrunnlaget.",
    )
    expect(messages.en.projectProfile.focusIntro).toBe(
      "Choose the options that best describe the project. The profile provides context for the analysis and documents the project basis.",
    )
    const section = readSrc("src/features/workspace/ProjectProfileSection.tsx")
    expect(section).toContain('data-project-profile-focus-intro=""')
    expect(section).toContain('t("projectProfile.focusIntro")')
    // Intro is gated on embedded Focus presentation only.
    expect(section).toMatch(
      /embedded \? \([\s\S]*?data-project-profile-focus-intro/,
    )
  })

  it("embedded Focus presentation uses mid-scale option cards / grid", () => {
    const section = readSrc("src/features/workspace/ProjectProfileSection.tsx")
    expect(section).toContain('data-project-profile-option-grid=""')
    // Midpoint between original chips and the earlier oversized Focus cards.
    expect(section).toContain("min-h-8")
    expect(section).toContain("px-2.5 py-1.5")
    expect(section).toContain("text-[12px]")
    expect(section).toContain("gap-1.5")
    expect(section).toContain("PROJECT_PROFILE_GROUPS_GAP_CLASS")
    expect(section).toContain("gap-3.5")
    expect(section).toContain('data-project-profile-groups=""')
    expect(section).toContain("sm:grid-cols-2")
    expect(section).toContain("lg:grid-cols-3")
    // Not the oversized previous Focus scale.
    expect(section).not.toContain("min-h-10")
    expect(section).not.toContain("px-3 py-2.5")
    // Selected state still uses existing brand tokens (slightly stronger in Focus).
    expect(section).toContain("border-[#1d868c]/65")
    expect(section).toContain("bg-[rgba(29,134,140,0.11)]")
  })

  it("normal and Focus Project Profile share the same group-gap rhythm", () => {
    const section = readSrc("src/features/workspace/ProjectProfileSection.tsx")
    expect(section).toContain(
      'const PROJECT_PROFILE_GROUPS_GAP_CLASS = "gap-3.5"',
    )
    expect(section).toContain(
      'className={cn("flex flex-col", PROJECT_PROFILE_GROUPS_GAP_CLASS)}',
    )
    // No presentation-split gap between normal vs Focus groups.
    expect(section).not.toContain('embedded ? "gap-3" : "gap-2"')
    expect(section).not.toContain('embedded ? "gap-4" : "gap-2"')
  })

  it("Size / Størrelse heading sits above the BTA field; shared heading contrast", () => {
    const section = readSrc("src/features/workspace/ProjectProfileSection.tsx")
    expect(messages.no.projectProfile.sizeHeading).toBe("Størrelse")
    expect(messages.en.projectProfile.sizeHeading).toBe("Size")
    expect(section).toContain('t("projectProfile.sizeHeading")')
    expect(section).toContain(
      'data-project-profile-group-heading="primaryQuantity"',
    )
    expect(section).toContain("PROJECT_PROFILE_GROUP_HEADING_CLASS")
    expect(section).toContain("text-foreground/60")
    // Size heading is inside the primaryQuantity step, before the BTA input.
    const qtyBlock = section.slice(
      section.indexOf("function PrimaryQuantityRow"),
      section.indexOf("export function ProjectProfileSection"),
    )
    expect(qtyBlock.indexOf("projectProfile.sizeHeading")).toBeLessThan(
      qtyBlock.indexOf("data-project-profile-quantity-input"),
    )
    // Category headings share the same contrast token.
    expect(section).toContain("data-project-profile-group-heading={category.id}")
    // BTA field wiring unchanged.
    expect(section).toContain("data-project-profile-quantity-input")
    expect(section).toContain("setPrimaryQuantityValue")
  })

  it("normal Input Project Profile keeps the compact chip presentation", () => {
    const section = readSrc("src/features/workspace/ProjectProfileSection.tsx")
    // Compact path remains for !embedded.
    expect(section).toContain("flex flex-wrap gap-0.5")
    expect(section).toContain("px-1.5 py-px")
    expect(section).toContain("text-[10.5px]")
    expect(section).toContain("border-[#1d868c]/55")
    // Compact chips are not forced into the Focus grid.
    const compactBranch = section.slice(
      section.indexOf(': "flex flex-wrap gap-0.5"'),
      section.indexOf("optionIds.map"),
    )
    expect(compactBranch).not.toContain("data-project-profile-option-grid")
  })

  it("Focus step still reuses ProjectProfileSection + shared patch path", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    const renderBodyStart = guided.indexOf("const renderBody = () =>")
    const phaseSwitchStart = guided.indexOf(
      "switch (step.phase)",
      renderBodyStart,
    )
    const projectProfileCase = guided.slice(
      guided.indexOf('case "projectProfile":', phaseSwitchStart),
      guided.indexOf('case "assumptions":', phaseSwitchStart),
    )
    expect(projectProfileCase).toContain("<ProjectProfileSection")
    expect(projectProfileCase).toContain("embedded")
    expect(projectProfileCase).toContain("onChange={onPatchProfile}")
    expect(projectProfileCase).toContain("profile={project.profile}")
    expect(app).toContain("onPatchProfile=")
    expect(app).toContain("patchProjectProfile")
  })

  it("option controls remain semantic buttons with aria-pressed", () => {
    const section = readSrc("src/features/workspace/ProjectProfileSection.tsx")
    expect(section).toContain('type="button"')
    expect(section).toContain("aria-pressed={selected}")
    expect(section).toContain("data-project-profile-option=")
    expect(section).not.toContain('role="option"')
  })
})
