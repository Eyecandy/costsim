// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ProjectTabs } from "@/app/workspace/ProjectTabs"
import { createProject, type Project } from "@/domain/analysis/project"
import { I18nProvider } from "@/i18n/I18nProvider"

function renderTabs(overrides: Partial<Parameters<typeof ProjectTabs>[0]> = {}) {
  const projects: Project[] = [
    createProject({ id: "a", name: "Alternativ A" }),
    createProject({ id: "b", name: "Alternativ B" }),
  ]
  const props = {
    activeProjectId: "a",
    analysisReadOnly: false,
    atMaxProjects: false,
    commitProjectName: vi.fn(),
    editingProjectId: null,
    handleAddProject: vi.fn(),
    handleDeleteProject: vi.fn(),
    handleSelectProject: vi.fn(),
    maxProjectsTooltip: "max",
    projects,
    setEditingProjectId: vi.fn(),
    showStaleInputChanges: false,
    skipNameCommitRef: { current: false },
    staleProjectNameTabIds: new Set<string>(),
    ...overrides,
  }
  render(
    <I18nProvider>
      <ProjectTabs {...props} />
    </I18nProvider>,
  )
  return props
}

describe("ProjectTabs", () => {
  it("lists one tab per project and marks the active one selected", () => {
    renderTabs()
    // Two project tabs plus the add button, which also has role=tab.
    expect(screen.getAllByRole("tab")).toHaveLength(3)
    expect(screen.getByRole("tab", { name: /Alternativ A/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: /Alternativ B/ })).toHaveAttribute(
      "aria-selected",
      "false",
    )
  })

  it("selects a project on click and on Enter", async () => {
    const user = userEvent.setup()
    const props = renderTabs()
    const tabB = screen.getByRole("tab", { name: /Alternativ B/ })
    await user.click(tabB)
    expect(props.handleSelectProject).toHaveBeenLastCalledWith("b")
    tabB.focus()
    await user.keyboard("{Enter}")
    expect(props.handleSelectProject).toHaveBeenCalledTimes(2)
  })

  it("deletes a project without selecting it", async () => {
    const user = userEvent.setup()
    const props = renderTabs()
    const [deleteA] = screen.getAllByRole("button", { name: /Alternativ/ })
    await user.click(deleteA as HTMLElement)
    expect(props.handleDeleteProject).toHaveBeenCalledWith("a")
    expect(props.handleSelectProject).not.toHaveBeenCalled()
  })

  it("hides delete buttons when only one project is left", () => {
    renderTabs({ projects: [createProject({ id: "a", name: "Alternativ A" })] })
    expect(screen.queryAllByRole("button", { name: /Alternativ/ })).toHaveLength(0)
  })

  it("disables adding at the project limit", () => {
    renderTabs({ atMaxProjects: true })
    expect(screen.getAllByRole("tab").at(-1)).toBeDisabled()
  })

  it("cannot rename or delete in read-only mode", async () => {
    const user = userEvent.setup()
    const props = renderTabs({ analysisReadOnly: true })
    expect(screen.queryAllByRole("button", { name: /Alternativ/ })).toHaveLength(0)
    await user.dblClick(screen.getByText("Alternativ A"))
    expect(props.setEditingProjectId).not.toHaveBeenCalled()
  })

  it("starts renaming on double click", async () => {
    const user = userEvent.setup()
    const props = renderTabs()
    await user.dblClick(screen.getByText("Alternativ B"))
    expect(props.setEditingProjectId).toHaveBeenCalledWith("b")
    expect(props.handleSelectProject).toHaveBeenCalledWith("b")
  })

  it("commits the new name when Enter blurs the input", async () => {
    const user = userEvent.setup()
    const props = renderTabs({ editingProjectId: "a" })
    const input = screen.getByRole("textbox")
    await user.clear(input)
    await user.type(input, "Nytt navn{Enter}")
    expect(props.commitProjectName).toHaveBeenCalledWith("a", "Nytt navn", "Alternativ A")
  })

  it("Escape cancels the rename without committing", async () => {
    const user = userEvent.setup()
    const props = renderTabs({ editingProjectId: "a" })
    await user.type(screen.getByRole("textbox"), "x{Escape}")
    expect(props.setEditingProjectId).toHaveBeenCalledWith(null)
    expect(props.skipNameCommitRef.current).toBe(true)
  })
})
