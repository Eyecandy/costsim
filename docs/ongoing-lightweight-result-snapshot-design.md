# Ongoing lightweight result-snapshot architecture (design only)

**Date:** 2026-09-14  
**Branch reference:** `feature/checkpoint-analysis` @ `5919a9c`  
**Scope:** Design only. No production code changes, no git operations, no data migration.

This document defines the **target** persisted-result model for Ongoing Analysis before rebuilding on a recovery branch. The current branch is the behavioral reference (checkpoints, comparison, Development chart, completion, Results surfaces, heavy persistence experiments).

---

## Product framing

| Mode | Role | Persisted result posture |
|------|------|--------------------------|
| **Single Analysis** | Deep point-in-time analysis | May keep a richer snapshot (today: full MC totals). Unification with Ongoing is **not** required. |
| **Ongoing Analysis** | Lightweight historical development over checkpoints | Archived history should use a **compact frozen snapshot**, not Single-style 20k arrays. |

**Shared analytical core (unchanged):** Project/input model, MC engine, input signature, Key Figure definitions, S-curve / Tornado / Shapley **semantics**, validity/stale rules where they still apply.

**Allowed to diverge:** persisted result/history representation for Single vs Ongoing archived checkpoints.

---

## 1. Current heavy dependencies

Today’s Ongoing archive/draft path freezes essentially a slimmed Single result:

- `ArchivedAnalysisSnapshotV1.projectResults[].values` — **~20 000 totals** (~**217 KB**, ~98% of ~220 KB snapshot)
- Same payload again in `draftResultSnapshot` / createNext inherited seed → **~2×** per document after createNext
- `inputSeries[].values` already emptied on archive (UI never reads them)
- Tornado rows + Shapley objects are already frozen (small)
- `projectsAtArchive` duplicates checkpoint workspace Project data

**Historical UI paths that still force raw arrays at render time:**

| Path | Why |
|------|-----|
| Key Figures | Recompute percentiles / mean / std / probs from `values` |
| Change since previous | `extractKeyFigureValue` on previous + current `values` |
| Development chart | Sort `values` per CP for P50/P85 (chart itself is scalar) |
| S-curve (+ previous overlay) | Full sort → empirical CDF → downsample to **800** display points; markers/hover still use full array |
| PDF / AI brief | Same KF + S-curve consumers |
| Hydration | `applyArchivedResults` copies full `projectResults` into App state |

**Already free of raw arrays for historical display:** Tornado (frozen rows), Contribution (frozen Shapley), structural comparison (workspace only), Development **chart geometry** after metrics exist.

---

## 2. Exact UI requirements per Ongoing result section

### Key Figures

| | |
|--|--|
| **A. Data read today** | `projectResults[].values`, `simulatedBaseCostByProjectId`, `incurredCosts`, Result Preferences / frozen `resultView` |
| **B. Needs raw `values`?** | Yes today; **no** if scalars frozen at archive |
| **C. Alternative** | Precomputed scalar bag |
| **D. Min persist** | See §5 |

### Change since previous (`CheckpointComparisonSection` `"change"`)

| | |
|--|--|
| **A.** | Previous archived results + current viewed source; workspace for structural counts |
| **B.** | KF deltas: yes today via `values`. Structural: no |
| **C.** | Scalar KF bags per CP + workspace for structure |
| **D.** | Same KF scalars as Key Figures; **do not** put workspace inside result snapshot |

### Context strip (`"context"`)

Labels / sequence / name only — **no** result payload.

### Development chart

| | |
|--|--|
| **A.** | Per CP: baseCost, P50, P85 (extracted from `values` today) |
| **B.** | Not at chart render — only during extract |
| **C.** | Scalars only |
| **D.** | `{ checkpointId, name, sequence, baseCost, p50, p85 }` |

### S-curve (+ previous-CP reference)

| | |
|--|--|
| **A.** | Full `values` → CDF → **800** display points; previous CP copies archived `values` |
| **B.** | Yes today for rebuild; **no** if compact CDF frozen |
| **C.** | Sampled/display CDF points + marker costs from scalars |
| **D.** | See §4 |

### Tornado

| | |
|--|--|
| **A.** | Archived: `tornadoByProjectId` rows. Live tip: recompute from Project |
| **B.** | No (length gate only on live) |
| **C.** | Frozen rows |
| **D.** | Top‑N `DeterministicTornadoRow[]` (already 6 on archive) |

### Contribution / Shapley

