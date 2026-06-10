import {
  type ExerciseCatalogExercise,
  type ExerciseCatalogMuscleGroupId,
  getExerciseCatalogExercise,
  type MovementPatternId,
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
  movementPattern: MovementPatternId;
  role: "main_compound" | "secondary_compound" | "isolation" | "abs";
  slotLabel: string;
  targetMuscles: ReadonlyArray<ExerciseCatalogMuscleGroupId>;
};

export type SupersetGroup = {
  id: string;
  slots: ReadonlyArray<TrainingPlanSlot>;
  title: string;
  type: "superset" | "isolation" | "abs";
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

type FullBodyFocus = "upper" | "lower";

type TemplateSelections = {
  hipHamstringDominant: MainCompoundSelection | null;
  primaryUpperPull: MainCompoundSelection | null;
  primaryUpperPush: MainCompoundSelection | null;
  quadDominant: MainCompoundSelection | null;
  secondaryUpperPull: MainCompoundSelection | null;
  secondaryUpperPush: MainCompoundSelection | null;
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
      supersetGroups: createSupersetGroups({
        fullBodyFocus: "upper",
        isAlternatingFullBodyAB: blueprint.split === "alternating-full-body-a-b",
        isAllFullBodyPlan: isAllFullBodySplit(blueprint.split),
        template,
      }),
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
  const templateDrafts: TemplateDraft[] = [];
  const templateLabels = new Set<string>();

  for (const sessionLabel of sessionLabels) {
    const seenCount = seenLabels.get(sessionLabel) ?? 0;
    seenLabels.set(sessionLabel, seenCount + 1);
    const label = getTemplateLabel(sessionLabel, seenCount, labelCounts.get(sessionLabel) ?? 1);

    if (templateLabels.has(label)) {
      continue;
    }

    templateLabels.add(label);
    templateDrafts.push({
      assignedSelections: [],
      bucket: getTemplateBucket(sessionLabel),
      id: `template-${templateDrafts.length + 1}`,
      label,
    });
  }

  return templateDrafts;
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
  if (hasExplicitTemplateSuffix(sessionLabel)) {
    return sessionLabel;
  }

  if (totalCount === 1 && !/^full body$/i.test(sessionLabel)) {
    return sessionLabel;
  }

  if (/^full body$/i.test(sessionLabel)) {
    return `Full Body ${String.fromCharCode(65 + seenCount)}`;
  }

  return `${sessionLabel} ${String.fromCharCode(65 + seenCount)}`;
}

function hasExplicitTemplateSuffix(sessionLabel: string): boolean {
  return /\s[A-Z]$/.test(sessionLabel);
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

function isAllFullBodySplit(split: PlanBlueprint["split"]): boolean {
  return (
    split === "alternating-full-body-a-b" ||
    split === "full-body-2-day" ||
    split === "full-body-3-day"
  );
}

function createSupersetGroups({
  fullBodyFocus,
  isAlternatingFullBodyAB,
  isAllFullBodyPlan,
  template,
}: {
  // TODO: expose Full-Body Template Focus as a Plan Builder configuration once the UI supports it.
  fullBodyFocus: FullBodyFocus;
  isAlternatingFullBodyAB: boolean;
  isAllFullBodyPlan: boolean;
  template: TemplateDraft;
}): ReadonlyArray<SupersetGroup> {
  const selections = getTemplateSelections(template.assignedSelections);

  if (template.bucket === "Full Body") {
    return createFullBodySupersetGroups({
      fullBodyFocus,
      isAlternatingFullBodyAB,
      isAllFullBodyPlan,
      selections,
      templateId: template.id,
      templateLabel: template.label,
    });
  }

  if (template.bucket === "Lower" || template.bucket === "Legs") {
    return createLowerSupersetGroups(template.id, selections);
  }

  return createUpperSupersetGroups(template, selections);
}

function getTemplateSelections(
  assignedSelections: ReadonlyArray<MainCompoundSelection>,
): TemplateSelections {
  const horizontalPull = getSelectionForPattern(assignedSelections, "horizontal_pull");
  const verticalPull = getSelectionForPattern(assignedSelections, "vertical_pull");
  const horizontalPush = getSelectionForPattern(assignedSelections, "horizontal_push");
  const verticalPush = getSelectionForPattern(assignedSelections, "vertical_push");
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
  const quadDominant = getSelectionForPattern(assignedSelections, "quad_dominant");
  const hipHamstringDominant = getSelectionForPattern(assignedSelections, "hip_hamstring_dominant");

  return {
    hipHamstringDominant,
    primaryUpperPull,
    primaryUpperPush,
    quadDominant,
    secondaryUpperPull,
    secondaryUpperPush,
  };
}

function createFullBodySupersetGroups({
  fullBodyFocus,
  isAlternatingFullBodyAB,
  isAllFullBodyPlan,
  selections,
  templateId,
  templateLabel,
}: {
  fullBodyFocus: FullBodyFocus;
  isAlternatingFullBodyAB: boolean;
  isAllFullBodyPlan: boolean;
  selections: TemplateSelections;
  templateId: string;
  templateLabel: string;
}): ReadonlyArray<SupersetGroup> {
  if (fullBodyFocus === "lower") {
    // TODO: implement lower-focused Full Body defaults when full-body focus becomes configurable.
  }

  const alternatingFullBodyGroups = isAlternatingFullBodyAB
    ? createAlternatingFullBodySupersetGroups(templateId, templateLabel)
    : null;

  if (alternatingFullBodyGroups) {
    return alternatingFullBodyGroups;
  }

  const groups = [
    createWorkoutBlock({
      id: `${templateId}-full-body-superset-1`,
      slots: [
        createSelectionSlot(selections.primaryUpperPush, "horizontal_push", "main_compound"),
        createSelectionSlot(selections.primaryUpperPull, "upper_pull_1", "secondary_compound"),
        createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
      ],
      title: "Full-body superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-full-body-superset-2`,
      slots: [
        createSelectionSlot(selections.secondaryUpperPull, "upper_pull_2", "main_compound"),
        createSelectionSlot(selections.secondaryUpperPush, "vertical_push", "secondary_compound"),
        createSelectionSlot(
          selections.hipHamstringDominant,
          "hip_hamstring_dominant",
          "main_compound",
        ),
      ],
      title: "Full-body superset 2",
      type: "superset",
    }),
    createFullBodyIsolationGroup(templateId),
  ];

  if (isAllFullBodyPlan) {
    groups.push(createAbsFinisherGroup(templateId));
  }

  return groups;
}

function createAlternatingFullBodySupersetGroups(
  templateId: string,
  templateLabel: string,
): ReadonlyArray<SupersetGroup> | null {
  if (templateLabel === "Full Body A") {
    return [
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-1`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "flat-dumbbell-bench-press",
            exerciseName: "Flat Dumbbell Bench Press",
            role: "main_compound",
            slotLabel: "Horizontal push",
          }),
          createNamedExerciseSlot({
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            role: "secondary_compound",
            slotLabel: "Vertical pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "barbell-or-dumbbell-lunges",
            exerciseName: "Barbell or Dumbbell Lunges",
            role: "main_compound",
            slotLabel: "Quad dominant",
          }),
        ],
        title: "Full-body superset 1",
        type: "superset",
      }),
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-2`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "bent-over-barbell-rows",
            exerciseName: "Bent Over Barbell Rows",
            role: "main_compound",
            slotLabel: "Horizontal pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "standing-overhead-barbell-or-dumbbell-press",
            exerciseName: "Standing Overhead Barbell or Dumbbell Press",
            role: "secondary_compound",
            slotLabel: "Vertical push",
          }),
          createNamedExerciseSlot({
            exerciseId: "barbell-romanian-deadlifts",
            exerciseName: "Barbell Romanian Deadlifts",
            role: "main_compound",
            slotLabel: "Hip/hamstring dominant",
          }),
        ],
        title: "Full-body superset 2",
        type: "superset",
      }),
      createFullBodyIsolationGroup(templateId),
    ];
  }

  if (templateLabel === "Full Body B") {
    return [
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-1`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "flat-barbell-bench-press",
            exerciseName: "Flat Barbell Bench Press",
            role: "main_compound",
            slotLabel: "Horizontal push",
          }),
          createNamedExerciseSlot({
            exerciseId: "bent-over-barbell-rows",
            exerciseName: "Bent Over Barbell Rows",
            role: "secondary_compound",
            slotLabel: "Horizontal pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "barbell-squats",
            exerciseName: "Barbell Squats",
            role: "main_compound",
            slotLabel: "Quad dominant",
          }),
        ],
        title: "Full-body superset 1",
        type: "superset",
      }),
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-2`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            role: "main_compound",
            slotLabel: "Vertical pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "standing-overhead-barbell-press",
            exerciseName: "Standing Overhead Barbell Press",
            role: "secondary_compound",
            slotLabel: "Vertical push",
          }),
          createNamedExerciseSlot({
            exerciseId: "hyperextensions",
            exerciseName: "Hyperextensions",
            role: "main_compound",
            slotLabel: "Hip/hamstring dominant",
          }),
        ],
        title: "Full-body superset 2",
        type: "superset",
      }),
      createFullBodyIsolationGroup(templateId),
    ];
  }

  return null;
}

