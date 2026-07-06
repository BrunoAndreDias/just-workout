# Editable Generate Step Implementation Slices

Ticket: [Audit implementation slices for editable Generate Step review](https://github.com/BrunoAndreDias/just-workout/issues/111)

Baseline: [Editable Generate Step Draft Data Flow](./editable-generate-step-draft-data-flow.md)

## Outcome

Ship the editable `Generate Step` review by changing generation from "create an Active Training Plan immediately" to "create or open a Plan Builder-owned `Training Plan Draft`, let the user review/edit it, then accept it into an `Active Training Plan`."

The safest release path is to land the feature in vertical slices that keep the app runnable after each merge. Do not remove the dev-only prototype in this sequence; [Remove the Generate Step prototype after editable draft implementation is done](https://github.com/BrunoAndreDias/just-workout/issues/112) owns that cleanup after the production path ships.

## Current Seams

- `src/plan-builder/plan-blueprint-types.ts` has no draft field. `src/plan-builder/plan-blueprint.ts` normalizes old blueprints, so this is the right place to default `trainingPlanDraft` to `null`.
- `src/plan-builder/plan-blueprint-command.ts` and `src/plan-builder/builder-state/plan-builder-mutations.ts` already provide projection plus persistence. Draft writes should use this command path so UI state and Dexie stay consistent.
- `src/plan-builder/generate-training-plan-workflow.ts` currently returns `status: "generated"` with a Training Plan route target. This is the contract that must change first: ready generation should return a draft state, not a route to `/training-plans/$planId`.
- `src/training-plan/training-plan.ts` has the reusable generated content logic hidden inside `generateTrainingPlanFromBlueprint`. Extracting final-plan-compatible content avoids duplicating template assignment, rotation pools, and prescriptions.
- `src/training-plan/training-plan-repository.ts` writes accepted plans only. Keep that invariant. Draft accept needs a new cross-table transaction over `planBlueprints` and `trainingPlans`; `saveGeneratedTrainingPlan` can remain the accepted-plan-only helper.
- `src/plan-builder/steps/generate-training-plan/generate-training-plan-step.tsx` is still summary plus button. It should become the production review/editor surface after the draft lifecycle exists.
- `src/plan-builder/plan-builder-route.test.tsx`, `src/plan-builder/generate-training-plan-workflow.test.ts`, and `tests/e2e/plan-builder.spec.ts` currently assert immediate Active Training Plan navigation. These are the highest-signal tests to update when the workflow changes.

## Release Order

### 1. Add Draft Types And No-Behavior Generation Refactor

Goal: introduce the durable shapes without changing user behavior.

Changes:

- Add `TrainingPlanDraft`, `TrainingPlanDraftPlan`, `TrainingPlanDraftValidation`, `TrainingPlanDraftBlocker`, and `TrainingPlanDraftWarning` types near the Plan Builder domain.
- Add `trainingPlanDraft: TrainingPlanDraft | null` to `PlanBlueprint`.
- Extend `StoredPlanBlueprint` and `normalizePlanBlueprint` so legacy blueprints read as `trainingPlanDraft: null`.
- Add `WorkoutTemplatePurpose` to `WorkoutTemplate`, defaulting generated and normalized templates to `"strength"`.
- Extract `createTrainingPlanContentFromBlueprint(blueprint)` from `generateTrainingPlanFromBlueprint`.
- Keep `generateTrainingPlanFromBlueprint` behavior identical by composing the extracted content with lifecycle fields.

Tests:

- `src/training-plan/training-plan.test.ts`: generated output remains equivalent apart from expected `purpose: "strength"`.
- `src/plan-builder/plan-blueprint-command.test.ts`: default and normalized blueprints include `trainingPlanDraft: null`.
- `src/training-plan/training-plan-repository.test.ts`: legacy plans normalize missing `WorkoutTemplatePurpose` to `"strength"`.

Migration:

- No Dexie version bump if `trainingPlanDraft` and `WorkoutTemplatePurpose` are unindexed fields.

### 2. Create, Reuse, Reset, And Clear Drafts

Goal: make draft lifecycle real while the editor can still be read-only.

Changes:

- Add pure draft constructors:
  - `createTrainingPlanDraftFromBlueprint`
  - `resetTrainingPlanDraftFromBlueprint`
  - `clearTrainingPlanDraftAfterAccept`
- Add the first draft commands to `PlanBlueprintCommand`:
  - `createTrainingPlanDraft`
  - `resetTrainingPlanDraft`
  - `clearTrainingPlanDraftAfterAccept`
- Add service wrappers in `plan-builder-service.ts`.
- Update `startGenerateTrainingPlanWorkflow` so ready generation creates or reuses a fresh `Training Plan Draft`.
- Update `acceptGenerateTrainingPlanRecommendedDefaults` so it applies the resolved blueprint and creates a draft, not an Active Training Plan.
- Return a draft-oriented workflow result such as `status: "draft_ready"` with the updated blueprint/draft instead of a Training Plan route target.

Tests:

- `src/plan-builder/generate-training-plan-workflow.test.ts`: ready generation creates a draft, pending defaults still does not write, accepting defaults applies defaults then creates a draft.
- `src/plan-builder/plan-blueprint-command.test.ts`: projection and persistence match for create/reset/clear draft commands.
- `src/plan-builder/plan-builder-route.test.tsx`: Generate opens a draft review and does not create or navigate to an Active Training Plan.

Migration:

- Still no Dexie store/index version bump.

### 3. Accept Draft Atomically Into An Active Training Plan

Goal: restore the ability to finish Plan Builder, but only through explicit draft acceptance.

Changes:

- Add `acceptTrainingPlanDraft` in the persistence layer. It should:
  - load and normalize the current `PlanBlueprint`
  - require a fresh draft
  - validate blockers
  - convert draft content into a `TrainingPlan` with new id, `active: true`, `generatedAt`, and `updatedAt`
  - deactivate previous active Training Plans
  - put the accepted plan
  - clear `PlanBlueprint.trainingPlanDraft`
- Run the accept operation in one Dexie transaction over `db.planBlueprints` and `db.trainingPlans`.
- Add a service method such as `trainingPlanService.acceptTrainingPlanDraft`.
- Change `useOnePageGenerateStep` so Accept Draft invalidates or sets the Plan Builder query and Training Plans queries, then navigates to the accepted Training Plan route.

Tests:

- `src/training-plan/training-plan-repository.test.ts`: accept deactivates previous active plans and clears the draft in the same transaction.
- `src/plan-builder/plan-builder-route.test.tsx`: Accept Draft creates one Active Training Plan and navigates to it.
- `tests/e2e/plan-builder.spec.ts`: Recommended Defaults lead to draft review first; Accept Draft leads to the Training Plan.

Migration:

- No schema version bump, but repository tests should prove old blueprints without drafts and old plans without template purposes still load.

### 4. Stale Drafts And Upstream Builder Edits

Goal: make Generate Step edits to builder choices honest before rich draft editing lands.

Changes:

- Add `markTrainingPlanDraftStale` behavior to upstream Plan Builder transitions that affect generated output:
  - Training Frequency
  - Training Split
  - Rep Range Style
  - Training Volume / Weekly Rep Targets
  - Exercise Selection Preferences
  - Main Compound Selections
  - Main Compound Rotation Pools
  - Main Compound, rotation, and isolation preferences
- Do not stale the draft for draft-local commands.
- In `GenerateTrainingPlanStep`, show a stale state when `trainingPlanDraft.status === "stale_builder_output"`.
- Add Reset Draft action that regenerates from current Plan Builder choices.
- Move the builder-choice controls into the top review position selected from the prototype: Training Frequency, Training Split, Rep Range Style, and Weekly Rep Targets.

Tests:

- `src/plan-builder/plan-blueprint-command.test.ts`: generation-affecting commands stale a draft; draft commands do not.
- `src/plan-builder/plan-builder-route.test.tsx`: changing an upstream value from Generate shows stale output; Reset Draft rebuilds it.
- Focused component tests if the builder-choice controls are extracted.

Migration:

- None.

### 5. Production Draft Review Read Model

Goal: render the selected prototype direction from real draft data before making every field editable.

Changes:

- Add a `TrainingPlanDraftReviewReadModel` for the Generate Step instead of reusing the Active Training Plan read model directly.
- Include:
  - builder-choice summary/edit controls at the top
  - template overview
  - selected template editor shell
  - draft validation blockers/warnings
  - Reset Draft and Accept Draft actions
- Keep product language aligned with `Training Plan Draft`, `Generate Step`, `Workout Template`, and `Workout Template Purpose`.
- Remove "Generate creates a new Active Training Plan" copy from the Generate Step once draft review exists.
- Avoid adding a generic Cancel action. Reset Draft is the recovery action for disliked draft-local edits.

Tests:

- `src/plan-builder/plan-builder-route.test.tsx`: draft review renders generated templates, groups, prescriptions, blockers/warnings, Reset Draft, and Accept Draft.
- Accessibility assertions for dialog removal if Recommended Defaults confirmation changes shape.

Migration:

- None.

### 6. Draft-Local Template, Group, Slot, And Prescription Editing

Goal: let the user edit the generated workout details without mutating upstream builder choices.

Changes:

- Add focused draft commands and mutation hooks:
  - update template label/order
  - update `WorkoutTemplatePurpose`
  - replace a generated template with a custom-focus template when template count still matches Training Frequency
  - add/delete/rename/reorder Superset Groups
  - move slots between groups
  - add/delete/reorder/replace exercise slots
  - update set count and rep target
- Keep exercise replacement catalog-aware. Exercise ids/names/movement patterns/target muscles should come from structured catalog data, not free-text slot strings.
- Allow more than three slots in a group; do not impose an artificial max.
- Block duplicate exercises within the same Workout Template, but allow duplicates across different Workout Templates.
- Preserve the final executable plan shape. If cardio/custom-focus slots need fields not currently represented by `TrainingPlanSlot`, extend the final `TrainingPlan` model before using them in the draft UI.

Tests:

- `src/plan-builder/plan-blueprint-command.test.ts`: every draft-local command projects and persists the same result.
- Draft validation unit tests for duplicate exercises, missing exercise ids, invalid prescriptions, and custom-focus coverage warnings.
- `src/plan-builder/plan-builder-route.test.tsx`: edit a template/group/slot/prescription and accept the resulting plan.

Migration:

- No Dexie version bump unless implementation adds indexed fields or a separate table.

### 7. Starting Loads And Baseline Bodyweight In The Draft

Goal: move narrow setup values that affect first sessions into the Generate Step draft review.

Changes:

- Add draft-local editing for `startingLoadSuggestions`.
- Add draft-local editing for `baselineBodyweight`.
- Ensure accepted plans still satisfy existing session-start and load-prefill code paths.
- Keep Training surface bodyweight edits after acceptance; the draft value is only the initial baseline.

Tests:

- `src/training-plan/training-session-load-prefill.test.ts`: accepted draft starting loads prefill first sessions.
- `src/training-plan/training-session-start-route.tsx` route tests or existing route tests: accepted baseline bodyweight is available on the Training surface.
- `src/training-plan/training-plan-repository.test.ts`: accept preserves draft starting loads and baseline bodyweight.

Migration:

- Existing plan normalizers already default `baselineBodyweight` to `null`; include draft defaults in Plan Blueprint normalization.

### 8. Validation Hardening And Full Route Coverage

Goal: make the accepted draft safe to follow without blocking intentional custom-focus workouts.

Changes:

- Add a pure `validateTrainingPlanDraft` and call it:
  - after draft creation
  - after draft-local edits
  - before Accept Draft
- Block:
  - invalid prescriptions
  - empty required strength slots
  - missing exercise ids
  - avoided or unavailable exercises
  - duplicate exercises within one Workout Template
  - missing required strength coverage when all templates are strength-focused
- Warn:
  - custom-focus templates intentionally reducing strength coverage
  - Weekly Rep Target drift caused by draft-local prescription edits
  - missing Baseline Bodyweight when bodyweight load-volume data will be incomplete but the plan can still be accepted
- Update route and e2e tests so the complete path is:
  - open Generate
  - resolve Recommended Defaults if needed
  - review draft
  - make a small draft edit
  - Reset Draft
  - make/keep final draft
  - Accept Draft
  - follow the Active Training Plan

Tests:

- Unit tests for validation blockers and warnings.
- `src/plan-builder/plan-builder-route.test.tsx` for stale/reset/accept states.
- `tests/e2e/plan-builder.spec.ts` for the happy path and at least one reset path.

Migration:

- None beyond normalizers unless indexed persistence changes.

## Out-Of-Sequence Risks

- Building the editor before draft persistence will force component state to stand in for domain state and make reset/accept behavior fragile.
- Accepting drafts before the cross-table transaction can leave a generated Active Training Plan while the Plan Builder still shows the accepted draft.
- Adding custom-focus/cardio UI as draft-only data will lose the user's edits on Accept Draft. Extend the final `TrainingPlan` model first when the executable shape needs new fields.
- Updating the e2e happy path before route-level workflow tests will make failures harder to diagnose because the current contract changes from navigation to draft review.

## Recommended Handoff

Hand implementation to one agent in this order:

1. Land slices 1-3 together if possible; they define the new core contract and restore a complete generate-to-active path.
2. Land slice 4 separately; stale/reset behavior touches many existing Plan Builder commands.
3. Land slice 5 as the first real UI pass using the selected prototype direction.
4. Land slice 6 in focused sub-slices if needed by editor area: templates first, groups second, slots/prescriptions third.
5. Land slices 7-8 after the core workout editor works.
6. Resolve the prototype cleanup ticket only after the production UI has replaced the prototype as the source of truth.
