Workout Routine Builder Study: App Guide Based on AWorkoutRoutine

I inspected the main guide and the linked articles across the full sequence: goals, training status, frequency, splits, intensity, volume, exercise selection, movement patterns, exercise order, rest times, progression, diet, and sample routines. The key takeaway for your app is this:

Do not build the app around one “perfect workout.” Build it around a personalization engine that creates, checks, and adjusts a routine based on the user’s goal, experience level, schedule, recovery, equipment, and progression history.

The original guide frames the routine-building process around the user’s body, experience, schedule, preferences, and exact goal, then walks through frequency, split, intensity, volume, exercise selection, progression, diet, and sample routines.

1. App Foundation: The Routine Design System

The main design article breaks program creation into a sequence: define the goal and training level, choose frequency, choose the split, choose intensity, choose volume, choose exercises, and make sure progression and diet support the plan. This should become the core architecture of your app.

Core app concept

Your app should have two main engines:

Workout Generator
Creates a routine from user data.

Workout Validator
Checks whether a routine is well designed: correct frequency, enough rest, good volume, balanced movement patterns, proper rep ranges, realistic progression, and diet support.

A good MVP should not start with “choose exercises.” It should start with:

What is your main goal?
What is your training level?
How many days can you train?
What equipment do you have?
What exercises can you safely perform?
Are you trying to lose fat, build muscle, gain strength, or maintain?
2. Step 1: Goal + Training Status Module

This is the most important onboarding step. Step 1 in the original guide has three supporting topics: how to design a routine, how to define the fitness goal, and how to classify the user as beginner/intermediate/advanced.

2.1 Goal taxonomy

The fitness-goals article groups most goals into two broad categories: appearance goals and performance goals. Appearance goals include building muscle, losing fat, getting leaner, getting toned, gaining/losing weight, and improving body shape. Performance goals include strength, speed, athletic performance, endurance, and physical ability. The article also notes that goals can overlap, but the routine should be optimized around one primary goal.

App implementation

Your app should force the user to choose one primary goal, while allowing secondary goals.

Recommended goal model:

type PrimaryGoal =
  | "build_muscle"
  | "lose_fat"
  | "gain_strength"
  | "improve_performance"
  | "maintain"
  | "general_fitness";

type GoalCategory = "looks" | "performance" | "health";

type UserGoal = {
  primaryGoal: PrimaryGoal;
  category: GoalCategory;
  secondaryGoals: PrimaryGoal[];
  targetBodyWeight?: number;
  targetLift?: {
    exerciseId: string;
    targetWeight: number;
    targetReps: number;
  };
  timelineWeeks?: number;
};
Product rule

The app should display a warning when the user selects conflicting goals, for example:

“You selected fat loss and maximum muscle gain. Your plan will prioritize fat loss while preserving or slowly building muscle.”

This is important because the workout and nutrition logic will change depending on whether the user is in a calorie deficit, maintenance, or surplus.

2.2 Training status classification

The training-status article says a beginner is someone who has trained consistently and intelligently for less than about 6 months, or someone who has trained inconsistently, incorrectly, or returned after a significant layoff. An intermediate has at least several months of consistent, intelligent training, some base strength/muscle, improved work capacity, and good exercise form. Advanced users are much rarer and are closer to their natural potential.

App implementation

Do not ask only: “How long have you trained?”
Ask about consistency and quality.

Recommended questions:

type TrainingHistory = {
  monthsConsistentTraining: number;
  followedStructuredProgram: boolean;
  canPerformMajorLiftsSafely: boolean;
  recentLayoffMonths: number;
  progressionRecently: "steady" | "slow" | "stalled" | "unknown";
};

Recommended classification logic:

function classifyTrainingLevel(history: TrainingHistory) {
  if (
    history.monthsConsistentTraining < 6 ||
    !history.followedStructuredProgram ||
    history.recentLayoffMonths >= 3 ||
    !history.canPerformMajorLiftsSafely
  ) {
    return "beginner";
  }

  if (history.monthsConsistentTraining >= 6 && history.monthsConsistentTraining < 36) {
    return "intermediate";
  }

  return "advanced_candidate";
}

For “advanced_candidate,” the app should ask extra questions before truly assigning advanced status. Most people should be classified as beginner or intermediate.

Product rule

The app should prevent beginners from choosing advanced routines by default. Give them an explanation:

“This routine uses more volume, more exercise variety, and more recovery demands than a beginner needs. A beginner plan will likely produce faster progress.”

3. Step 2: Training Frequency Engine

