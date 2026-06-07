import {
  type ExerciseCatalogExercise,
  getExerciseCatalogExercise,
} from "../plan-builder/exercise-catalog";
import type { MainCompoundRotationPool } from "../plan-builder/main-compound-rotation-pool";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { getTrainingSplit } from "../plan-builder/training-split";
import type { WeeklyRepTarget } from "../plan-builder/training-volume";
import {
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
} from "../plan-builder/weekly-movement-coverage";

export type TrainingPlanSlot = {
  exerciseId: string;
  exerciseName: string;
  kind: "exercise";
  slotLabel: string;
};

export type SupersetGroup = {
  id: string;
  slots: ReadonlyArray<TrainingPlanSlot>;
  title: string;
};

export type WorkoutTemplate = {
  id: string;
  label: string;
  supersetGroups: ReadonlyArray<SupersetGroup>;
};

export type TrainingPlan = {
  active: boolean;
  generatedAt: string;
  id: string;
  mainCompoundRotationPools: ReadonlyArray<MainCompoundRotationPool>;
  repRangeStyle: NonNullable<PlanBlueprint["repRanges"]>;
  sourceBlueprintId: string;
  split: string;
  trainingBlockWeeks: number;
  trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"];
  trainingGoal: PlanBlueprint["trainingGoal"];
  updatedAt: string;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
};

type GenerateTrainingPlanOptions = {
  blueprint: PlanBlueprint;
  id: string;
  timestamp: string;
};

type TemplateDraft = {
  assignedSelections: MainCompoundSelection[];
  bucket: string;
  id: string;
  label: string;
};

export function generateTrainingPlanFromBlueprint({
  blueprint,
  id,
  timestamp,
}: GenerateTrainingPlanOptions): TrainingPlan {
  if (!blueprint.split) {
    throw new Error("Cannot generate a Training Plan without a Training Split.");
  }

  if (!blueprint.repRanges) {
    throw new Error("Cannot generate a Training Plan without a Rep Range Style.");
  }

  if (!blueprint.weeklyRepTargets) {
    throw new Error("Cannot generate a Training Plan without Training Volume.");
  }

  const trainingSplit = getTrainingSplit(blueprint.split);
  const templates = createTemplateDrafts(trainingSplit.schedule);
  const coverage = getWeeklyMovementCoverage({
    mainCompoundSelections: blueprint.mainCompoundSelections,
    split: blueprint.split,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
  });

  for (const selection of blueprint.mainCompoundSelections) {
    const coverageRow = coverage.rows.find(
      (row) => row.movementPattern === selection.movementPattern,
    );
    const matchingTemplates = templates.filter((template) =>
      shouldAssignSelectionToTemplate(template, coverageRow?.bucket),
    );
    const targetTemplates = matchingTemplates.length > 0 ? matchingTemplates : templates;
    const targetTemplate = getLeastAssignedTemplate(targetTemplates);

    targetTemplate?.assignedSelections.push(selection);
  }

  return {
    active: true,
    generatedAt: timestamp,
    id,
    mainCompoundRotationPools: blueprint.mainCompoundRotationPools,
    repRangeStyle: blueprint.repRanges,
    sourceBlueprintId: blueprint.id,
    split: trainingSplit.label,
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    trainingGoal: blueprint.trainingGoal,
    updatedAt: timestamp,
    weeklyRepTargets: blueprint.weeklyRepTargets,
    workoutTemplates: templates.map((template) => ({
      id: template.id,
      label: template.label,
      supersetGroups: createSupersetGroups(template),
    })),
  };
}

function createTemplateDrafts(
  schedule: ReturnType<typeof getTrainingSplit>["schedule"],
): TemplateDraft[] {
  const sessionLabels =
    schedule.kind === "fixed-week"
      ? schedule.week
          .map((day) => day.sessionLabel)
          .filter((sessionLabel) => !/rest/i.test(sessionLabel))
      : schedule.cycle.map((session) => session.sessionLabel);
  const labelCounts = sessionLabels.reduce((counts, sessionLabel) => {
    counts.set(sessionLabel, (counts.get(sessionLabel) ?? 0) + 1);

    return counts;
  }, new Map<string, number>());
  const seenLabels = new Map<string, number>();

  return sessionLabels.map((sessionLabel, index) => {
    const seenCount = seenLabels.get(sessionLabel) ?? 0;
    seenLabels.set(sessionLabel, seenCount + 1);

    return {
      assignedSelections: [],
      bucket: getTemplateBucket(sessionLabel),
      id: `template-${index + 1}`,
      label: getTemplateLabel(sessionLabel, seenCount, labelCounts.get(sessionLabel) ?? 1),
    };
  });
}

