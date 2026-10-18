// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useActionNotices } from "@/app/workspace/useActionNotices"

describe("useActionNotices", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("maps an archive-block reason to a notice and clears it after 4.5 s", () => {
    const { result } = renderHook(() => useActionNotices())
    expect(result.current.archiveBlockedNotice).toBeNull()
    act(() => result.current.showArchiveBlockedNotice("no_results"))
    expect(result.current.archiveBlockedNotice).toBe("no_results")
    act(() => {
      vi.advanceTimersByTime(4499)
    })
    expect(result.current.archiveBlockedNotice).toBe("no_results")
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.archiveBlockedNotice).toBeNull()
  })

  it("uses the generic failure notice for lifecycle and persistence reasons", () => {
    const { result } = renderHook(() => useActionNotices())
    for (const reason of ["persistence_failed", "not_draft", "not_ongoing"] as const) {
      act(() => result.current.showArchiveBlockedNotice(reason))
      expect(result.current.archiveBlockedNotice).toBe("failed")
    }
  })

  it("restarts the timer when a new notice arrives", () => {
    const { result } = renderHook(() => useActionNotices())
    act(() => result.current.showFinishOngoingNotice("failed"))
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    act(() => result.current.showFinishOngoingNotice("need_archive_checkpoint"))
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.finishOngoingNotice).toBe("need_archive_checkpoint")
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current.finishOngoingNotice).toBeNull()
  })

  it("leaves no timers behind after unmount", () => {
    const { result, unmount } = renderHook(() => useActionNotices())
    act(() => result.current.showArchiveBlockedNotice("no_results"))
    act(() => result.current.showFinishOngoingNotice("failed"))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