| | |
|--|--|
| **A.** | Archived / draft-persisted: frozen `ShapleyAttributionResult`. Live: worker + P50/P85 from `values` |
| **B.** | Not for archived display |
| **C.** | Frozen attribution object |
| **D.** | Full `ShapleyAttributionResult` when available; else null / “not stored” |

### Checkpoint comparison (full)

Structural = workspace. Result deltas = KF scalars. Previous S-curve = compact CDF on previous snapshot.

### PDF / export

Same as KF + S-curve + tornado + Shapley getters. Compact snapshot is sufficient if adapters feed PDF the same shapes (scalar KF + display CDF + frozen tornado/Shapley).

### AI brief

Today recomputes some tornado from live projects and stats from `values`. For **archived** Ongoing, should consume frozen snapshot only (no new MC / no inventing Shapley). Compact snapshot is enough if brief builder is taught to prefer frozen rows/scalars.

### Other

Share link: workspace only. Timeline / complete Ongoing: lifecycle metadata, not MC arrays.

---

## 3. Proposed `OngoingCheckpointResultSnapshotV1`

```ts
/** Frozen analytical + presentation freeze for ONE Ongoing checkpoint (archive or compact draft). */
type OngoingCheckpointResultSnapshotV1 = {
  schemaVersion: 1
  /** Traceability; same role as ARCHIVE_MODEL_VERSION today. */
  modelVersion: string
  archivedAt: string // or computedAt for draft
  simulationCount: number
  /** Canonical analytical input signature at freeze time. */
  inputSignature: string

  /** Ongoing is single-project; keep id for multi-project-shaped helpers. */
  activeProjectId: string
  incurredCosts: number
  simulatedBaseCost: number | null

  /**
   * All Key Figure scalars needed for historical KF table, comparison deltas,
   * Development chart, Shapley reconciliation labels, and S-curve markers.
   * Computed once at freeze from the live 20k run — never recomputed from raw arrays.
   */
  keyFigures: OngoingFrozenKeyFiguresV1

  /**
   * Compact empirical CDF for historical S-curve (+ PDF overlay).
   * Built with the same downsample path as live UI (see §4).
   * NOT 20k totals.
   */
  sCurve: {
    representation: "display_cdf_v1"
    /** Target count used when freezing (e.g. 800). */
    pointCount: number
    /** Monotonic CDF points { x: cost, y: cumulativeProb in [0,1] }. */
    points: ReadonlyArray<{ x: number; y: number }>
  }

  /** Deterministic Tornado top rows at freeze. */
  tornado: DeterministicTornadoRow[] | null

  /**
   * Contribution analysis when available at freeze.
   * null → UI must not invent a new calculation as historical.
   */
  contribution: ShapleyAttributionResult | null

  /**
   * Presentation that governed this freeze (historical interpretation).
   * Archived viewing should use this, not mutate device prefs into the past.
   */
  resultPreferences: ResultPreferencesV1
  resultView: ResolvedResultView
}

type OngoingFrozenKeyFiguresV1 = {
  baseCost: number | null
  expectedValue: number | null
  stdDev: number | null
  /** Relative stdDev % vs expected value — same as table companion. */
  stdDevPct: number | null
  expectedAddition: number | null
  expectedAdditionPct: number | null
  uncertaintyReserve: number | null
  uncertaintyReservePct: number | null
  /** P(total ≤ baseCost). */
  probAtBase: number | null
  /**
   * P(total ≤ amount) for the amount frozen in resultView, if enabled.
   * Historical view does not re-evaluate arbitrary new thresholds without samples.
   */
  probBelowCostLevel: number | null
  probabilityBelowAmount: number | null
  /**
   * Explicit percentile map for every percentile that was in resultView.keyFigures
   * at freeze, plus always at least 50 and 85 (Development / reserve).
   * Keys: "50", "85", … as strings for JSON stability.
   */
  percentiles: Record<string, number>
}
```

### Field justifications

| Field | Why |
|-------|-----|
| schema/model/archivedAt/simulationCount/inputSignature | Validity, immutability, stale detection, diagnostics |
| activeProjectId / incurredCosts / simulatedBaseCost | KF math identity with today’s extractors |
| keyFigures | Replace all `extractKeyFigureValue` / Development extract / comparison deltas |
| sCurve.points | Replace historical S-curve rebuild from 20k |
| tornado | Already correct; keep |
| contribution | Already correct; keep |
| resultPreferences / resultView | Historical fidelity of which markers/rows were “the” accepted view |