function getTemplateBucket(sessionLabel: string): string {
  if (/upper/i.test(sessionLabel)) {
    return "Upper";
  }

  if (/lower/i.test(sessionLabel)) {
    return "Lower";
  }

  if (/push/i.test(sessionLabel)) {
    return "Push";
  }

  if (/pull/i.test(sessionLabel)) {
    return "Pull";
  }

  if (/legs/i.test(sessionLabel)) {
    return "Legs";
  }

  return "Full Body";
}

function getTemplateLabel(sessionLabel: string, seenCount: number, totalCount: number): string {
  if (totalCount === 1 && !/^full body$/i.test(sessionLabel)) {
    return sessionLabel;
  }

  if (/^full body$/i.test(sessionLabel)) {
    return `Full Body ${String.fromCharCode(65 + seenCount)}`;
  }

  return `${sessionLabel} ${String.fromCharCode(65 + seenCount)}`;
}

function shouldAssignSelectionToTemplate(template: TemplateDraft, bucket?: string): boolean {
  if (!bucket) {
    return false;
  }

  if (template.bucket === "Full Body") {
    return true;
  }

  return template.bucket === bucket;
}

function getLeastAssignedTemplate(templates: ReadonlyArray<TemplateDraft>): TemplateDraft | null {
  return (
    [...templates].sort(
      (firstTemplate, secondTemplate) =>
        firstTemplate.assignedSelections.length - secondTemplate.assignedSelections.length,
    )[0] ?? null
  );
}

