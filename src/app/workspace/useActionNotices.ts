import { useCallback, useEffect, useRef, useState } from "react"
import type { ArchiveBlockReason } from "@/domain/analysis/buildArchivedAnalysisSnapshot"

export function useActionNotices() {
  const [archiveBlockedNotice, setArchiveBlockedNotice] = useState<
    "no_results" | "stale_results" | "result_settings_need_rerun" | "failed" | null
  >(null)
  const archiveBlockedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [finishOngoingNotice, setFinishOngoingNotice] = useState<
    "need_archive_checkpoint" | "failed" | null
  >(null)
  const finishOngoingNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (archiveBlockedNoticeTimerRef.current) clearTimeout(archiveBlockedNoticeTimerRef.current)
      if (finishOngoingNoticeTimerRef.current) clearTimeout(finishOngoingNoticeTimerRef.current)
    }
  }, [])

  const showArchiveBlockedNotice = useCallback((reason: ArchiveBlockReason) => {
    // Only true absence of results → "run simulation". Never use that copy for
    // ownership, lifecycle, or persistence failures.
    if (reason === "no_results") {
      setArchiveBlockedNotice("no_results")
    } else if (reason === "result_settings_need_rerun") {
      setArchiveBlockedNotice("result_settings_need_rerun")
    } else if (
      reason === "persistence_failed" ||
      reason === "not_draft" ||
      reason === "not_ongoing"
    ) {
      setArchiveBlockedNotice("failed")
    } else {
      setArchiveBlockedNotice("stale_results")
    }
    if (archiveBlockedNoticeTimerRef.current) {
      clearTimeout(archiveBlockedNoticeTimerRef.current)
    }
    archiveBlockedNoticeTimerRef.current = setTimeout(() => {
      setArchiveBlockedNotice(null)
      archiveBlockedNoticeTimerRef.current = null
    }, 4500)
  }, [])

  const showFinishOngoingNotice = useCallback((kind: "need_archive_checkpoint" | "failed") => {
    setFinishOngoingNotice(kind)
    if (finishOngoingNoticeTimerRef.current) {
      clearTimeout(finishOngoingNoticeTimerRef.current)
    }
    finishOngoingNoticeTimerRef.current = setTimeout(() => {
      setFinishOngoingNotice(null)
      finishOngoingNoticeTimerRef.current = null
    }, 4500)
  }, [])

  return {
    archiveBlockedNotice,
    showArchiveBlockedNotice,
    finishOngoingNotice,
    showFinishOngoingNotice,
  }
}