The guide separates frequency into overall exercise frequency, weight-training frequency, and muscle-group/body-part frequency. It recommends at least one full rest day per week, generally no more than six total exercise sessions per week, and says most people do best with 3–4 weight-training sessions per week. It also warns against weight training more than two consecutive days in a row.

Frequency rules for the app
Global rules
const RecoveryRules = {
  minFullRestDaysPerWeek: 1,
  maxTotalExerciseSessionsPerWeek: 6,
  recommendedWeightTrainingDays: [3, 4],
  maxConsecutiveWeightTrainingDays: 2
};
Muscle frequency rules

The source discusses three main options: once per week, twice per week, and three times per week. Once-per-week training is described as the least effective option for most people, while three-times-per-week training is especially useful for beginners and strength/performance goals. Twice-per-week training is presented as a strong default for most intermediate and advanced trainees.

Recommended app logic:

function chooseMuscleFrequency(level, goal) {
  if (level === "beginner") return 3;

  if (goal === "gain_strength" || goal === "improve_performance") {
    return 2.5; // app can resolve to 2x or 3x depending on split
  }

  if (goal === "build_muscle" || goal === "lose_fat" || goal === "maintain") {
    return 2;
  }

  return 2;
}
App UX

The user should not manually choose “chest day,” “back day,” or “arms day” first. The app should first decide:

How many days can this user train?
How often should each muscle or movement pattern be trained?
Which split fits those constraints?
4. Step 3: Schedule and Split Selector

The schedule article says the split must fit the ideal training frequency, the user’s weekly schedule, and the user’s preferences or needs. It recommends a 3-day full-body split for beginners, a 4-day upper/lower split for many intermediate and advanced users, and other options like 3-day upper/lower, push/pull/legs, and rotating templates depending on schedule flexibility.

Split decision table
User profile	Best default split	App schedule logic
Beginner, any goal	3-day full body	Alternate A/B workouts across 3 non-consecutive days
Beginner, only 2 days available	2-day full body	Keep 2–4 days between sessions when possible
Intermediate/advanced, muscle/looks	4-day upper/lower	Upper A, Lower A, Upper B, Lower B
Intermediate/advanced, muscle/looks, only 3 days	3-day upper/lower	Rotate upper/lower sessions across weeks
Intermediate/advanced, strength/performance	3-day full body or 4-day upper/lower	Prioritize movement practice and recovery
Mid/late intermediate or advanced, muscle gain, 5 days available	Upper/lower/push/pull/legs	Only if recovery is good and user is not in a hard deficit

The 5-day routine article specifically says 3–4 workout days suit most people, but gives an upper/lower/push/pull/legs split for users who can handle 5 days. It is positioned for mid/late intermediate and advanced trainees whose primary goal is muscle gain, not beginners, hard fat-loss phases, pure strength, endurance, or sport-specific training.

App validation rules

The schedule engine should reject or warn against:

const InvalidScheduleWarnings = [
  "Training 5 consecutive days is not recommended for most users.",
  "This split trains each muscle only once per week; consider a higher-frequency split.",
  "This schedule may create poor overlap: chest/shoulders/triceps too close together.",
  "This plan does not include enough full rest days."
];
5. Step 4: Intensity and Rep-Range Engine

The intensity article defines intensity as how heavy the weight is for the user, and connects intensity to rep ranges. It maps lower reps to strength, moderate reps to muscle, and higher reps to endurance. The article recommends 1–8 reps for strength, 5–12 reps for muscle/looks, and 12–20 reps for endurance.

App implementation

Each exercise prescription should contain:

type SetPrescription = {
  sets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
  progressionType: "double_progression" | "load_progression" | "rep_progression";
};
Rep-range defaults
Goal	Compound exercises	Isolation exercises
Strength	3–6 or 4–8	8–12 if included
Muscle/looks	5–10	8–15
Endurance	12–20	12–20
Fat loss with muscle retention	Similar to muscle/strength, but volume may be lower	Moderate

The app should not assume “fat loss workouts” require very high reps. Fat loss should mainly be handled through diet and activity; the weight-training goal during fat loss is usually muscle retention and progression where possible.

6. Step 5: Volume Engine

The volume article defines volume as the amount of work being done and says it can be measured by muscle group, exercise, workout, or week. It argues that total reps per muscle group per workout/week is more useful than simply counting exercises or sets. Too much volume can hurt recovery; too little can fail to provide enough stimulus.

