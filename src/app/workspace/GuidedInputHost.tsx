import { GuidedInputDialog } from "@/features/guided-input/GuidedInputDialog"
import {
  patchProjectAddAssumption,
  patchProjectUpdateAssumption,
  patchProjectRemoveAssumption,
  patchProjectIncurredCosts,
  patchProjectProfile,
  type Project,
} from "@/domain/analysis/project"
import { patchProjectCostRows, patchProjectDriverRows } from "@/app/workspace/workspaceHelpers"
import type { Dispatch, SetStateAction, RefObject } from "react"
import type { useGuidedFocusSession } from "@/app/workspace/useGuidedFocusSession"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { LiveResultValidity } from "@/domain/simulation/liveSimulationState"

export function GuidedInputHost({
  activeProject,
  analysisReadOnly,
  guidedFocusSession,
  guidedFocusState,
  handleRevertInputsToLastSimulation,
  handleRun,
  isRunning,
  liveResultValidity,
  projects,
  runningRef,
  setProjects,
}: {
  activeProject: Project | null
  analysisReadOnly: boolean
  guidedFocusSession: ReturnType<typeof useGuidedFocusSession>
  guidedFocusState: ReturnType<typeof useGuidedFocusState>
  handleRevertInputsToLastSimulation: () => void
  handleRun: () => void
  isRunning: boolean
  liveResultValidity: LiveResultValidity
  projects: Project[]
  runningRef: RefObject<boolean>
  setProjects: Dispatch<SetStateAction<Project[]>>
}) {
  const {
    focusPortalTarget,
    focusShellRef,
    focusView,
    guidedDialogRef,
    guidedInputKind,
    guidedInputStartIndex,
    guidedLandFocusPhase,
    guidedResumePhase,
    guidedSemanticResume,
    guidedStartPhase,
    handleGuidedFocusChromeMeta,
    pendingFocusResultsAfterGuidedRunRef,
    setFocusView,
  } = guidedFocusState
  const {
    closeGuidedInput,
    continueFromSimulationToResults,
    handleFocusShowChanges,
    handleGuidedLandFocusPhaseApplied,
    handleGuidedResumeApplied,
    handleGuidedSemanticResumeApplied,
    handoffGuidedToAddCostItems,
    handoffGuidedToAddDrivers,
    handoffGuidedToCorrelation,
    handoffGuidedToImpact,
  } = guidedFocusSession
  return (
    <>
      {activeProject && guidedInputKind && !analysisReadOnly ? (
        <GuidedInputDialog
          ref={guidedDialogRef}
          open
          suspend={focusView === "results"}
          ensureFocusMode={focusView === "input"}
          focusPortalTarget={
            focusView !== null ? focusPortalTarget : null
          }
          onFocusChromeMetaChange={handleGuidedFocusChromeMeta}
          onRequestFocusFullscreen={() => {
            focusShellRef.current?.requestFullscreen()
          }}
          onExitFocusFullscreen={() => {
            focusShellRef.current?.exitFullscreen()
          }}
          entry={guidedInputKind}
          project={activeProject}
          projectIndex={Math.max(
            0,
            projects.findIndex((p) => p.id === activeProject.id),
          )}
          startIndex={guidedInputStartIndex}
          startPhase={guidedStartPhase}
          resumePhase={guidedResumePhase}
          onResumeApplied={handleGuidedResumeApplied}
          resumeFocusUserPhase={guidedLandFocusPhase}
          onResumeFocusUserPhaseApplied={handleGuidedLandFocusPhaseApplied}
          resumeSemanticStep={guidedSemanticResume}
          onResumeSemanticStepApplied={handleGuidedSemanticResumeApplied}
          onClose={closeGuidedInput}
          onFocusModeChange={(active) => {
            if (active) setFocusView("input")
            else setFocusView((prev) => (prev === "input" ? null : prev))
          }}
          onRunSimulation={() => {
            pendingFocusResultsAfterGuidedRunRef.current = true
            handleRun()
            if (!runningRef.current) {
              pendingFocusResultsAfterGuidedRunRef.current = false
            }
          }}
          runSimulationDisabled={analysisReadOnly || isRunning}
          runSimulationBusy={isRunning}
          simulationResultStatus={
            liveResultValidity.kind === "valid"
              ? "valid"
              : liveResultValidity.kind === "stale"
                ? "stale"
                : "none"
          }
          onContinueToResults={continueFromSimulationToResults}
          onShowStaleChanges={handleFocusShowChanges}
          onRevertStaleChanges={handleRevertInputsToLastSimulation}
          onPatchRow={(rowId, patch) => {
            if (analysisReadOnly) return
            const inCost = activeProject.costRows.some((r) => r.id === rowId)
            if (inCost) {
              setProjects((prev) =>
                patchProjectCostRows(prev, activeProject.id, (rows) =>
                  rows.map((row) =>
                    row.id === rowId ? { ...row, ...patch } : row,
                  ),
                ),
              )
              return
            }
            setProjects((prev) =>
              patchProjectDriverRows(prev, activeProject.id, (rows) =>
                rows.map((row) => {
                  if (row.id !== rowId) return row
                  const next = { ...row, ...patch }
                  if (
                    Object.prototype.hasOwnProperty.call(
                      patch,
                      "uncertaintyNotes",
                    ) &&
                    patch.uncertaintyNotes === undefined
                  ) {
                    delete next.uncertaintyNotes
                  }
                  return next
                }),
              ),
            )
          }}
          onAddAssumption={(text) => {
            if (analysisReadOnly) return
            setProjects((prev) =>
              patchProjectAddAssumption(prev, activeProject.id, text),
            )
          }}
          onUpdateAssumption={(assumptionId, text) => {
            if (analysisReadOnly) return
            setProjects((prev) =>
              patchProjectUpdateAssumption(
                prev,
                activeProject.id,
                assumptionId,
                text,
              ),
            )
          }}
          onRemoveAssumption={(assumptionId) => {
            if (analysisReadOnly) return
            setProjects((prev) =>
              patchProjectRemoveAssumption(
                prev,
                activeProject.id,
                assumptionId,
              ),
            )
          }}
          onIncurredCostsChange={(value) => {
            if (analysisReadOnly) return
            setProjects((prev) =>
              patchProjectIncurredCosts(prev, activeProject.id, value),
            )
          }}
          onPatchProfile={(next) => {
            if (analysisReadOnly) return
            setProjects((prev) =>
              patchProjectProfile(prev, activeProject.id, next),
            )
          }}
          onAddCostItems={handoffGuidedToAddCostItems}
          onAddDrivers={handoffGuidedToAddDrivers}
          onAdjustCorrelation={handoffGuidedToCorrelation}
          onAdjustImpact={handoffGuidedToImpact}
        />
      ) : null}
    </>
  )
}
