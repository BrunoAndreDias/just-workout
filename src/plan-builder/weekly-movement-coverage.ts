import {
  type CompoundCapableMovementPatternId,
  compoundCapableMovementPatterns,
  getExerciseCatalogExercise,
  isCompoundCapableMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";
import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint-types";
import type { TrainingSplitId } from "./training-split";

export type MainCompoundSelection = {
  exerciseId: string;
  movementPattern: CompoundCapableMovementPatternId;
  updatedAt?: string;
};

export type CoverageRuleFamilyId = "full_body" | "push_pull_legs" | "upper_lower";

export type WeeklyMovementCoverageRow = {
  bucket: string;
  isCovered: boolean;
  movementPattern: CompoundCapableMovementPatternId;
  requirement: "recommended" | "required";
};

export type WeeklyMovementCoverage = {
  canConfirmExercises: boolean;
  coverageRuleFamily: CoverageRuleFamilyId;
  coveredRequiredPatternCount: number;
  missingRequiredPatterns: ReadonlyArray<CompoundCapableMovementPatternId>;
  missingRequiredSummary: string | null;
  recommendedPatterns: ReadonlyArray<CompoundCapableMovementPatternId>;
  requiredPatternCount: number;
  rows: ReadonlyArray<WeeklyMovementCoverageRow>;
};

type WeeklyMovementCoverageOptions = {
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type WeeklyMovementCoverageRule = {
  bucketByPattern: Record<CompoundCapableMovementPatternId, string>;
  coverageRuleFamily: CoverageRuleFamilyId;
  recommendedPatterns: ReadonlyArray<CompoundCapableMovementPatternId>;
  requiredPatterns: ReadonlyArray<CompoundCapableMovementPatternId>;
};

const fullBodyRule = {
  bucketByPattern: {
    hip_hamstring_dominant: "Full Body",
    horizontal_pull: "Full Body",
    horizontal_push: "Full Body",
    quad_dominant: "Full Body",
    vertical_pull: "Full Body",
    vertical_push: "Push balance",
  },
  coverageRuleFamily: "full_body",
  recommendedPatterns: ["vertical_push"],
  requiredPatterns: [
    "horizontal_push",
    "horizontal_pull",
    "vertical_pull",
    "quad_dominant",
    "hip_hamstring_dominant",
  ],
} as const satisfies WeeklyMovementCoverageRule;

const upperLowerRule = {
  bucketByPattern: {
    hip_hamstring_dominant: "Lower",
    horizontal_pull: "Upper",
    horizontal_push: "Upper",
    quad_dominant: "Lower",
    vertical_pull: "Upper",
    vertical_push: "Upper",
  },
  coverageRuleFamily: "upper_lower",
  recommendedPatterns: [],
  requiredPatterns: compoundCapableMovementPatterns,
} as const satisfies WeeklyMovementCoverageRule;

const pushPullLegsRule = {
  bucketByPattern: {
    hip_hamstring_dominant: "Legs",
    horizontal_pull: "Pull",
    horizontal_push: "Push",
    quad_dominant: "Legs",
    vertical_pull: "Pull",
    vertical_push: "Push",
  },
  coverageRuleFamily: "push_pull_legs",
  recommendedPatterns: [],
  requiredPatterns: compoundCapableMovementPatterns,
} as const satisfies WeeklyMovementCoverageRule;

export function normalizeMainCompoundSelections(
  mainCompoundSelections: unknown,
): ReadonlyArray<MainCompoundSelection> {
  if (!Array.isArray(mainCompoundSelections)) {
    return [];
  }

  const canonicalSelections = new Map<CompoundCapableMovementPatternId, MainCompoundSelection>();

  for (const selection of mainCompoundSelections) {
    if (!isMainCompoundSelectionCandidate(selection)) {
      continue;
    }

    canonicalSelections.set(selection.movementPattern, {
      exerciseId: selection.exerciseId,
      movementPattern: selection.movementPattern,
      ...(typeof selection.updatedAt === "string" ? { updatedAt: selection.updatedAt } : {}),
    });
  }

  return compoundCapableMovementPatterns.flatMap((movementPattern) => {
    const selection = canonicalSelections.get(movementPattern);

    return selection ? [selection] : [];
  });
}

export function getWeeklyMovementCoverage({
  mainCompoundSelections,
  split,
  trainingFrequencyDaysPerWeek,
}: WeeklyMovementCoverageOptions): WeeklyMovementCoverage {
  const coverageRule = getWeeklyMovementCoverageRule(split, trainingFrequencyDaysPerWeek);
  const coveredPatterns = new Set(
    normalizeMainCompoundSelections(mainCompoundSelections)
      .filter((selection) => doesMainCompoundSelectionCoverMovementPattern(selection))
      .map((selection) => selection.movementPattern),
  );
  const rows = compoundCapableMovementPatterns
    .filter(
      (movementPattern) =>
        coverageRule.requiredPatterns.includes(movementPattern) ||
        coverageRule.recommendedPatterns.includes(movementPattern),
    )
    .map((movementPattern) => ({
      bucket: coverageRule.bucketByPattern[movementPattern],
      isCovered: coveredPatterns.has(movementPattern),
      movementPattern,
      requirement: getMovementPatternRequirement(coverageRule, movementPattern),
    }));
  const missingRequiredPatterns = coverageRule.requiredPatterns.filter(
    (movementPattern) => !coveredPatterns.has(movementPattern),
  );
  const coveredRequiredPatternCount =
    coverageRule.requiredPatterns.length - missingRequiredPatterns.length;

  return {
    canConfirmExercises: missingRequiredPatterns.length === 0,
    coverageRuleFamily: coverageRule.coverageRuleFamily,
    coveredRequiredPatternCount,
    missingRequiredPatterns,
    missingRequiredSummary: getMissingRequiredSummary(
      coverageRule.bucketByPattern,
      missingRequiredPatterns,
    ),
    recommendedPatterns: coverageRule.recommendedPatterns,
    requiredPatternCount: coverageRule.requiredPatterns.length,
    rows,
  };
}

function getWeeklyMovementCoverageRule(
  split: TrainingSplitId,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): WeeklyMovementCoverageRule {
  switch (split) {
    case "full-body-2-day":
      if (trainingFrequencyDaysPerWeek !== 2) {
        throw new Error(
          `Training Split "${split}" is not compatible with ${trainingFrequencyDaysPerWeek} days/week.`,
        );
      }

      return fullBodyRule;
    case "full-body-3-day":
    case "alternating-full-body-a-b":
      if (trainingFrequencyDaysPerWeek !== 3) {
        throw new Error(
          `Training Split "${split}" is not compatible with ${trainingFrequencyDaysPerWeek} days/week.`,
        );
      }

      return fullBodyRule;
    case "upper-lower-full-body":
      if (trainingFrequencyDaysPerWeek !== 3) {
        throw new Error(
          `Training Split "${split}" is not compatible with ${trainingFrequencyDaysPerWeek} days/week.`,
        );
      }

      return upperLowerRule;
    case "upper-lower-4-day":
      if (trainingFrequencyDaysPerWeek !== 4) {
        throw new Error(
          `Training Split "${split}" is not compatible with ${trainingFrequencyDaysPerWeek} days/week.`,
        );
      }

      return upperLowerRule;
    case "rotating-push-pull-legs":
      if (trainingFrequencyDaysPerWeek !== 4 && trainingFrequencyDaysPerWeek !== 5) {
        throw new Error(
          `Training Split "${split}" is not compatible with ${trainingFrequencyDaysPerWeek} days/week.`,
        );
      }

      return pushPullLegsRule;
  }
}

function doesMainCompoundSelectionCoverMovementPattern(selection: MainCompoundSelection): boolean {
  const exercise = getExerciseCatalogExercise(selection.exerciseId);

  return (
    exercise !== undefined &&
    isMainCompoundEligible(exercise) &&
    exercise.movementPattern === selection.movementPattern
  );
}

function getMissingRequiredSummary(
  bucketByPattern: WeeklyMovementCoverageRule["bucketByPattern"],
  missingRequiredPatterns: ReadonlyArray<CompoundCapableMovementPatternId>,
): string | null {
  if (missingRequiredPatterns.length === 0) {
    return null;
  }

  if (missingRequiredPatterns.length === 1) {
    const [movementPattern] = missingRequiredPatterns;

    if (!movementPattern) {
      return null;
    }

    const movementPatternLabel = formatMovementPatternLabel(movementPattern);

    return `${bucketByPattern[movementPattern]} coverage missing: ${movementPatternLabel}.`;
  }

  return `Missing ${missingRequiredPatterns.length} required movement patterns.`;
}

function getMovementPatternRequirement(
  coverageRule: WeeklyMovementCoverageRule,
  movementPattern: CompoundCapableMovementPatternId,
): WeeklyMovementCoverageRow["requirement"] {
  return coverageRule.requiredPatterns.includes(movementPattern) ? "required" : "recommended";
}

export function formatMovementPatternLabel(
  movementPattern: CompoundCapableMovementPatternId,
): string {
  switch (movementPattern) {
    case "horizontal_push":
      return "Horizontal push";
    case "horizontal_pull":
      return "Horizontal pull";
    case "vertical_push":
      return "Vertical push";
    case "vertical_pull":
      return "Vertical pull";
    case "quad_dominant":
      return "Quad dominant";
    case "hip_hamstring_dominant":
      return "Hip/hamstring dominant";
  }
}

function isMainCompoundSelectionCandidate(value: unknown): value is MainCompoundSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MainCompoundSelection>;

  return (
    typeof candidate.exerciseId === "string" &&
    isCompoundCapableMovementPattern(candidate.movementPattern)
  );
}