The optimal-volume article gives these broad weekly targets: larger muscle groups such as chest, back, quads, and hamstrings usually get about 60–120 total reps per week, while smaller muscle groups such as shoulders, biceps, triceps, calves, and abs usually get about 30–60 total reps per week. It also says beginners, fat-loss phases, and strength-focused users often belong closer to the low end, while intermediate/advanced muscle-focused users may use the middle or higher end depending on recovery.

App volume model
type MuscleGroup =
  | "chest"
  | "back"
  | "quads"
  | "hamstrings"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "calves"
  | "abs"
  | "glutes";

type MuscleVolumeTarget = {
  muscle: MuscleGroup;
  weeklyMinReps: number;
  weeklyMaxReps: number;
  perSessionTargetReps: number;
};
Volume table for the app
Muscle type	Weekly target	1x/week session	2x/week session	3x/week session
Large muscles	60–120 reps/week	60–120 reps	30–60 reps	20–40 reps
Small muscles	30–60 reps/week	30–60 reps	15–30 reps	10–20 reps

The sets-and-reps article shows that many common prescriptions naturally land around 20–36 reps per exercise, such as 3×8, 4×8, 3×10, 4×6, and similar combinations. That means your app can generate volume by combining exercises until the muscle’s target range is reached.

Volume algorithm
function assignVolume(level, goal, muscleSize, frequency) {
  const weeklyRange =
    muscleSize === "large"
      ? { min: 60, max: 120 }
      : { min: 30, max: 60 };

  let intensityPosition = "middle";

  if (level === "beginner") intensityPosition = "low";
  if (goal === "lose_fat" || goal === "gain_strength") intensityPosition = "low_to_middle";
  if (level !== "beginner" && goal === "build_muscle") intensityPosition = "middle_to_high";

  return divideWeeklyVolumeByFrequency(weeklyRange, frequency, intensityPosition);
}
Important volume warning

The app should count direct and indirect volume.

Example:

Bench press = direct chest volume, indirect triceps and shoulder volume.
Rows = direct back volume, indirect biceps volume.
Shoulder press = direct shoulders, indirect triceps.

The exercise-selection articles repeatedly point out that compound lifts train secondary muscles, which matters for volume, frequency, and recovery.

7. Step 6: Exercise Selection, Organization, and Rest

The exercise-selection article says exercise selection should be based on equipment type, compound vs. isolation exercises, movement pattern, and body part/muscle group. This is exactly how your exercise database should be structured.

Exercise database schema
type Exercise = {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  movementPattern:
    | "horizontal_push"
    | "horizontal_pull"
    | "vertical_push"
    | "vertical_pull"
    | "quad_dominant"
    | "hip_hamstring_dominant"
    | "elbow_flexion"
    | "elbow_extension"
    | "calves"
    | "abs"
    | "accessory";
  equipment:
    | "barbell"
    | "dumbbell"
    | "machine"
    | "cable"
    | "bodyweight"
    | "band";
  exerciseType: "compound" | "isolation";
  difficulty: "beginner" | "intermediate" | "advanced";
  progressionIncrementKg?: number;
  contraindications?: string[];
  substitutions?: string[];
};
Equipment rules

The equipment article says free weights, bodyweight exercises, and machines can all serve a purpose. For performance goals, the app should favor free-weight and bodyweight exercises, with machines used minimally. For appearance goals, all three categories can be used, but free-weight and bodyweight movements are still a strong default, with machines as useful secondary tools.

Compound vs. isolation rules

The compound/isolation article says compound exercises usually provide the most useful overall stimulus, while isolation exercises are useful for targeted volume, smaller muscles, or addressing specific needs. It recommends mostly compounds for performance goals and beginners, with isolation added more often for muscle/appearance-focused intermediate and advanced users.

Recommended app defaults:

function chooseExerciseBias(level, goal) {
  if (level === "beginner") {
    return { compound: 0.85, isolation: 0.15 };
  }

  if (goal === "gain_strength" || goal === "improve_performance") {
    return { compound: 0.8, isolation: 0.2 };
  }

  if (goal === "build_muscle") {
    return { compound: 0.65, isolation: 0.35 };
  }

  return { compound: 0.7, isolation: 0.3 };
}
Movement pattern rules

The movement-pattern article organizes exercises into horizontal push, horizontal pull, vertical push, vertical pull, quad-dominant, hip/hamstring-dominant, elbow flexion, elbow extension, and accessories. It also says opposing movement patterns should be balanced to reduce imbalance and injury risk.

Your app should validate:

