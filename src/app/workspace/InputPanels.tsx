import { CostTable } from "@/features/scenario-tables/CostTable"
import { ProjectProfileSection } from "@/features/workspace/ProjectProfileSection"
import { DriversTable } from "@/features/scenario-tables/DriversTable"
import { SectionExpander } from "@/shared/SectionExpander"
import { Card, CardContent } from "@/shared/ui/card"
import {
  patchProjectDriverImpact,
  patchProjectAddAssumption,
  patchProjectUpdateAssumption,
  patchProjectRemoveAssumption,
  patchProjectIncurredCosts,
  patchProjectProfile,
  type Project,
} from "@/domain/analysis/project"
import { PROJECT_PROFILE_FOCUS_ROW_CLASS } from "@/domain/results/columnHeaderLayout"
import { cn } from "@/shared/utils"
import { useI18n } from "@/i18n/useI18n"
import {
  PROJECT_PROFILE_SECTION_SPACING_CLASS,
  ONGOING_COST_CELL_CLASS,
} from "@/app/workspace/layoutClasses"
import { PrimaryFocusModeEntry } from "@/app/workspace/PrimaryFocusModeEntry"
import { patchProjectCostRows, patchProjectDriverRows } from "@/app/workspace/workspaceHelpers"
import type { Dispatch, SetStateAction } from "react"
import type { useGuidedFocusSession } from "@/app/workspace/useGuidedFocusSession"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

