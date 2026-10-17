import { Input } from "@/shared/ui/input"
import { PROJECT_NAME_MAX_LENGTH, type Project } from "@/domain/analysis/project"
import { COLUMN_HEADER_BOTTOM_GAP_CLASS } from "@/domain/results/columnHeaderLayout"
import { cn } from "@/shared/utils"
import { ProjectColorSwatch } from "@/shared/ProjectColorSwatch"
import { Plus, X } from "lucide-react"
import { useI18n } from "@/i18n/useI18n"
import {
  STICKY_CONTROL_STRIP_CLASSNAME,
  STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS,
  STALE_PROJECT_TAB_BG_CLASS,
} from "@/app/workspace/layoutClasses"
import type { Dispatch, SetStateAction, RefObject } from "react"

export function ProjectTabs({
  activeProjectId,
  analysisReadOnly,
  atMaxProjects,
  commitProjectName,
  editingProjectId,
  handleAddProject,
  handleDeleteProject,
  handleSelectProject,
  maxProjectsTooltip,
  projects,
  setEditingProjectId,
  showStaleInputChanges,
  skipNameCommitRef,
  staleProjectNameTabIds,
}: {
  activeProjectId: string
  analysisReadOnly: boolean
  atMaxProjects: boolean
  commitProjectName: (projectId: string, raw: string, fallback: string) => void
  editingProjectId: string | null
  handleAddProject: () => void
  handleDeleteProject: (projectId: string) => void
  handleSelectProject: (projectId: string) => void
  maxProjectsTooltip: string
  projects: Project[]
  setEditingProjectId: Dispatch<SetStateAction<string | null>>
  showStaleInputChanges: boolean
  skipNameCommitRef: RefObject<boolean>
  staleProjectNameTabIds: Set<string>
}) {
  const { t } = useI18n()
  return (
    <>
      <div
        className={cn(STICKY_CONTROL_STRIP_CLASSNAME, STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS)}
        role="region"
        aria-label={t("projects.tabsRegion")}
      >
        <p
          className={cn(
            "m-0 font-sans text-[10px] font-normal italic tracking-wide text-muted-foreground/55",
            COLUMN_HEADER_BOTTOM_GAP_CLASS,
          )}
        >
          {t("projects.inputColumnLabel")}
        </p>
        <div
          role="tablist"
          aria-label={t("projects.selectProjectTablist")}
          className="flex w-full min-w-0 flex-nowrap items-end gap-1 border-b-[1.5px] border-[#1d868c]"
        >
          {projects.map((project, projectIndex) => {
            const isActive = project.id === activeProjectId
            const isEditing = !analysisReadOnly && editingProjectId === project.id
            const canDeleteProject = !analysisReadOnly && projects.length > 1
            const hasStaleName = showStaleInputChanges && staleProjectNameTabIds.has(project.id)
            return (
              <div
                key={project.id}
                id={`tab-${project.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${project.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelectProject(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleSelectProject(project.id)
                  }
                }}
                className={cn(
                  "group/tab flex h-8 min-w-0 cursor-pointer items-center gap-1 rounded-t-lg pl-3 pr-1 font-sans text-xs font-semibold tracking-wide normal-case outline-none transition-[color,background-color,box-shadow,border-color] duration-200",
                  projects.length === 1 ? "shrink-0" : "flex-1",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? cn(
                        "relative z-[1] -mb-[1.5px] border-x-[1.5px] border-t-[1.5px] border-[#1d868c] border-b-[1.5px] border-b-card text-foreground",
                        hasStaleName ? STALE_PROJECT_TAB_BG_CLASS : "bg-card",
                      )
                    : cn(
                        "border border-transparent border-b-0 text-muted-foreground hover:text-foreground",
                        hasStaleName
                          ? cn(STALE_PROJECT_TAB_BG_CLASS, "hover:bg-[rgba(29,134,140,0.08)]")
                          : "bg-card hover:bg-muted",
                      ),
                )}
              >
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5",
                    projects.length > 1 && "overflow-hidden",
                  )}
                >
                  <ProjectColorSwatch projectIndex={projectIndex} />
                  {isEditing ? (
                    <Input
                      aria-label={t("projects.projectNameInputLabel")}
                      autoFocus
                      defaultValue={project.name}
                      maxLength={PROJECT_NAME_MAX_LENGTH}
                      className={cn(
                        "h-7 text-sm",
                        projects.length === 1
                          ? "w-full max-w-[min(12rem,40vw)]"
                          : "w-full min-w-0 max-w-full",
                      )}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === "Escape") {
                          skipNameCommitRef.current = true
                          setEditingProjectId(null)
                          e.preventDefault()
                        }
                        if (e.key === "Enter") {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={(e) => {
                        if (skipNameCommitRef.current) {
                          skipNameCommitRef.current = false
                          return
                        }
                        commitProjectName(project.id, e.target.value, project.name)
                      }}
                    />
                  ) : (
                    <span
                      className={cn(
                        "block min-w-0 truncate",
                        projects.length === 1 ? "max-w-[min(12rem,40vw)]" : "w-full",
                      )}
                      title={`${project.name} ${t("projects.projectNameTitleHintSuffix")}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        if (analysisReadOnly) return
                        handleSelectProject(project.id)
                        setEditingProjectId(project.id)
                      }}
                    >
                      {project.name}
                    </span>
                  )}
                </div>
                {canDeleteProject ? (
                  <button
                    type="button"
                    aria-label={`${t("projects.deleteProject")} ${project.name}`}
                    title={t("projects.deleteProject")}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-150",
                      "hover:bg-muted hover:text-foreground",
                      "group-hover/tab:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProject(project.id)
                    }}
                  >
                    <X className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                ) : (
                  <span aria-hidden className="size-7 shrink-0" />
                )}
              </div>
            )
          })}

          <span
            className="inline-flex shrink-0"
            title={
              analysisReadOnly
                ? t("library.readOnlyHint")
                : atMaxProjects
                  ? maxProjectsTooltip
                  : t("projects.addProjectTooltip")
            }
          >
            <button
              type="button"
              role="tab"
              aria-label={t("projects.addProject")}
              aria-disabled={analysisReadOnly || atMaxProjects}
              disabled={analysisReadOnly || atMaxProjects}
              onClick={handleAddProject}
              className={cn(
                "ui-label flex h-8 min-w-9 cursor-pointer items-center justify-center rounded-t-lg border border-transparent border-b-0 px-2 transition-[color,background-color,border-color] duration-200",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      </div>
    </>
  )
}