const MovementBalanceRules = [
  "horizontal_push_volume ~= horizontal_pull_volume",
  "vertical_push_volume ~= vertical_pull_volume",
  "quad_dominant_volume ~= hip_hamstring_dominant_volume",
  "elbow_flexion_volume ~= elbow_extension_volume"
];
“Best exercise” rule

The “best exercises” article says the best exercise depends on the person, and gives three practical criteria: the user can perform it safely and correctly, it trains the intended target or effect, and the user can progress on it consistently. This should be a major personalization rule in your app.

Recommended app warning:

“This exercise is effective, but not ideal for you because you marked it as painful or difficult to perform correctly. Choose a safer substitute.”

Exercise order rules

The exercise-order article recommends placing more demanding exercises before less demanding ones, bigger muscle groups before smaller ones, compound movements before isolation movements, and free-weight/bodyweight exercises before machine exercises when relevant.

Order algorithm:

function orderExercises(exercises) {
  return exercises.sort((a, b) => {
    return (
      demandScore(b) - demandScore(a) ||
      compoundScore(b) - compoundScore(a) ||
      muscleSizeScore(b) - muscleSizeScore(a)
    );
  });
}
Rest timer rules

The rest-time article recommends shorter rests for endurance/metabolic work, longer rests for heavier strength work, and moderate rests for muscle/appearance goals. It gives broad categories: 20–60 seconds for endurance/metabolic work, 1–3 minutes for muscle/looks, and 2–5 minutes for strength/power.

Recommended app defaults:

Exercise type	Goal	Rest
Heavy compound	Strength	2–5 min
Compound	Muscle/looks	2–3 min
Isolation	Muscle/looks	1–2 min
Endurance/metabolic	Endurance	20–60 sec
8. Step 7: Progression and Diet Support

The progressive-overload article says progressive overload is the key factor that determines whether the user improves. If the user keeps lifting the same weight for the same reps forever, they mostly maintain; to improve, they need to increase the demand over time through weight, reps, sets, difficulty, or similar progression.

Progression engine

The progression article gives a simple model: when the user reaches the prescribed sets and reps with a given weight, increase the weight by the smallest available increment; if they do not reach the target, keep the weight and try to add reps next time.

Recommended app algorithm:

function progressExercise(log, prescription) {
  const allSetsAtOrAboveMin = log.sets.every(set => set.reps >= prescription.minReps);
  const allSetsAtTop = log.sets.every(set => set.reps >= prescription.maxReps);
  const painOrBadForm = log.painReported || log.formRating === "bad";

  if (painOrBadForm) {
    return {
      nextAction: "do_not_increase",
      message: "Keep or reduce load until form is safe and pain-free."
    };
  }

  if (allSetsAtTop) {
    return {
      nextAction: "increase_weight",
      increment: prescription.progressionIncrementKg
    };
  }

  if (allSetsAtOrAboveMin) {
    return {
      nextAction: "try_add_reps",
      message: "Stay at the same weight and try to move closer to the top of the rep range."
    };
  }

  return {
    nextAction: "repeat_or_reduce",
    message: "Repeat this load next time. Consider reducing if performance drops again."
  };
}
Diet module

The diet article says the workout will fail without diet support. It gives practical targets: estimate maintenance calories from bodyweight in pounds multiplied by 14–18, use about a 20% deficit for fat loss, use about a 250-calorie surplus for muscle gain, monitor weekly weight trends, adjust calories by about 250 when progress is too fast or too slow, set protein around 0.8–1.5g per pound of bodyweight, set fats around 20–30% of calories, and use carbs for the remaining calories.

App nutrition logic
type NutritionPlan = {
  maintenanceCalories: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
  weeklyWeightTrend: number;
  adjustmentSuggestion?: "increase_250" | "decrease_250" | "no_change";
};
Diet decision rules
function chooseCalorieTarget(goal, maintenance, sex) {
  if (goal === "lose_fat") return maintenance * 0.8;

  if (goal === "build_muscle") {
    const surplus = sex === "female" ? 125 : 250;
    return maintenance + surplus;
  }

  return maintenance;
}

The app should connect workout and diet. For example:

If the user is losing fat, keep volume more conservative.
If the user is building muscle, allow moderate-to-high volume if recovery is good.
If strength performance is dropping for multiple weeks, check sleep, calories, bodyweight trend, and training volume.
9. Step 8: Sample Routines as App Presets

The sample-routines article says pre-made routines are useful because they reduce the chance of bad program design, but also warns that sample routines cannot be perfect for every person because individual needs, abilities, schedules, and goals differ. This supports the app idea perfectly: use sample routines as starting templates, then personalize them.