### Explicitly **excluded**

| Excluded | Why |
|----------|-----|
| `projectResults[].values` (20k) | Dominates storage; not needed after freeze |
| `inputSeries` sample arrays | Already unused in Results |
| `projectsAtArchive` / full Project[] | **Owned by `checkpoint.workspace`** |
| Ephemeral UI (zoom, hover, expanders, Guided) | Not analytical history |
| Duplicate workspace inside snapshot | Dual authority |

Adapters should map this type → today’s section props (or a thin `CheckpointResultSource` that exposes scalars + CDF instead of `values`).

---

## 4. S-curve compaction

### Current behavior

1. Live MC retains **20 000** totals (precision unchanged).  
2. UI builds full empirical CDF, then **`downsampleCdfPointsForDisplay` → target 800** (`SCURVE_DISPLAY_POINT_TARGET`).  
3. Markers / domain / hover still call percentile/sort on the **full** array.

So the user already sees ~**800** polyline points. Persisting those points preserves **visual identity** with current rendering.

### Options

| Option | Representation | Size (order) | Fidelity |
|--------|----------------|--------------|----------|
| **A** | Fixed quantile grid P0…P100 (101 costs) | ~2 KB | Smooth enough; slightly coarser than today’s 800-pt polyline |
| **B** | Decimated sorted CDF = **same 800 display points** as live UI | ~25 KB | **Matches current SVG** |
| **C** | Hybrid: 201 half-percent quantiles + exact marker costs from KF | ~7–13 KB | Very close; markers exact |

### Recommendation

**Persist Option B at archive/draft-freeze:** run `computeSCurveDisplaySeries(values, 800)` once while the live 20k array is in memory; store the resulting points; **discard totals**.

- Historical hover / PDF: interpolate along stored points (acceptable for Ongoing history).  
- Do **not** reduce live simulation precision.  
- Previous-CP overlay: previous snapshot’s compact `sCurve.points` (not raw arrays).

If storage pressure is still high later, fall back to Option C (201) without changing the type’s `representation` versioning strategy (bump schema).

**Recommended point count:** **800** (parity with current display). Acceptable range **201–800**.

---

## 5. Key Figure persistence

Freeze as scalars at archive (and compact draft) time — **no** historical re-sort of raw arrays.

**Always store:**

- `baseCost`, `incurredCosts` (or via top-level)
- `p50`, `p85` (Development + reserve)
- `expectedAddition`, `expectedAdditionPct`
- `uncertaintyReserve`, `uncertaintyReservePct`
- `expectedValue`, `stdDev`, `stdDevPct`
- `probAtBase`
- `probBelowCostLevel` + frozen `probabilityBelowAmount` when that KF was enabled in `resultView`
- Every percentile present in `resultView.keyFigures.percentiles` at freeze

Historical Key Figures / comparison should read this bag (filtered by frozen `resultView` for which rows show). Device prefs must not invent new percentiles on archived CPs without samples (see §14).

---

## 6. Tornado

**Yes — fully representable by frozen rows.**

Persist: `DeterministicTornadoRow[]` (current archive already uses top **6**):

```ts
{ name, type: "cost"|"driver", sourceSeriesIndex, lowImpact, highImpact, spread }
```

Historical rendering: **no** raw MC values. Live tip may still recompute from workspace. Do not change Tornado calculation.

---

## 7. Contribution / Shapley

**Yes — fully representable by existing `ShapleyAttributionResult`.**

Persist when available at freeze; otherwise `null` and show “not stored” (current contract).

Read-only / archived / CP navigation: **never** recompute Shapley. Live tip may compute once and optionally attach to compact draft snapshot.

---

## 8. Development chart

**Minimum:**

| Field | Required |
|-------|----------|
| checkpointId | yes |
| checkpointName | yes |
| sequence | yes |
| baseCost | yes |
| p50 | yes |
| p85 | yes |

Nothing else is required for the current chart. Prefer reading from `keyFigures` on each checkpoint’s lightweight snapshot (no per-CP array sort).

---

## 9. Checkpoint comparison

| Concern | Source of truth |
|---------|-----------------|
| **A. Structural / input** | `checkpoint.workspace` (cost/driver ids + ranges) — **not** in result snapshot |
| **B. Result comparison** | Lightweight snapshot `keyFigures` (+ compact S-curve for previous overlay) |

