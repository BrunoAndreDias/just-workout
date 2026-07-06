# Automated Training Block Progression Implementation Audit

Source ticket: [Audit implementation gaps for automated Training Block progression](https://github.com/BrunoAndreDias/just-workout/issues/89)

Parent map: [Map: Automate Training Block progression after initial configuration](https://github.com/BrunoAndreDias/just-workout/issues/87)

## Decision Inputs

- [Decide the progression metric for automated Training Blocks](https://github.com/BrunoAndreDias/just-workout/issues/88): planned `Training Volume` stays stable; `Completed Load Volume` is informational.
- [Decide the exercise reuse and rotation policy for new Training Blocks](https://github.com/BrunoAndreDias/just-workout/issues/92): create a user-confirmed `Training Block Exercise Rotation Proposal` across eligible roles.
- [Decide the progress-review UX for Training Week Volume Progression](https://github.com/BrunoAndreDias/just-workout/issues/93): `Training History` owns full review; `Active Training Plan` shows compact signals.
- [Decide how Session Bodyweight is captured and applied to Completed Load Volume](https://github.com/BrunoAndreDias/just-workout/issues/94): store resolved `Session Bodyweight` and source on each `Training Session`.
- [Prototype the six-week Training Block ramp model](https://github.com/BrunoAndreDias/just-workout/issues/91): use exact-exercise `Previous Exercise Load Prefill` or empty first-time loads; progress effort through RIR.
- [Decide the Training Block automation UX](https://github.com/BrunoAndreDias/just-workout/issues/90): first version is inline confirm-and-accept on the `Active Training Plan` / `Training Surface`.
- [Decide the Training Block Exercise Swap and load prefill UX](https://github.com/BrunoAndreDias/just-workout/issues/95): swaps are compatible, block-scoped, and future-facing after completed history.
- [Decide configurable Extra Training Session creation](https://github.com/BrunoAndreDias/just-workout/issues/96): first version repeats an existing `Workout Template` and stores explicit extra-session intent.

## Current Baseline

- `TrainingPlan` already has `trainingBlockWeeks`, optional `trainingBlock`, and plan-level `startingLoadSuggestions`; generated plans default to six weeks in `src/training-plan/training-plan.ts`.
- `TrainingSession` stores completed sets as `weight` and `reps`, plus `volumeByMovementPattern`; it does not store `Training Block`, `Training Week`, `Session Bodyweight`, bodyweight source, extra-session intent, per-set RIR, or per-set completion status in `src/training-plan/training-session.ts`.
- `Completed Load Volume` is currently `set.weight * set.reps`, and a loaded set is any set with positive weight and reps in `src/training-plan/completed-load-volume.ts`.
- The current transition flow clones a new `TrainingPlan` id and saves it through the generated-plan save path in `src/training-plan/training-block-transition.ts` and `src/training-plan/training-plan-route.tsx`.
- The current next-block UI still uses "Cycle" language, "Generate next cycle", and "Accept next cycle" in `src/training-plan/active-training-plan/training-block-progress.tsx`.
- `Training History` can compare movement-pattern `Completed Load Volume` by selected seven-day `Training Week`, but it does not yet produce the decided `Training Week Progress Verdict`, `Training Session Volume Progression`, partial-volume caveats, or `Training Week Completion Context`.
- The start flow lets the user pick any `Workout Template`, while "Start next workout" always points at the first template. There is no normal sequence state and no extra-session intent.

## Implementation Slices

### 1. Keep Training Block progression inside one Active Training Plan

Make the `Active Training Plan` identity survive a new `Training Block`. The current clone-to-new-plan flow severs history because future queries load sessions by the new plan id only.

Minimum work:

- Change transition acceptance to update the existing `TrainingPlan` record instead of saving a generated replacement plan with a new plan id.
- Add `trainingBlockId` and `trainingWeekNumber` or resolvable week metadata to completed `Training Sessions`.
- Derive next-block eligibility from actual `Training Week` completion state instead of `getCompletedTrainingBlockWeeks()` returning every week.
- Keep previous-block sessions available for `Training Week Volume Reference`, exact-exercise prefill, progression, and history after the transition.

Tests:

- Route test: accepting a next `Training Block` keeps the same plan id, shows week 1 of the new block, and still sees prior sessions in `Training History`.
- Repository test: saving the next `Training Block` does not deactivate the current `TrainingPlan` as if it were a separate generated plan.

### 2. Add Session Bodyweight and partial Completed Load Volume

Bodyweight work cannot ship correctly until `Session Bodyweight` and source metadata exist. The current set `weight` field already allows signed bodyweight adjustments, but volume math treats zero or negative bodyweight sets as no loaded work.

Minimum work:

- Add `Baseline Bodyweight` to `TrainingPlan` only when required by generated or introduced bodyweight exercises.
- Add weekly bodyweight defaults owned by the `Training Surface`.
- Store resolved `sessionBodyweight` and `sessionBodyweightSource` on each `Training Session`.
- Calculate bodyweight effective load as `max(0, sessionBodyweight + adjustment)` while preserving ordinary external-load behavior.
- Represent missing bodyweight volume as a `Partial Volume Comparison`, not as zero.
- Add narrow historical correction support for completed sessions.

Tests:

- Unit tests for effective load with bodyweight-only, added load, machine assistance, and missing bodyweight.
- Route tests for requiring bodyweight before completing a session that needs known bodyweight volume.
- History tests for partial weekly and session caveats.

### 3. Promote Training History to the decided progress model

The current history report compares movement patterns and shows total volume, but the decided model needs a top-line verdict and session-level explanation.

Minimum work:

- Add `Training Week Progress Verdict`: progressed, unchanged, regressed, or not comparable.
- Add `Training Week Volume Reference` for the active week and week 1 of a new `Training Block`.
- Add `Training Week Completion Context` for fewer-than-expected and extra sessions.
- Add `Training Session Volume Progression` by comparing each completed session with the previous comparable session for the same `Workout Template`.
- Surface compact current-week or latest-verdict signals in `Active Training Plan`; link full detail to `Training History`.

Tests:

- Unit tests for verdicts, no-prior-week state, completion differences, extra sessions, and partial-volume caveats.
- Route tests for compact Active Training Plan signal and detailed Training History drilldown.

### 4. Replace reset loads with exact-exercise Previous Exercise Load Prefill

The current load suggestion code still applies same-exercise `-5%` and Movement Pattern `-10%` resets, plus a safe default. The decided first version uses exact exercise history only.

Minimum work:

- Use the latest completed set data for the same exercise in the previous `Training Block`; if there is no exact exercise history, leave the first load empty.
- Leave first-time exercises empty instead of inferring from Movement Pattern history or the replaced exercise.
- Store prefill source and display state, so the explanation can appear in the transition review and first relevant `Training Session`.
- Clear the prefill explanation after the user edits load or reps, saves a set, or completes a set for that exercise in the new `Training Block`.
- Add per-set RIR capture and use `applyTrainingBlockProgressionRule` in the session flow rather than leaving it as an isolated domain helper.

Tests:

- Unit tests for exact-exercise prefill, first-time empty load, no Movement Pattern fallback, bodyweight adjustment prefill, and RIR-based progression decisions.
- Route tests for prefill messaging and dismissal.

### 5. Build the full Training Block Exercise Rotation Proposal

The current rotation function is still named around main compounds, applies all proposed rotations on accept, does not consult avoided exercises, and has no proposal-row actions.

Minimum work:

- Rename and reshape the domain API around `Training Block Exercise Rotation Proposal`.
- Preserve slot intent: Movement Pattern, `Workout Exercise Role`, and target muscles.
- Exclude avoided exercises by using a generation-time policy snapshot or source Plan Builder data.
- Prefer never-performed compatible exercises, then compatible exercises not used in the immediately previous `Training Block`.
- Use `Main Compound Rotation Pools` first for main compounds; use `Isolation Exercise Preferences` first for isolation/accessory slots.
- Prevent duplicates inside the same `Workout Template`, not only across the whole proposal.
- Include proposal row reasons for proposed and kept slots.
- Support individual row skip/keep and compatible replacement selection before accept.
- Include abs and other eligible accessory slots where compatible catalog replacements exist.

Tests:

- Unit tests for role compatibility, avoidance, preference ordering, never-performed preference, previous-block exclusion, duplicate prevention, and reasons.
- Route tests for accepting, skipping, and changing proposal rows.

### 6. Ship the inline transition review, skip, and undo

The prototype proves the shape, but the production path still lacks the decided interaction contract.

Minimum work:

- Replace "Cycle" UI copy with `Training Block` vocabulary.
- Show compact readiness and progress summary on the `Active Training Plan` / `Training Surface`.
- Add inline review with rotation proposal, load prefill state, RIR ramp, progress reference, and caveats.
- Add "skip rotation but create next Training Block" behavior.
- Add undo until the first new-block `Training Session` starts; after that, route corrections through swaps.
- Persist transition acceptance and undo state.

Tests:

- Route tests for readiness, review open, accept, skip rotation, undo before first session, and no undo after starting a new-block session.

### 7. Add block-scoped Training Block Exercise Swap

Swaps are not present in production yet. They are needed both inside a pending rotation proposal and from the current block workout structure.

Minimum work:

- Add a compatible replacement picker scoped to the original slot.
- Apply swaps to future occurrences in the same `Training Block` for the same Movement Pattern and `Workout Exercise Role`.
- Before the first completed session in a block, allow a swap to shape that first session and the block slot.
- After completed history exists, preserve completed sessions and update only future sessions.
- Reuse the same row action inside the pending rotation proposal.
- Recalculate prefill state for swapped exercises using exact exercise history only.

Tests:

- Unit tests for propagation scope and completed-history protection.
- Route tests for current-block swap and proposal-row swap.

### 8. Add explicit Extra Training Session intent and sequencing

The current app can start any template, but it does not know whether a session is expected or extra, and the next-workout sequence is not modeled.

Minimum work:

- Add normal next-workout sequencing based on completed sessions in the current/open `Training Week`.
- Show extra-session entry only after expected weekly frequency is met.
- Let the user choose any existing `Workout Template` for the extra session.
- Store explicit extra-session intent on the completed `Training Session`.
- Do not advance normal next-workout sequence when completing an extra session.
- Include extra sessions in `Completed Load Volume`, exact-exercise history, progression, and `Training Week Completion Context`.

Tests:

- Unit tests for sequence selection and extra-session classification.
- Route tests for extra-session entry availability, explicit extra intent, and no sequence advancement.

## Data Model Changes

Recommended minimum changes:

- `TrainingPlan`
  - Keep the same plan id across Training Blocks.
  - Store current and historical `TrainingBlock` metadata, or at minimum an active block plus enough previous-block metadata to resolve sessions.
  - Store `baselineBodyweight` when needed.
  - Store weekly bodyweight defaults, or add a small keyed store for them.
  - Store enough exercise-selection policy for future rotations: avoided exercise ids, isolation preference buckets, main compound rotation pools, and generated slot intent.
- `TrainingSession`
  - Add `trainingBlockId`, `trainingWeekNumber` or week anchor, `isExtraTrainingSession`, `sessionBodyweight`, and `sessionBodyweightSource`.
  - Add per-set RIR and completion state for future progression. Existing entries currently lose the `done` flag.
  - Treat bodyweight set weight as `Bodyweight Load Adjustment` and calculate effective load from session bodyweight plus adjustment.
- `TrainingPlanStartingLoadSuggestion`
  - Allow an empty first-time load state.
  - Store source/explanation, exact-history reference, and whether the prefill explanation is still visible.
- Repository and indexes
  - Add a Dexie schema version for new fields and any useful indexes such as `planId`, `trainingBlockId`, `templateId`, `completedAt`, and `isExtraTrainingSession`.
  - Add service methods for accepting a next block, undoing it, saving weekly bodyweight defaults, saving historical corrections, and completing planned versus extra sessions.

## Migration And Backfill

- Existing `TrainingPlan` records can default to one active block when `trainingBlock` exists; plans with no block can keep the six-week default and create a first active block lazily.
- Existing accepted "next cycle" plans should not be auto-merged without a deliberate migration, because old sessions are keyed to the prior plan id. If any local data exists in that shape, preserve it and let the new feature apply going forward.
- Existing `TrainingSession` records should get `trainingBlockId: null` or a best-effort current block id only when the owning plan makes that unambiguous.
- Existing bodyweight sessions with no `Session Bodyweight` become partial comparisons. Adding a later `Baseline Bodyweight` must not backfill them.
- Existing sets have no RIR and no persisted completion state. Do not infer RIR. For completion, preserve current volume behavior for old sessions and persist explicit completion state for new sessions.
- Stored `volumeByMovementPattern` will become stale after bodyweight corrections. Prefer recalculating read models from session exercises and bodyweight metadata, or add an explicit recalculation path when corrections are saved.
- Existing extra-looking history should not be inferred as `Extra Training Session`; the first version stores extra intent only for newly started sessions.

## Verification Scope

Use the existing fast test layers:

- `src/training-plan/training-block.test.ts` for transition, rotation, prefill, RIR, skip, and undo domain behavior.
- `src/training-plan/completed-load-volume.test.ts` for bodyweight effective load and partial comparisons.
- `src/training-plan/training-history-week.test.ts` for verdicts, references, session progression, completion context, extras, and partial caveats.
- `src/training-plan/training-plan-route.test.tsx` for Active Training Plan, Training Surface, transition, session start, bodyweight capture, and Training History integration.
- Repository tests with `fake-indexeddb` for Dexie migration and cross-block history continuity.

No new Wayfinder decision ticket is needed from this audit. The remaining first-version work is implementation in the slices above. The map fog around ad hoc extra-session exercise selection, saved custom templates, and user-defined exercises remains outside this first version.