Preset 1: Beginner full-body A/B

The beginner workout article recommends a 3-day full-body split for beginners with any goal, using an alternating ABA/BAB format. The article’s sample version uses Workout A with squats, bench press, and rows, and Workout B with deadlifts, pull-ups or lat pulldowns, and overhead shoulder press. It emphasizes basic compound exercises, low volume, balance, frequency, recovery, form, and gradual progression.

App version
const BeginnerFullBodyTemplate = {
  level: "beginner",
  daysPerWeek: 3,
  rotation: ["A", "B", "A", "B", "A", "B"],
  workoutA: [
    "quad_dominant",
    "horizontal_push",
    "horizontal_pull"
  ],
  workoutB: [
    "hip_hamstring_dominant",
    "vertical_pull",
    "vertical_push"
  ],
  notes: [
    "Start light",
    "Prioritize form",
    "Use gradual progression",
    "Avoid unnecessary extra volume"
  ]
};
Preset 2: Intermediate/advanced upper/lower for muscle

The muscle-building routine uses an upper/lower split and gives both 4-day and 3-day versions. The 4-day version trains Upper A, Lower A, Upper B, and Lower B; the source says each muscle is trained around every third or fourth day in the 4-day version. It also says the workouts combine compound exercises with some isolation, balance opposing movement patterns, order exercises from most to least demanding, and use muscle-building rep ranges and rest intervals.

App version
const UpperLowerMuscleTemplate = {
  level: ["intermediate", "advanced"],
  goal: "build_muscle",
  daysPerWeek: 4,
  order: ["upper_a", "lower_a", "rest", "upper_b", "lower_b", "rest", "rest"],
  upperA: [
    "horizontal_push",
    "horizontal_pull",
    "secondary_push",
    "vertical_pull",
    "shoulder_isolation",
    "triceps_isolation",
    "biceps_isolation"
  ],
  lowerA: [
    "hip_hamstring_dominant",
    "quad_dominant",
    "hamstring_isolation",
    "calves",
    "abs"
  ],
  upperB: [
    "vertical_pull",
    "vertical_push",
    "horizontal_pull",
    "horizontal_push",
    "chest_isolation",
    "biceps_isolation",
    "triceps_isolation"
  ],
  lowerB: [
    "quad_dominant",
    "single_leg_quad_dominant",
    "hamstring_isolation",
    "calves",
    "abs"
  ]
};
Preset 3: 5-day upper/lower/push/pull/legs

The 5-day routine article recommends an upper/lower/push/pull/legs hybrid instead of a typical body-part bro split. It avoids five consecutive training days, trains each body part twice per week, and is intended for mid/late intermediate and advanced users focused on muscle growth who can recover from 5 sessions per week.

App version
const FiveDayULPPLTemplate = {
  level: ["intermediate_late", "advanced"],
  goal: "build_muscle",
  daysPerWeek: 5,
  schedule: ["upper", "lower", "rest", "push", "pull", "legs", "rest"],
  restrictions: [
    "not_for_beginners",
    "not_ideal_for_hard_fat_loss",
    "not_default_for_strength_or_sport_specific_goals",
    "requires_good_recovery"
  ]
};
10. Complete Routine Generation Flow

Your generator should follow this sequence:

function generateWorkoutProgram(user) {
  const goal = classifyGoal(user.goal);
  const level = classifyTrainingLevel(user.trainingHistory);

  const muscleFrequency = chooseMuscleFrequency(level, goal.primaryGoal);

  const split = chooseSplit({
    level,
    goal: goal.primaryGoal,
    daysAvailable: user.schedule.daysAvailable,
    preferredDays: user.schedule.preferredDays,
    muscleFrequency
  });

  const volumeTargets = assignWeeklyVolume({
    level,
    goal: goal.primaryGoal,
    muscleFrequency,
    caloriePhase: user.nutrition?.phase
  });

  const repRanges = assignRepRanges({
    goal: goal.primaryGoal,
    level
  });

  const exercises = selectExercises({
    split,
    equipment: user.equipment,
    injuries: user.injuries,
    preferences: user.exercisePreferences,
    volumeTargets,
    repRanges
  });

  const orderedWorkouts = orderWorkoutExercises(exercises);

  const progressionPlan = attachProgressionRules(orderedWorkouts);

  return {
    goal,
    level,
    split,
    volumeTargets,
    workouts: orderedWorkouts,
    progressionPlan
  };
}
11. Routine Validator: “Is This Workout Good?”