Needs for Previous / Current / Change / % / pp: scalar bags on both sides + shared frozen or current tip presentation rules. Structural row diffs: workspace only — **do not** duplicate workspace into the result snapshot.

---

## 10. Active draft checkpoint

| Phase | Behavior |
|-------|----------|
| Active work | Full 20k in **runtime memory**; normal Results; Tornado/Shapley as today |
| Autosave | Persist workspace + checkpoint metadata; **do not** write 20k to localStorage |
| Archive | Derive `OngoingCheckpointResultSnapshotV1` from in-memory run; persist compact; drop need for historical 20k |
| createNext | Seed next tip workspace from previous; **do not** inherit a second full MC array |

### Draft Results across reload

| Option | UX | Storage |
|--------|-----|---------|
| **A. Compact draft snapshot** | Results survive reload for Ongoing tip | ~10–35 KB |
| **B. No draft Results until archive** | Reload clears Results until re-simulate | Minimal |

**Recommendation: Option A** if compact freeze is cheap (same builder as archive). Continuity matches user expectation after Single’s reload work, without quota cliffs. Prefer A over B whenever the compact path exists.

---

## 11. Single vs Ongoing snapshots

| | Single (near term) | Ongoing archived |
|--|--------------------|------------------|
| Purpose | Deep point-in-time | Historical development |
| Persist type | May remain richer (`DraftResultSnapshot` / full totals) temporarily | **Must** be lightweight `OngoingCheckpointResultSnapshotV1` |
| Raw 20k after sim | Useful for exact hover / future prefs on **same** run | **Not** required after archive |
| Later | Can adopt same compact snapshot without losing core UI | Already compact |

**Immediate decision:** different persisted snapshot types are intentional. Do not force one schema.

Does Single *truly* need 20k after reload? Same analysis as Ongoing: UI can run on compact CDF + scalars. Single may keep richer storage longer for product reasons; not blocking Ongoing recovery.

---

## 12. Future “Create Single Analysis from checkpoint”

Supported cleanly:

1. Copy `checkpoint.workspace` → new Single draft document  
2. Preserve project/row IDs only where product policy allows  
3. Do **not** mutate Ongoing history  
4. User runs a **fresh** full simulation in Single  

Lightweight history does **not** need raw MC arrays for this — inputs are on the checkpoint; deeper analysis is a new run.

---

## 13. Storage size estimate

Reference: current raw draft/archive ≈ **220 KB**, of which **values ≈ 217 KB**.

### Approximate lightweight checkpoint (UTF-8 JSON order-of-magnitude)

| Part | ~Bytes |
|------|-------:|
| Metadata + signatures | 0.5–1 KB |
| Key figure scalars | &lt;1 KB |
| S-curve 800 points | ~25 KB |
| Tornado (6 rows) | ~1 KB |
| Contribution (typical) | ~2–4 KB |
| Frozen prefs / resultView | &lt;1 KB |
| **Total / checkpoint** | **~30–35 KB** |

(With 201-pt curve: ~**12–15 KB**/CP.)

### Scale vs today (using ~32 KB/CP @ 800 pts)

| Checkpoints | Lightweight (est.) | Today-style raw 20k/CP |
|-------------|-------------------:|-----------------------:|
| 1 | ~32 KB | ~220 KB |
| 5 | ~160 KB | ~1.1 MB |
| 10 | ~320 KB | ~2.2 MB |
| 20 | ~640 KB | ~4.4 MB |
| 24 (max) | ~770 KB | ~5.3 MB |

Plus workspace/metadata (small). **~6–7× smaller** than raw arrays at 800 pts; **~15–20×** at 201 pts. Fits localStorage with headroom; eliminates createNext double-20k cliff.

---

## 14. Result preferences / historical fidelity

| Layer | Rule |
|-------|------|
| **Analytical result** | Frozen scalars + compact CDF + tornado + contribution |
| **Frozen historical interpretation** | `resultPreferences` + `resultView` stored on snapshot; archived UI uses these |
| **Current device preferences** | Apply to **active draft tip** only; do not rewrite archived interpretation |

Immutable on archived CP: analytical freeze + archived presentation freeze.  
Dynamic: tip prefs, layout chrome, language.

If user enables a new percentile only on device prefs while viewing an **archived** CP: either hide it or show “not in archived view” — do **not** re-simulate.

---

## 15. Target ownership model