function createLowerSupersetGroups(
  templateId: string,
  selections: TemplateSelections,
): ReadonlyArray<SupersetGroup> {
  return [
    createWorkoutBlock({
      id: `${templateId}-lower-superset-1`,
      slots: [
        createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
        createDefaultExerciseSlot("hip_hamstring_secondary", "secondary_compound"),
        createDefaultExerciseSlot("abs_1", "abs"),
      ],
      title: "Lower superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-lower-superset-2`,
      slots: [
        createSelectionSlot(
          selections.hipHamstringDominant,
          "hip_hamstring_dominant",
          "main_compound",
        ),
        createDefaultExerciseSlot("quad_secondary", "secondary_compound"),
        createDefaultExerciseSlot("abs_2", "abs"),
      ],
      title: "Lower superset 2",
      type: "superset",
    }),
    createIsolationGroup(templateId, "Lower isolation", false),
  ];
}

function createUpperSupersetGroups(
  template: TemplateDraft,
  selections: TemplateSelections,
): ReadonlyArray<SupersetGroup> {
  const groups = [
    createWorkoutBlock({
      id: `${template.id}-upper-superset-1`,
      slots: [
        createSelectionSlot(selections.primaryUpperPush, "horizontal_push", "main_compound"),
        createSelectionSlot(selections.primaryUpperPull, "upper_pull_1", "secondary_compound"),
        createDefaultExerciseSlot("abs_1", "abs"),
      ],
      title: "Upper superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${template.id}-upper-superset-2`,
      slots: [
        createSelectionSlot(selections.secondaryUpperPull, "upper_pull_2", "main_compound"),
        createSelectionSlot(selections.secondaryUpperPush, "vertical_push", "secondary_compound"),
        createDefaultExerciseSlot("abs_2", "abs"),
      ],
      title: "Upper superset 2",
      type: "superset",
    }),
  ];

  if (selections.quadDominant || selections.hipHamstringDominant) {
    groups.push(
      createWorkoutBlock({
        id: `${template.id}-lower-superset`,
        slots: [
          createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
          createSelectionSlot(
            selections.hipHamstringDominant,
            "hip_hamstring_dominant",
            "main_compound",
          ),
        ],
        title: "Lower superset",
        type: "superset",
      }),
    );
  }

  groups.push(createIsolationGroup(template.id, "Upper isolation", false));

  return groups;
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

function createWorkoutBlock({ id, slots, title, type }: SupersetGroup): SupersetGroup {
  return {
    id,
    slots,
    title,
    type,
  };
}

function createSelectionSlot(
  selection: MainCompoundSelection | null,
  defaultSlotKey: DefaultExerciseSlotKey,
  role: TrainingPlanSlot["role"],
): TrainingPlanSlot {
  return selection
    ? createSelectedExerciseSlot(selection, role)
    : createDefaultExerciseSlot(defaultSlotKey, role);
}

function createSelectedExerciseSlot(
  selection: MainCompoundSelection,
  role: TrainingPlanSlot["role"],
): TrainingPlanSlot {
  const exercise = getExerciseCatalogExercise(selection.exerciseId);

  return {
    exerciseId: selection.exerciseId,
    exerciseName: exercise?.name ?? selection.exerciseId,
    kind: "exercise",
    movementPattern: exercise?.movementPattern ?? selection.movementPattern,
    role,
    slotLabel: formatMovementSlotLabel(selection.movementPattern),
    targetMuscles: exercise?.primaryMuscleGroups ?? [],
  };
}

function createDefaultExerciseSlot(
  slotKey: DefaultExerciseSlotKey,
  role: TrainingPlanSlot["role"],
): TrainingPlanSlot {
  const defaultExercise = defaultExerciseBySlot[slotKey];

  return {
    exerciseId: defaultExercise.id,
    exerciseName: defaultExercise.name,
    kind: "exercise",
    movementPattern: defaultExercise.movementPattern,
    role,
    slotLabel: defaultExercise.slotLabel,
    targetMuscles: defaultExercise.targetMuscles,
  };
}

function createNamedExerciseSlot({
  exerciseId,
  exerciseName,
  role,
  slotLabel,
}: {
  exerciseId: string;
  exerciseName: string;
  role: TrainingPlanSlot["role"];
  slotLabel: string;
}): TrainingPlanSlot {
  const exercise = getExerciseCatalogExercise(exerciseId);

  return {
    exerciseId: exercise?.id ?? exerciseId,
    exerciseName,
    kind: "exercise",
    movementPattern: getFallbackMovementPattern(slotLabel, exercise?.movementPattern),
    role,
    slotLabel,
    targetMuscles: exercise?.primaryMuscleGroups ?? [],
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
          createDefaultExerciseSlot("lower_isolation", "isolation"),
          createDefaultExerciseSlot("lower_isolation_2", "isolation"),
        ]
      : [
          createDefaultExerciseSlot("upper_isolation_1", "isolation"),
          createDefaultExerciseSlot("upper_isolation_2", "isolation"),
        ];

  if (includeAbs) {
    slots.push(createDefaultExerciseSlot("abs_2", "abs"));
  }

  return {
    id: `${templateId}-isolation`,
    slots,
    title: "Isolation finisher",
    type: "isolation",
  };
}

function createFullBodyIsolationGroup(templateId: string): SupersetGroup {
  const slots = [
    createDefaultExerciseSlot("upper_isolation_1", "isolation"),
    createDefaultExerciseSlot("upper_isolation_2", "isolation"),
    createDefaultExerciseSlot("lower_isolation_2", "isolation"),
  ];

  return {
    id: `${templateId}-isolation`,
    slots,
    title: "Isolation finisher",
    type: "isolation",
  };
}

function createAbsFinisherGroup(templateId: string): SupersetGroup {
  return {
    id: `${templateId}-abs-finisher`,
    slots: [createDefaultExerciseSlot("abs_1", "abs"), createDefaultExerciseSlot("abs_2", "abs")],
    title: "Abs finisher",
    type: "abs",
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
    "barbell-romanian-deadlifts",
    "Barbell Romanian Deadlifts",
    "Hip/hamstring dominant",
  ),
  hip_hamstring_secondary: createDefaultExercise(
    "leg-curls",
    "Leg Curls",
    "Hip/hamstring secondary",
  ),
  horizontal_push: createDefaultExercise(
    "flat-barbell-bench-press",
    "Flat Barbell Bench Press",
    "Horizontal push",
  ),
  lower_isolation: createDefaultExercise("leg-extensions", "Leg Extensions", "Lower isolation"),
  lower_isolation_2: createDefaultExercise(
    "standing-calf-raises",
    "Standing Calf Raises",
    "Lower isolation",
  ),
  quad_dominant: createDefaultExercise("barbell-squats", "Barbell Squats", "Quad dominant"),
  quad_secondary: createDefaultExercise("leg-press", "Leg Press", "Quad secondary"),
  upper_isolation_1: createDefaultExercise(
    "standing-barbell-curls",
    "Standing Barbell Curls",
    "Biceps",
  ),
  upper_isolation_2: createDefaultExercise("cable-press-downs", "Cable Press-Downs", "Triceps"),
  upper_pull_1: createDefaultExercise("pull-ups", "Pull-Ups", "Vertical pull"),
  upper_pull_2: createDefaultExercise(
    "bent-over-barbell-rows",
    "Bent Over Barbell Rows",
    "Horizontal pull",
  ),
  vertical_push: createDefaultExercise(
    "standing-overhead-barbell-press",
    "Standing Overhead Barbell Press",
    "Vertical push",
  ),
} as const satisfies Record<DefaultExerciseSlotKey, DefaultExerciseSlot>;

type DefaultExerciseSlot = Pick<ExerciseCatalogExercise, "id" | "name"> & {
  movementPattern: MovementPatternId;
  slotLabel: string;
  targetMuscles: ReadonlyArray<ExerciseCatalogMuscleGroupId>;
};

function createDefaultExercise(
  exerciseId: string,
  fallbackName: string,
  slotLabel: string,
): DefaultExerciseSlot {
  const exercise = getExerciseCatalogExercise(exerciseId);

  return {
    id: exercise?.id ?? exerciseId,
    movementPattern: getFallbackMovementPattern(slotLabel, exercise?.movementPattern),
    name: exercise?.name ?? fallbackName,
    slotLabel,
    targetMuscles: exercise?.primaryMuscleGroups ?? [],
  };
}

function getFallbackMovementPattern(
  slotLabel: string,
  movementPattern?: MovementPatternId,
): MovementPatternId {
  if (movementPattern) {
    return movementPattern;
  }

  return fallbackMovementPatternBySlotLabel[slotLabel] ?? "horizontal_pull";
}

const fallbackMovementPatternBySlotLabel: Record<string, MovementPatternId> = {
  Abs: "core",
  Biceps: "elbow_flexion",
  "Hip/hamstring dominant": "hip_hamstring_dominant",
  "Hip/hamstring secondary": "hip_hamstring_dominant",
  "Horizontal push": "horizontal_push",
  "Lower isolation": "calves_accessories",
  "Quad dominant": "quad_dominant",
  "Quad secondary": "quad_dominant",
  Triceps: "elbow_extension",
  "Vertical pull": "vertical_pull",
  "Vertical push": "vertical_push",
};

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