Your app can have a powerful feature where users paste or build a routine and the app grades it.

Validation checklist
type RoutineAudit = {
  goalMatched: boolean;
  levelMatched: boolean;
  frequencyScore: number;
  recoveryScore: number;
  volumeScore: number;
  intensityScore: number;
  movementBalanceScore: number;
  exerciseSelectionScore: number;
  progressionScore: number;
  dietSupportScore?: number;
  warnings: string[];
  recommendations: string[];
};
Example warnings
const RoutineWarnings = [
  "This plan trains each muscle only once per week. Most users will do better with about twice per week.",
  "You have 4 pressing movements and only 1 pulling movement. Add more horizontal or vertical pulling.",
  "Your chest volume is high, but your back volume is low. This may create imbalance.",
  "This plan has no clear progression method. Add a rule for increasing reps or load.",
  "This beginner plan uses too much isolation and too much volume.",
  "You are training more than two days in a row. Consider adding a rest day.",
  "Your goal is fat loss, but the nutrition plan does not create a calorie deficit."
];
12. Recommended MVP Screens
1. Onboarding quiz

Collect:

Primary goal
Secondary goals
Training history
Days available
Equipment
Injuries/pain limitations
Exercise preferences
Bodyweight and optional nutrition goal
2. Training-level result

Show:

“You are currently classified as Beginner / Intermediate / Advanced Candidate.”

Explain why, using simple language.

3. Program preview

Show:

Weekly schedule
Split
Muscles trained per day
Volume by muscle
Rep ranges
Rest times
Progression method
4. Workout player

Features:

Exercise order
Set logging
Rest timer
Weight/reps input
Form/pain check
Suggested next weight
5. Progression dashboard

Show:

Exercises progressing
Exercises stalled
Weekly volume
Bodyweight trend
Adherence
Recovery warnings
6. Nutrition support

At minimum:

Maintenance estimate
Goal calories
Protein target
Fat target
Carb remainder
Weekly bodyweight adjustment
7. Routine audit tool

Allow users to import or manually create a routine and receive a score.

13. Data Model for the App
type UserProfile = {
  id: string;
  goal: UserGoal;
  trainingHistory: TrainingHistory;
  schedule: {
    daysAvailable: string[];
    maxSessionMinutes?: number;
    preferredTrainingDays?: string[];
  };
  equipment: string[];
  injuries: {
    area: string;
    severity: "mild" | "moderate" | "severe";
    restrictedPatterns: string[];
  }[];
  nutrition?: NutritionPlan;
};

type WorkoutProgram = {
  id: string;
  userId: string;
  level: "beginner" | "intermediate" | "advanced";
  primaryGoal: PrimaryGoal;
  splitType:
    | "full_body"
    | "upper_lower"
    | "push_pull_legs"
    | "upper_lower_push_pull_legs";
  daysPerWeek: number;
  workouts: WorkoutDay[];
  progressionRules: ProgressionRule[];
};

type WorkoutDay = {
  name: string;
  targetMuscles: MuscleGroup[];
  exercises: ProgramExercise[];
};

type ProgramExercise = {
  exerciseId: string;
  order: number;
  sets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
  progressionIncrementKg: number;
};

type WorkoutLog = {
  programId: string;
  workoutDayId: string;
  date: string;
  exercises: {
    exerciseId: string;
    sets: {
      weight: number;
      reps: number;
      rpe?: number;
    }[];
    painReported?: boolean;
    formRating?: "good" | "okay" | "bad";
  }[];
};
14. Important Product and Legal Note

Use the AWorkoutRoutine material as research and inspiration for your app’s logic, but do not copy the articles, exact wording, downloadable routines, branding, or paid-program structure into your app. The site footer marks the content as copyright-protected and “All Rights Reserved.”

Your app should also include a safety disclaimer and should encourage users with injuries, medical conditions, pain, pregnancy, or other special cases to consult a qualified professional before following a generated plan.

15. Final App Principle

The “perfect workout” in your app should be defined like this:

A perfect workout routine =
  correct goal
  + correct training level
  + correct weekly frequency
  + realistic schedule
  + appropriate split
  + correct rep ranges
  + correct volume
  + safe exercise selection
  + balanced movement patterns
  + smart exercise order
  + rest times that match the goal
  + progression tracking
  + diet support
  + ongoing adjustment from user results

That is the guide’s real product insight: a workout is only perfect when it fits the person and keeps adapting as the person progresses.