function createSupersetGroups(template: TemplateDraft): ReadonlyArray<SupersetGroup> {
  const upperPulls = getSelectionsForPatterns(template.assignedSelections, [
    "horizontal_pull",
    "vertical_pull",
  ]);
  const upperPushes = getSelectionsForPatterns(template.assignedSelections, [
    "horizontal_push",
    "vertical_push",
  ]);
  const horizontalPull = getSelectionForPattern(template.assignedSelections, "horizontal_pull");
  const verticalPull = getSelectionForPattern(template.assignedSelections, "vertical_pull");
  const horizontalPush = getSelectionForPattern(template.assignedSelections, "horizontal_push");
  const verticalPush = getSelectionForPattern(template.assignedSelections, "vertical_push");
  const primaryUpperPull = horizontalPull ?? verticalPull;
  const secondaryUpperPull = getAlternateUpperSelection({
    firstSelection: primaryUpperPull,
    secondSelection: verticalPull ?? horizontalPull,
  });
  const primaryUpperPush = horizontalPush ?? verticalPush;
  const secondaryUpperPush = getAlternateUpperSelection({
    firstSelection: primaryUpperPush,
    secondSelection: verticalPush ?? horizontalPush,
  });
  const quadDominant = getSelectionForPattern(template.assignedSelections, "quad_dominant");
  const hipHamstringDominant = getSelectionForPattern(
    template.assignedSelections,
    "hip_hamstring_dominant",
  );
  const groups: SupersetGroup[] = [];

  if (template.bucket === "Lower" || template.bucket === "Legs") {
    groups.push({
      id: `${template.id}-lower-superset-1`,
      slots: [
        quadDominant
          ? createSelectedExerciseSlot(quadDominant)
          : createDefaultExerciseSlot("quad_dominant"),
        createDefaultExerciseSlot("hip_hamstring_secondary"),
        createDefaultExerciseSlot("abs_1"),
      ],
      title: "Lower superset 1",
    });
    groups.push({
      id: `${template.id}-lower-superset-2`,
      slots: [
        hipHamstringDominant
          ? createSelectedExerciseSlot(hipHamstringDominant)
          : createDefaultExerciseSlot("hip_hamstring_dominant"),
        createDefaultExerciseSlot("quad_secondary"),
        createDefaultExerciseSlot("abs_2"),
      ],
      title: "Lower superset 2",
    });
    groups.push(createIsolationGroup(template.id, "Lower isolation", false));

    return groups;
  }

  groups.push({
    id: `${template.id}-upper-superset-1`,
    slots: [
      primaryUpperPull
        ? createSelectedExerciseSlot(primaryUpperPull)
        : createDefaultExerciseSlot("upper_pull_1"),
      primaryUpperPush
        ? createSelectedExerciseSlot(primaryUpperPush)
        : createDefaultExerciseSlot("horizontal_push"),
      createDefaultExerciseSlot("abs_1"),
    ],
    title: "Upper superset 1",
  });

  const hasSecondUpperSuperset = upperPulls[1] || upperPushes[1] || template.bucket === "Full Body";

  if (hasSecondUpperSuperset) {
    groups.push({
      id: `${template.id}-upper-superset-2`,
      slots: [
        secondaryUpperPull
          ? createSelectedExerciseSlot(secondaryUpperPull)
          : createDefaultExerciseSlot("upper_pull_2"),
        secondaryUpperPush
          ? createSelectedExerciseSlot(secondaryUpperPush)
          : createDefaultExerciseSlot("vertical_push"),
        createDefaultExerciseSlot("abs_2"),
      ],
      title: "Upper superset 2",
    });
  }

  if (quadDominant || hipHamstringDominant || template.bucket === "Full Body") {
    groups.push({
      id: `${template.id}-lower-superset`,
      slots: [
        quadDominant
          ? createSelectedExerciseSlot(quadDominant)
          : createDefaultExerciseSlot("quad_dominant"),
        hipHamstringDominant
          ? createSelectedExerciseSlot(hipHamstringDominant)
          : createDefaultExerciseSlot("hip_hamstring_dominant"),
      ],
      title: "Lower superset",
    });
  }

  groups.push(createIsolationGroup(template.id, "Upper isolation", !hasSecondUpperSuperset));

  return groups;
}

function getSelectionsForPatterns(
  selections: ReadonlyArray<MainCompoundSelection>,
  movementPatterns: ReadonlyArray<MainCompoundSelection["movementPattern"]>,
): MainCompoundSelection[] {
  return selections.filter((selection) => movementPatterns.includes(selection.movementPattern));
}

function getSelectionForPattern(
  selections: ReadonlyArray<MainCompoundSelection>,
  movementPattern: MainCompoundSelection["movementPattern"],
): MainCompoundSelection | null {
  return selections.find((selection) => selection.movementPattern === movementPattern) ?? null;
}

function getAlternateUpperSelection({
  firstSelection,
  secondSelection,
}: {
  firstSelection: MainCompoundSelection | null;
  secondSelection: MainCompoundSelection | null;
}): MainCompoundSelection | null {
  if (!secondSelection || secondSelection.exerciseId === firstSelection?.exerciseId) {
    return null;
  }

  return secondSelection;
}

function createSelectedExerciseSlot(selection: MainCompoundSelection): TrainingPlanSlot {
  const exercise = getExerciseCatalogExercise(selection.exerciseId);

  return {
    exerciseId: selection.exerciseId,
    exerciseName: exercise?.name ?? selection.exerciseId,
    kind: "exercise",
    slotLabel: formatMovementSlotLabel(selection.movementPattern),
  };
}

function createDefaultExerciseSlot(slotKey: DefaultExerciseSlotKey): TrainingPlanSlot {
  const defaultExercise = defaultExerciseBySlot[slotKey];

  return {
    exerciseId: defaultExercise.id,
    exerciseName: defaultExercise.name,
    kind: "exercise",
    slotLabel: defaultExercise.slotLabel,
  };
}

