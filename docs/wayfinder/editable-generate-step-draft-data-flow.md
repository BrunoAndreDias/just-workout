# Editable Generate Step Draft Data Flow

Ticket: [Research the data flow for editable generated-plan drafts](https://github.com/BrunoAndreDias/just-workout/issues/110)

## Current Flow

- The current Plan Builder is a single persisted `PlanBlueprint` row in Dexie `planBlueprints`. `savePlanBlueprint` clears the table and puts the current blueprint, so resume means "load the most recently updated current blueprint."
- Plan Builder mutations are command-based. The UI optimistically projects a `PlanBlueprintCommand`, then persists the same command through `persistPlanBlueprintCommand`.
- `startGenerateTrainingPlanWorkflow` checks `PlanBlueprintDefaultResolution`. Blocking issues stop generation; pending Recommended Defaults open `Default Generation Confirmation`; a ready blueprint immediately calls `trainingPlanService.generateTrainingPlan`.
- `generateActiveTrainingPlanFromCurrentPlanBlueprint` reloads the current blueprint, normalizes it, resolves defaults again, generates a `TrainingPlan`, and saves it through `saveGeneratedTrainingPlan`.
- `saveGeneratedTrainingPlan` writes to Dexie `trainingPlans`, deactivates previous active plans, and makes the new plan routable/followable immediately.
- `TrainingPlan` currently owns executable workout data: `workoutTemplates`, `supersetGroups`, `TrainingPlanSlot`s, `TrainingPrescription`s, `weeklyRepTargets`, rotation pools, bodyweight defaults, and training-block state.

## Decision

Store the editable generated candidate on the current `PlanBlueprint` as a Plan Builder-owned `TrainingPlanDraft`. Do not store drafts in `trainingPlans`, and do not keep them ephemeral.

This is the smallest data flow that matches the domain decisions:

- It preserves Plan Builder resume because the draft travels with the one current Plan Builder record.
- It avoids showing drafts in the Training Plans list or routing to them as if they were followable plans.
- It makes stale output explicit when upstream Plan Builder choices change.
- It lets the Generate Step use the same React Query cache and optimistic command pattern as the rest of the Plan Builder.
- It keeps `saveGeneratedTrainingPlan` semantics intact: only Accept Draft creates a real active Training Plan and deactivates previous active plans.

## Recommended Shape

Add an unindexed draft field to `PlanBlueprint`:

```ts
type PlanBlueprint = {
  // existing fields...
  trainingPlanDraft: TrainingPlanDraft | null;
};

type TrainingPlanDraft = {
  createdAt: string;
  id: string;
  sourceBlueprintId: string;
  sourceBlueprintUpdatedAt: string;
  status: "fresh" | "stale_builder_output";
  updatedAt: string;
  validation: TrainingPlanDraftValidation;
  plan: TrainingPlanDraftPlan;
};
```

`TrainingPlanDraftPlan` should be a final-plan-compatible shape without `TrainingPlan` lifecycle identity:

- Include final plan data the Generate Step edits: split label, training frequency, rep range style, weekly rep targets, rotation pools, workout templates, starting load suggestions, baseline bodyweight.
- Exclude `TrainingPlan.id`, `active`, `generatedAt`, and `updatedAt`; those are created only on Accept Draft.
- Add `WorkoutTemplatePurpose` to both draft templates and accepted `WorkoutTemplate`s, defaulting existing generated templates to `"strength"`.
- Reuse existing `WorkoutTemplate`, `SupersetGroup`, `TrainingPlanSlot`, and `TrainingPrescription` shapes where possible. If custom-focus templates need cardio/conditioning slots, extend the final executable slot model rather than keeping draft-only data that would be lost on acceptance.

## Draft Lifecycle

1. User enters Generate Step.
2. Workflow computes `resolvePlanBlueprintRecommendedDefaults(blueprint)`.
3. If blocking issues exist, show blockers and do not create a draft.
4. If Recommended Defaults are pending, show `Default Generation Confirmation`.
5. Accepting Recommended Defaults persists the resolved `PlanBlueprint`, then creates a fresh `TrainingPlanDraft` from that resolved blueprint instead of creating an Active Training Plan.
6. If the blueprint is already ready, "Generate" creates or reuses a fresh `TrainingPlanDraft`.
7. Draft-local edits update `PlanBlueprint.trainingPlanDraft` through Plan Builder commands.
8. Upstream Plan Builder edits keep the draft but mark it `stale_builder_output`.
9. Reset Draft regenerates `trainingPlanDraft` from the current resolved Plan Builder choices.
10. Accept Draft validates the draft, creates a `TrainingPlan` with a new id and active lifecycle fields, saves it as the Active Training Plan, and clears the draft from the Plan Builder.

## Generator Refactor

Split the current pure generation work out of `generateTrainingPlanFromBlueprint`:

```ts
function createTrainingPlanContentFromBlueprint(blueprint: PlanBlueprint): TrainingPlanContent
```

Then compose it in two places:

- `createTrainingPlanDraftFromBlueprint` creates a Plan Builder draft without `TrainingPlan` identity.
- `generateTrainingPlanFromBlueprint` keeps the existing public behavior for tests, seeds, and any direct active-plan generation path.

This avoids duplicating template assignment, isolation preference application, rotation pool derivation, and prescription generation.

## Command Flow

Extend `PlanBlueprintCommand` with draft commands:

- `createTrainingPlanDraft`
- `resetTrainingPlanDraft`
- `updateDraftWorkoutTemplate`
- `updateDraftWorkoutTemplatePurpose`
- `replaceDraftWorkoutTemplate`
- `addDraftSupersetGroup`
- `updateDraftSupersetGroup`
- `deleteDraftSupersetGroup`
- `moveDraftExerciseSlot`
- `updateDraftExerciseSlot`
- `updateDraftTrainingPrescription`
- `updateDraftStartingLoad`
- `updateDraftBaselineBodyweight`
- `clearTrainingPlanDraftAfterAccept`

The exact command list can be trimmed during implementation, but draft-local writes should use the existing command/projection pattern so optimistic UI and persistence stay consistent.

Every upstream Plan Builder command that changes generation inputs should mark an existing draft stale:

- Training Frequency
- Training Split
- Rep Range Style
- Weekly Rep Targets / Training Volume
- Main Compound Selections
- Main Compound Rotation Pools
- Exercise Selection Preferences
- Main Compound / Rotation / Isolation preferences when they affect generation

Draft-local commands should not mark the draft stale.

## Validation

Add a pure `validateTrainingPlanDraft` function and run it after draft creation, after draft edits, and before Accept Draft.

Validation should return blockers and warnings:

- Block invalid prescriptions, empty required slots, missing exercise ids, avoided/unavailable exercises, duplicate exercises within a Workout Template, and missing required strength coverage when all templates are strength-focused.
- Warn, rather than block, when custom-focus templates intentionally reduce strength coverage.
- Warn when draft-local prescription edits drift from selected Weekly Rep Targets; do not silently recalculate Weekly Rep Targets.
- Allow duplicate exercises across different Workout Templates.
- Require or warn for Baseline Bodyweight when accepted draft includes bodyweight exercises whose load volume needs a known bodyweight.

## Acceptance

Accept Draft should be atomic across `planBlueprints` and `trainingPlans`:

1. Load and normalize the current `PlanBlueprint`.
2. Ensure it has a fresh draft.
3. Validate blockers again.
4. Convert the draft content into a `TrainingPlan` with a new id, `active: true`, `generatedAt`, `updatedAt`, `sourceBlueprintId`, and accepted workout templates.
5. Deactivate previous active Training Plans.
6. Put the accepted Training Plan.
7. Clear `trainingPlanDraft` from the Plan Builder.

The current sequential generation path writes only `trainingPlans`; the draft accept path should use a Dexie transaction over both `planBlueprints` and `trainingPlans` so a committed Training Plan cannot leave a stale accepted draft behind if the second write fails.

## UI Data Flow

- `usePlanBuilderBlueprint` should expose `blueprint.trainingPlanDraft` with the existing summary.
- `GenerateTrainingPlanStep` should render blockers, Recommended Defaults confirmation, draft empty state, stale state, and draft editor from one Plan Builder query.
- Upstream edits from inside Generate Step should call existing Plan Builder mutations and mark the draft stale.
- Draft-local edits should call new Plan Builder draft mutations.
- Accept Draft should invalidate or set both the Plan Builder query and Training Plans queries, then navigate to the accepted Training Plan route.

## Migration And Backfill

- Adding `trainingPlanDraft` as an unindexed field on `PlanBlueprint` does not need a new Dexie store index. Normalize legacy blueprints with `trainingPlanDraft: null`.
- Adding `WorkoutTemplatePurpose` to accepted `WorkoutTemplate`s is unindexed. Normalize legacy persisted plans and generated templates with `purpose: "strength"`.
- Existing `trainingPlans` rows should not be rewritten eagerly. Repository normalizers can provide defaults on read.
- If later implementation chooses a separate `trainingPlanDrafts` table, that would need a Dexie version bump and cleanup policy, but it is not the smallest path for this effort.

## Tests To Change Or Add

- `generate-training-plan-workflow.test.ts`: ready generation creates a draft, not an Active Training Plan route; accepting defaults persists defaults and creates a draft.
- `plan-blueprint-command.test.ts`: draft commands project and persist the same result; upstream commands mark an existing draft stale.
- `plan-builder-service.test.ts`: legacy blueprints normalize `trainingPlanDraft` to null and resume drafts across reloads.
- `training-plan-generation.test.ts`: extracted content generation preserves current generated `TrainingPlan` output.
- `training-plan-repository.test.ts`: accepting a draft deactivates previous active plans and clears the draft atomically.
- `plan-builder-route.test.tsx` and `tests/e2e/plan-builder.spec.ts`: Generate opens draft review; Reset Draft rebuilds stale output; Accept Draft is the only action that creates/navigates to an Active Training Plan.