export function InputPanels({
  activeProject,
  analysisReadOnly,
  guidedFocusSession,
  guidedFocusState,
  isOngoingAnalysis,
  librarySession,
  setProjects,
  showValidationFeedback,
  validationInvalidCellKeys,
  visibleStaleChangedCellKeys,
}: {
  activeProject: Project | null
  analysisReadOnly: boolean
  guidedFocusSession: ReturnType<typeof useGuidedFocusSession>
  guidedFocusState: ReturnType<typeof useGuidedFocusState>
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  setProjects: Dispatch<SetStateAction<Project[]>>
  showValidationFeedback: boolean
  validationInvalidCellKeys: { cost: ReadonlySet<string>; drivers: ReadonlySet<string>; driverImpacts: ReadonlySet<string>; } | { cost: Set<string>; drivers: Set<string>; driverImpacts?: undefined; }
  visibleStaleChangedCellKeys: { cost: ReadonlySet<string>; drivers: ReadonlySet<string>; driverImpacts: ReadonlySet<string>; }
}) {
  const { t } = useI18n()
  const {
    correlationEditBlocked,
    correlationFeedbackKind,
    correlationModeActive,
    correlationPendingMixed,
    correlationPendingRho,
    correlationSaveConfirmVisible,
    correlationSelectedCostIds,
    defineModeActive,
    defineSelectedRowId,
    guidedInputKind,
    guidedResume,
    impactEditingAreaRef,
    impactModeActive,
    setDefineSelectedRowId,
    setImpactSelectedDriverId,
  } = guidedFocusState
  const {
    activeCostCorrelationPrep,
    handleCorrelationModeToggle,
    handleCorrelationPendingChange,
    handleCostCorrelationGroupApply,
    handleDefineModeToggle,
    handleImpactModeToggle,
    handleOpenCorrelationSummary,
    handleRemoveCorrelationSummary,
    handleToggleCorrelationCost,
    impactSelectedDriverRow,
    openFocusModePrimary,
    openGuidedInput,
    returnToGuidedReview,
    savedCorrelationSummaries,
  } = guidedFocusSession
  return (
    <>
      <div
        className={
          isOngoingAnalysis ? ONGOING_COST_CELL_CLASS : "pb-7"
        }
      >
        {activeProject ? (
          <div
            key={`${librarySession.activeCheckpoint?.id ?? "single"}:${activeProject.id}`}
            id={`panel-${activeProject.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeProject.id}`}
            tabIndex={0}
            className="relative min-w-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none"
          >
            {!isOngoingAnalysis ? (
            <div
              className={cn(
                PROJECT_PROFILE_FOCUS_ROW_CLASS,
                PROJECT_PROFILE_SECTION_SPACING_CLASS,
              )}
              data-project-profile-focus-row=""
            >
              <div className="min-w-0">
                <ProjectProfileSection
                  profile={activeProject.profile}
                  readOnly={analysisReadOnly}
                  onChange={
                    analysisReadOnly
                      ? undefined
                      : (next) =>
                          setProjects((prev) =>
                            patchProjectProfile(
                              prev,
                              activeProject.id,
                              next,
                            ),
                          )
                  }
                />
              </div>
              {!analysisReadOnly ? (
                <PrimaryFocusModeEntry onClick={openFocusModePrimary} />
              ) : null}
            </div>
            ) : null}
            <div
              ref={impactEditingAreaRef}
              className="flex min-w-0 flex-col gap-6"
            >
              <Card
                data-cost-items-card=""
                className="overflow-visible border border-border bg-[var(--km-surface)] ring-0 [--km-surface:color-mix(in_oklab,var(--color-muted)_35%,var(--color-background))]"
              >
                <CardContent className="p-4">
                  <SectionExpander title={t("expanders.costElements")} defaultOpen>
                    <CostTable
                      rows={activeProject.costRows}
                      incurredCosts={activeProject.incurredCosts}
                      assumptions={activeProject.assumptions ?? []}
                      readOnly={analysisReadOnly}
                      onAddAssumption={
                        analysisReadOnly
                          ? undefined
                          : (text) =>
                              setProjects((prev) =>
                                patchProjectAddAssumption(
                                  prev,
                                  activeProject.id,
                                  text,
                                ),
                              )
                      }
                      onUpdateAssumption={
                        analysisReadOnly
                          ? undefined
                          : (assumptionId, text) =>
                              setProjects((prev) =>
                                patchProjectUpdateAssumption(
                                  prev,
                                  activeProject.id,
                                  assumptionId,
                                  text,
                                ),
                              )
                      }
                      onRemoveAssumption={
                        analysisReadOnly
                          ? undefined
                          : (assumptionId) =>
                              setProjects((prev) =>
                                patchProjectRemoveAssumption(
                                  prev,
                                  activeProject.id,
                                  assumptionId,
                                ),
                              )
                      }
                      onIncurredCostsChange={(value) => {
                        if (analysisReadOnly) return
                        setProjects((prev) =>
                          patchProjectIncurredCosts(
                            prev,
                            activeProject.id,
                            value,
                          ),
                        )
                      }}
                      changedCellKeys={visibleStaleChangedCellKeys.cost}
                      invalidCellKeys={
                        showValidationFeedback
                          ? validationInvalidCellKeys.cost
                          : undefined
                      }
                      costImpactSliders={
                        impactModeActive && impactSelectedDriverRow
                          ? {
                              active: true,
                              selectedDriverRowId: impactSelectedDriverRow.row.id,
                              selectedDriverLabel: impactSelectedDriverRow.label,
                              driverImpacts: activeProject.driverImpacts,
                              changedCellKeys:
                                visibleStaleChangedCellKeys.driverImpacts,
                              onImpactChange: (
                                driverRowId,
                                costRowId,
                                value,
                              ) => {
                                if (analysisReadOnly) return
                                setProjects((prev) =>
                                  patchProjectDriverImpact(
                                    prev,
                                    activeProject.id,
                                    driverRowId,
                                    costRowId,
                                    String(value),
                                  ),
                                )
                              },
                            }
                          : undefined
                      }
                      onRowsChange={(updater) => {
                        if (analysisReadOnly) return
                        setProjects((prev) =>
                          patchProjectCostRows(
                            prev,
                            activeProject.id,
                            updater,
                          ),
                        )
                      }}
                      costCorrelationMode={{
                        active: correlationModeActive,
                        onToggle: handleCorrelationModeToggle,
                        selectedCostRowIds: correlationModeActive
                          ? correlationSelectedCostIds
                          : [],
                        onToggleCostSelection: handleToggleCorrelationCost,
                        onOpenSummary: handleOpenCorrelationSummary,
                        onRemoveSummary: handleRemoveCorrelationSummary,
                        pendingRho: correlationPendingRho,
                        pendingMixed: correlationPendingMixed,
                        onPendingRhoChange: handleCorrelationPendingChange,
                        onApplyGroupCorrelation:
                          handleCostCorrelationGroupApply,
                        savedSummaries: savedCorrelationSummaries,
                        saveConfirmVisible: correlationSaveConfirmVisible,
                        saveConfirmKind: correlationFeedbackKind,
                        prepStatus: activeCostCorrelationPrep?.status,
                        incompatibleEditWarning: correlationEditBlocked,
                        onReturnToGuided:
                          guidedResume?.after === "correlation" &&
                          guidedResume.projectId === activeProject.id
                            ? returnToGuidedReview
                            : undefined,
                      }}
                      defineMode={{
                        active: defineModeActive,
                        onToggle: handleDefineModeToggle,
                        selectedRowId: defineModeActive
                          ? defineSelectedRowId
                          : null,
                        onSelectRow: (rowId) => {
                          if (!defineModeActive) return
                          setDefineSelectedRowId(rowId)
                        },
                        onClearSelection: () => setDefineSelectedRowId(null),
                      }}
                      guidedInputMode={
                        analysisReadOnly
                          ? undefined
                          : {
                              active: guidedInputKind === "cost",
                              onOpen: () => openGuidedInput("cost"),
                              onReturnToGuided:
                                guidedResume?.after === "costItems" &&
                                guidedResume.projectId === activeProject.id
                                  ? returnToGuidedReview
                                  : undefined,
                            }
                      }
                    />
                  </SectionExpander>
                </CardContent>
              </Card>

              <Card className="overflow-visible border border-border bg-[var(--km-surface)] ring-0 [--km-surface:color-mix(in_oklab,var(--color-muted)_35%,var(--color-background))]">
                <CardContent className="p-4">
                  <SectionExpander title={t("expanders.drivers")} defaultOpen>
                    <DriversTable
                      rows={activeProject.driverRows}
                      readOnly={analysisReadOnly}
                      changedCellKeys={visibleStaleChangedCellKeys.drivers}
                      invalidCellKeys={
                        showValidationFeedback
                          ? validationInvalidCellKeys.drivers
                          : undefined
                      }
                      driverImpactMode={{
                        active: impactModeActive,
                        onToggle: handleImpactModeToggle,
                        selectedDriverRowId: impactModeActive
                          ? (impactSelectedDriverRow?.row.id ?? null)
                          : null,
                        onSelectDriver: (driverRowId) => {
                          if (!impactModeActive) return
                          setImpactSelectedDriverId(driverRowId)
                        },
                        onReturnToGuided:
                          guidedResume?.after === "impact" &&
                          guidedResume.projectId === activeProject.id
                            ? returnToGuidedReview
                            : undefined,
                      }}
                      defineMode={{
                        active: defineModeActive,
                        onToggle: handleDefineModeToggle,
                        selectedRowId: defineModeActive
                          ? defineSelectedRowId
                          : null,
                        onSelectRow: (rowId) => {
                          if (!defineModeActive) return
                          setDefineSelectedRowId(rowId)
                        },
                        onClearSelection: () => setDefineSelectedRowId(null),
                      }}
                      guidedInputMode={
                        analysisReadOnly
                          ? undefined
                          : {
                              active: guidedInputKind === "driver",
                              onOpen: () => openGuidedInput("driver"),
                              onReturnToGuided:
                                guidedResume?.after === "drivers" &&
                                guidedResume.projectId === activeProject.id
                                  ? returnToGuidedReview
                                  : undefined,
                            }
                      }
                      onRowsChange={(updater) => {
                        if (analysisReadOnly) return
                        setProjects((prev) =>
                          patchProjectDriverRows(
                            prev,
                            activeProject.id,
                            updater,
                          ),
                        )
                      }}
                    />
                  </SectionExpander>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
