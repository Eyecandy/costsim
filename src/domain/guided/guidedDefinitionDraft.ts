/**
 * Focus Guided definition-field draft helpers.
 *
 * Definition text is non-analytical metadata: commits update project state
 * intentionally (blur / Cmd|Ctrl+Enter), not on every keystroke.
 */

export function clampGuidedDefinitionDraft(
  value: string,
  maxLength: number,
): string {
  return value.slice(0, maxLength)
}

/** True when the local draft differs from the last known canonical description. */
export function guidedDefinitionDraftNeedsCommit(
  draft: string,
  baseline: string,
): boolean {
  return draft !== baseline
}

export type GuidedDefinitionDraftState = {
  rowId: string
  draft: string
  /** Canonical description last synced or committed for this row. */
  baseline: string
  dirty: boolean
}

export type GuidedDefinitionDraftSyncResult = {
  state: GuidedDefinitionDraftState
  /** Pending commit for a previous row when the active row changes mid-edit. */
  pendingCommit: { rowId: string; description: string } | null
}

/**
 * Sync draft state when the active row or parent canonical description changes.
 * Dirty drafts are preserved across parent rerenders of the same row.
 */
export function syncGuidedDefinitionDraft(
  prev: GuidedDefinitionDraftState,
  next: { rowId: string; sourceDescription: string; maxLength: number },
): GuidedDefinitionDraftSyncResult {
  const source = clampGuidedDefinitionDraft(
    String(next.sourceDescription ?? ""),
    next.maxLength,
  )

  if (prev.rowId !== next.rowId) {
    let pendingCommit: GuidedDefinitionDraftSyncResult["pendingCommit"] = null
    if (prev.dirty) {
      const description = clampGuidedDefinitionDraft(
        prev.draft,
        next.maxLength,
      )
      if (guidedDefinitionDraftNeedsCommit(description, prev.baseline)) {
        pendingCommit = { rowId: prev.rowId, description }
      }
    }
    return {
      pendingCommit,
      state: {
        rowId: next.rowId,
        draft: source,
        baseline: source,
        dirty: false,
      },
    }
  }

  if (prev.dirty) {
    return { pendingCommit: null, state: prev }
  }

  return {
    pendingCommit: null,
    state: {
      rowId: prev.rowId,
      draft: source,
      baseline: source,
      dirty: false,
    },
  }
}

export function applyGuidedDefinitionDraftChange(
  state: GuidedDefinitionDraftState,
  value: string,
  maxLength: number,
): GuidedDefinitionDraftState {
  return {
    ...state,
    draft: clampGuidedDefinitionDraft(value, maxLength),
    dirty: true,
  }
}

export function commitGuidedDefinitionDraft(
  state: GuidedDefinitionDraftState,
  maxLength: number,
): {
  state: GuidedDefinitionDraftState
  commit: { rowId: string; description: string } | null
} {
  const description = clampGuidedDefinitionDraft(state.draft, maxLength)
  if (!guidedDefinitionDraftNeedsCommit(description, state.baseline)) {
    return {
      commit: null,
      state: { ...state, draft: description, dirty: false },
    }
  }
  return {
    commit: { rowId: state.rowId, description },
    state: {
      rowId: state.rowId,
      draft: description,
      baseline: description,
      dirty: false,
    },
  }
}

export function cancelGuidedDefinitionDraft(
  state: GuidedDefinitionDraftState,
): GuidedDefinitionDraftState {
  return {
    ...state,
    draft: state.baseline,
    dirty: false,
  }
}
