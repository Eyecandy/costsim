import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import type { AnalysisStatus } from "@/domain/analysis/analysisDocument"
import type { AnalysisCheckpoint, OngoingAnalysisState } from "@/domain/analysis/analysisCheckpoint"
import type { ArchiveBlockReason } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { SingleAnalysisArchivedSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import type { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import type {
  LibraryDocMeta,
  LibrarySaveStatus,
  LibrarySessionArgs,
  LiveArchiveState,
} from "@/features/analysis-library/session/sessionTypes"

/**
 * What the command hooks of the library session share: the session's state, refs
 * and helpers. Built once per render in `useLibraryAnalysisSession` and destructured
 * by each command hook, so the hooks keep the exact dependencies they had inline.
 */
export type LibrarySessionContext = {
  args: LibrarySessionArgs
  repo: ReturnType<typeof getAnalysisLibraryRepository>
  docMeta: LibraryDocMeta | null
  ongoing: OngoingAnalysisState | null
  checkpointReadOnly: boolean
  enqueueSave: (op: () => Promise<void>) => Promise<void>
  setSaveStatusSafe: (next: LibrarySaveStatus) => void
  readLiveArchiveBlockReason: () => ArchiveBlockReason | null
  applyCheckpointView: (checkpoint: AnalysisCheckpoint, docStatus: AnalysisStatus) => void
  ongoingRef: MutableRefObject<OngoingAnalysisState | null>
  saveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  skipNextSaveRef: MutableRefObject<boolean>
  loadedIdRef: MutableRefObject<string | null>
  draftResultSeedRef: MutableRefObject<DraftResultSeedV1 | null>
  ongoingDraftResultRef: MutableRefObject<OngoingCheckpointResultSnapshotV1 | null>
  singleDraftResultRef: MutableRefObject<SingleDraftResultSnapshotV1 | null>
  liveArchiveStateRef: MutableRefObject<LiveArchiveState>
  setDocMeta: Dispatch<SetStateAction<LibraryDocMeta | null>>
  setOngoing: Dispatch<SetStateAction<OngoingAnalysisState | null>>
  setDraftResultSeed: Dispatch<SetStateAction<DraftResultSeedV1 | null>>
  setOngoingDraftResult: Dispatch<SetStateAction<OngoingCheckpointResultSnapshotV1 | null>>
  setArchivedSnapshot: Dispatch<
    SetStateAction<SingleAnalysisArchivedSnapshot | OngoingCheckpointResultSnapshotV1 | null>
  >
  setSingleDraftResult: Dispatch<SetStateAction<SingleDraftResultSnapshotV1 | null>>
}

/** The checkpoint commands also need the debounced-save flush defined after the context. */
export type OngoingCheckpointContext = LibrarySessionContext & {
  flushPendingSave: () => Promise<void>
}