function createIsolationGroup(
  templateId: string,
  slotLabel: string,
  includeAbs: boolean = true,
): SupersetGroup {
  const slots =
    slotLabel === "Lower isolation"
      ? [
          createDefaultExerciseSlot("lower_isolation"),
          createDefaultExerciseSlot("lower_isolation_2"),
        ]
      : [
          createDefaultExerciseSlot("upper_isolation_1"),
          createDefaultExerciseSlot("upper_isolation_2"),
        ];

  if (includeAbs) {
    slots.push(createDefaultExerciseSlot("abs_2"));
  }

  return {
    id: `${templateId}-isolation`,
    slots,
    title: "Isolation finisher",
  };
}

type DefaultExerciseSlotKey =
  | "abs_1"
  | "abs_2"
  | "hip_hamstring_dominant"
  | "hip_hamstring_secondary"
  | "horizontal_push"
  | "lower_isolation"
  | "lower_isolation_2"
  | "quad_dominant"
  | "quad_secondary"
  | "upper_isolation_1"
  | "upper_isolation_2"
  | "upper_pull_1"
  | "upper_pull_2"
  | "vertical_push";

const defaultExerciseBySlot = {
  abs_1: createDefaultExercise("cable-crunches", "Cable Crunches", "Abs"),
  abs_2: createDefaultExercise("hanging-leg-raises", "Hanging Leg Raises", "Abs"),
  hip_hamstring_dominant: createDefaultExercise(
    "barbell-or-dumbbell-romanian-deadlifts",
    "Barbell or Dumbbell Romanian Deadlifts",
    "Hip/hamstring dominant",
  ),
  hip_hamstring_secondary: createDefaultExercise(
    "leg-curls",
    "Leg Curls",
    "Hip/hamstring secondary",
  ),
  horizontal_push: createDefaultExercise(
    "flat-barbell-or-dumbbell-bench-press",
    "Flat Barbell or Dumbbell Bench Press",
    "Horizontal push",
  ),
  lower_isolation: createDefaultExercise("leg-extensions", "Leg Extensions", "Lower isolation"),
  lower_isolation_2: createDefaultExercise(
    "standing-calf-raises",
    "Standing Calf Raises",
    "Lower isolation",
  ),
  quad_dominant: createDefaultExercise(
    "barbell-or-dumbbell-squats",
    "Barbell or Dumbbell Squats",
    "Quad dominant",
  ),
  quad_secondary: createDefaultExercise("leg-press", "Leg Press", "Quad secondary"),
  upper_isolation_1: createDefaultExercise(
    "standing-barbell-or-dumbbell-curls",
    "Standing Barbell or Dumbbell Curls",
    "Biceps",
  ),
  upper_isolation_2: createDefaultExercise("cable-press-downs", "Cable Press-Downs", "Triceps"),
  upper_pull_1: createDefaultExercise("pull-ups", "Pull-Ups", "Vertical pull"),
  upper_pull_2: createDefaultExercise(
    "bent-over-barbell-or-dumbbell-rows",
    "Bent Over Barbell or Dumbbell Rows",
    "Horizontal pull",
  ),
  vertical_push: createDefaultExercise(
    "standing-overhead-barbell-or-dumbbell-press",
    "Standing Overhead Barbell or Dumbbell Press",
    "Vertical push",
  ),
} as const satisfies Record<DefaultExerciseSlotKey, DefaultExerciseSlot>;

type DefaultExerciseSlot = Pick<ExerciseCatalogExercise, "id" | "name"> & {
  slotLabel: string;
};

function createDefaultExercise(
  exerciseId: string,
  fallbackName: string,
  slotLabel: string,
): DefaultExerciseSlot {
  const exercise = getExerciseCatalogExercise(exerciseId);

  return {
    id: exercise?.id ?? exerciseId,
    name: exercise?.name ?? fallbackName,
    slotLabel,
  };
}

function formatMovementSlotLabel(
  movementPattern: MainCompoundSelection["movementPattern"],
): string {
  switch (movementPattern) {
    case "hip_hamstring_dominant":
      return "Hip/hamstring dominant";
    case "horizontal_pull":
      return "Horizontal pull";
    case "horizontal_push":
      return "Horizontal push";
    case "quad_dominant":
      return "Quad dominant";
    case "vertical_pull":
      return "Vertical pull";
    case "vertical_push":
      return "Vertical push";
  }
}