```
AnalysisDocument
  analysisMode: "ongoing"
  ongoing: OngoingAnalysisState
    lifecycle, activeCheckpointId
    checkpoints[]: AnalysisCheckpoint
      id, sequence, name, status, timestamps
      workspace              ← SoT for checkpoint INPUTS
      archivedResultSnapshot ← SoT for archived RESULTS (lightweight V1)
  draftResultSnapshot?       ← SoT for ACTIVE TIP results (compact V1), optional

Runtime (session / App memory)
  live ProjectResult.values (20k) while tip is simulated
  workers, UI ephemeral state
```

| Concern | Source of truth |
|---------|-----------------|
| Checkpoint inputs | `checkpoint.workspace` |
| Archived results | `checkpoint.archivedResultSnapshot` (lightweight) |
| Active draft results | In-memory 20k + optional compact `draftResultSnapshot` on document |
| Timeline metadata | `OngoingAnalysisState` / checkpoint fields |
| Library list | Summary index (metadata only) |
| Device Result Preferences | Separate prefs store — tip only |

Repository persistence is **not** UI state authority. `activeCheckpointId` changes only via explicit lifecycle/navigation.

---

## 16. Migration / recovery implications

Recovery alignment (domain vs rejected persistence approaches):

| Reapply safely (domain/UI) | Do **not** bring over as-is |
|----------------------------|-----------------------------|
| Checkpoint lifecycle through Complete Ongoing (`29a0794`) | Full-array `draftResultSnapshot` / archive `projectResults.values` (`e3298ba` payload strategy) |
| Comparison, archive UX, naming, Shapley-nav | Fail-closed + blocking `flushPendingSave` trap (`5919a9c`) |
| Development chart + perf | createNext inherited **full** MC seed |
| Library summary index (verify) | Capacity diagnostic-only noise if undesired |

| UI that can stay mostly unchanged | Needs adapters / reconstruction |
|-----------------------------------|----------------------------------|
| ResultsPanel section chrome | Hydration: archived → compact snapshot adapters |
| CheckpointNav / timeline | `extractKeyFigureValue` / Development extract → scalar readers |
| Comparison layout | S-curve previous reference ← compact CDF |
| Tornado / Shapley presenters | Archive builder: derive lightweight V1 from live 20k |
| Development chart component | Leave-without-save on flush failure |

No user data migration in recovery phase: new docs use new snapshot; old heavy docs may fail open/read until pruned by user or a later optional migrator.

---

## 17. Design principles (checklist)

- Shared analytical core; no duplicate engines / KF / Tornado / Shapley math  
- Ongoing-specific code = lifecycle / history / presentation adapters only  
- Archived checkpoints immutable  
- `activeCheckpointId` only via explicit actions  
- Repository ≠ UI authority  
- **Persistence failure must never trap navigation**  
- Historical navigation must not trigger simulation or Shapley  

---

## 18. Implementation sequence (new recovery branch)

1. Recover domain branch (baseline `29a0794` + chart cherry-picks; skip heavy persistence / trap commit).  
2. **Leave-without-save** on flush failure (product contract).  
3. Introduce `OngoingCheckpointResultSnapshotV1` + freeze builder (from in-memory `ProjectResult`).  
4. Wire archive path to write lightweight snapshot only.  
5. Adapters: KF, comparison, Development, S-curve, PDF read compact shape.  
6. Compact draft persistence (Option A) for tip continuity.  
7. Stop inheriting full MC arrays on createNext.  
8. Fail-closed durable writes **after** payloads are small and leave is safe.  
9. Optional: Single compact later; “Create Single from checkpoint” as separate feature.  

---

## Final recommendation

| Persist for Ongoing | Do **not** persist |
|---------------------|--------------------|
| Compact KF scalars | Raw 20k `ProjectResult.values` after archive |
| Display CDF (~800 pts, or 201–800) | Factor `inputSeries` samples |
| Frozen Tornado rows | Duplicate `projectsAtArchive` / workspace copies in result blob |
| Frozen Contribution when available | Ephemeral UI state |
| Frozen resultView/prefs for historical interpretation | Blocking flush that traps Library navigation |
| Compact draft snapshot for tip continuity | Full MC inheritance on createNext |

**After checkpoint archive, raw 20k values are not needed** for current Ongoing historical UI if the lightweight snapshot above is frozen at archive time.

**This architecture is safe to use as the recovery target:** it preserves Ongoing product behavior, keeps the shared analytical core, separates Single vs Ongoing persistence by design, and removes the storage cliff that destabilized the feature branch.

NO CODE CHANGES in this task — design reference only.
