import { useState } from "react"

export function useAnalysisDialogs() {
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [finishOngoingConfirmOpen, setFinishOngoingConfirmOpen] = useState(false)
  const [deleteCheckpointConfirmOpen, setDeleteCheckpointConfirmOpen] = useState(false)
  const [nextCheckpointOpen, setNextCheckpointOpen] = useState(false)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [startOngoingDialogOpen, setStartOngoingDialogOpen] = useState(false)
  const [startOngoingAlternatives, setStartOngoingAlternatives] = useState<
    { id: string; name: string }[]
  >([])
  const [startOngoingError, setStartOngoingError] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameError, setRenameError] = useState<string | null>(null)
  const [saveContinueOpen, setSaveContinueOpen] = useState(false)
  const [saveContinueError, setSaveContinueError] = useState<string | null>(null)

  return {
    archiveConfirmOpen,
    setArchiveConfirmOpen,
    finishOngoingConfirmOpen,
    setFinishOngoingConfirmOpen,
    deleteCheckpointConfirmOpen,
    setDeleteCheckpointConfirmOpen,
    nextCheckpointOpen,
    setNextCheckpointOpen,
    trashConfirmOpen,
    setTrashConfirmOpen,
    renameOpen,
    setRenameOpen,
    startOngoingDialogOpen,
    setStartOngoingDialogOpen,
    startOngoingAlternatives,
    setStartOngoingAlternatives,
    startOngoingError,
    setStartOngoingError,
    renameValue,
    setRenameValue,
    renameError,
    setRenameError,
    saveContinueOpen,
    setSaveContinueOpen,
    saveContinueError,
    setSaveContinueError,
  }
}
