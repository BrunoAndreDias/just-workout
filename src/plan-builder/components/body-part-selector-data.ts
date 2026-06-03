import {
  type ExerciseCatalogMuscleGroupId,
  exerciseCatalogMuscleGroups,
  type IncludedEquipmentId,
} from "../exercise-selection-preferences";

export type BodyMapRegionId =
  | "calves"
  | "chest"
  | "core"
  | "forearms"
  | "glutes"
  | "hamstrings"
  | "quads"
  | "shoulders"
  | "upperArms"
  | "upperBackLats";

export type BodyMapRegion = {
  ariaLabel: string;
  id: BodyMapRegionId;
  label: string;
  paths: ReadonlyArray<string>;
};

export type BodyPartSelectorExercise = {
  equipment: ReadonlyArray<IncludedEquipmentId>;
  id: string;
  name: string;
  primaryMuscleGroup: BodyMapRegionId;
  secondaryMuscleGroups?: ReadonlyArray<BodyMapRegionId>;
};

const bodyMapRegionOrder = [
  "chest",
  "shoulders",
  "upperArms",
  "forearms",
  "core",
  "upperBackLats",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const satisfies ReadonlyArray<BodyMapRegionId>;

const bodyMapRegionLabels = {
  calves: "Calves",
  chest: "Chest",
  core: "Core",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  quads: "Quads",
  shoulders: "Shoulders",
  upperArms: "Upper arms",
  upperBackLats: "Upper back and lats",
} as const satisfies Record<BodyMapRegionId, string>;

// Coordinates are hand-authored against the approved 1448 x 1086 PNG.
// Tune these path strings when the PNG crop, scale, or illustration changes.
export const bodyMapRegions = [
  {
    ariaLabel: "Select chest",
    id: "chest",
    label: bodyMapRegionLabels.chest,
    paths: [
      // Chest: left pec, kept inside the sternum, shoulder seam, and lower pec curve.
      "M402 213 C429 214 455 220 471 235 L471 303 C459 324 435 333 405 325 C382 319 371 299 372 271 C373 248 384 225 402 213 Z",
      // Chest: right pec, kept inside the sternum, shoulder seam, and lower pec curve.
      "M475 235 C491 220 517 214 544 213 C562 225 573 248 574 271 C575 299 564 319 541 325 C511 333 487 324 475 303 Z",
    ],
  },
  {
    ariaLabel: "Select shoulders",
    id: "shoulders",
    label: bodyMapRegionLabels.shoulders,
    paths: [
      // Shoulders: front left deltoid cap.
      "M344 211 C365 210 388 214 399 221 C391 240 385 256 381 270 C370 281 357 289 346 295 C340 273 340 237 344 211 Z",
      // Shoulders: front right deltoid cap.
      "M602 211 C581 210 558 214 547 221 C555 240 561 256 565 270 C576 281 589 289 600 295 C606 273 606 237 602 211 Z",
      // Shoulders: back left deltoid cap.
      "M850 211 C875 210 897 215 909 222 C902 241 890 259 876 274 C864 282 852 288 840 293 C835 267 839 232 850 211 Z",
      // Shoulders: back right deltoid cap.
      "M1100 211 C1075 210 1053 215 1041 222 C1048 241 1060 259 1074 274 C1086 282 1098 288 1110 293 C1115 267 1111 232 1100 211 Z",
    ],
  },
  {
    ariaLabel: "Select upper arms",
    id: "upperArms",
    label: bodyMapRegionLabels.upperArms,
    paths: [
      // Upper arms: front left upper arm between shoulder cap and elbow seam.
      "M342 300 C358 294 374 284 383 273 C389 311 382 360 363 384 C346 395 329 386 324 366 C328 338 333 315 342 300 Z",
      // Upper arms: front right upper arm between shoulder cap and elbow seam.
      "M604 300 C588 294 572 284 563 273 C557 311 564 360 583 384 C600 395 617 386 622 366 C618 338 613 315 604 300 Z",
      // Upper arms: back left upper arm between rear shoulder and elbow seam.
      "M834 297 C850 293 865 287 878 278 C888 315 882 358 861 383 C844 393 826 384 821 363 C824 335 828 313 834 297 Z",
      // Upper arms: back right upper arm between rear shoulder and elbow seam.
      "M1116 297 C1100 293 1085 287 1072 278 C1062 315 1068 358 1089 383 C1106 393 1124 384 1129 363 C1126 335 1122 313 1116 297 Z",
    ],
  },
  {
    ariaLabel: "Select forearms",
    id: "forearms",
    label: bodyMapRegionLabels.forearms,
    paths: [
      // Forearms: front left forearm, stopped before the wrist and hand.
      "M324 366 C337 386 353 394 363 384 C357 446 337 522 321 577 C307 573 298 555 300 533 C310 470 315 413 324 366 Z",
      // Forearms: front right forearm, stopped before the wrist and hand.
      "M622 366 C609 386 593 394 583 384 C589 446 609 522 625 577 C639 573 648 555 646 533 C636 470 631 413 622 366 Z",
      // Forearms: back left forearm, stopped before the wrist and hand.
      "M821 363 C834 385 850 393 861 383 C855 446 835 526 818 580 C804 575 793 554 795 532 C806 470 812 411 821 363 Z",
      // Forearms: back right forearm, stopped before the wrist and hand.
      "M1129 363 C1116 385 1100 393 1089 383 C1095 446 1115 526 1132 580 C1146 575 1157 554 1155 532 C1144 470 1138 411 1129 363 Z",
    ],
  },
  {
    ariaLabel: "Select core",
    id: "core",
    label: bodyMapRegionLabels.core,
    paths: [
      // Core: abdominal blocks bounded by the lower pecs and hip-line curves.
      "M423 324 C439 337 507 337 523 324 L535 531 C516 553 494 563 473 563 C452 563 430 553 411 531 Z",
    ],
  },
  {
    ariaLabel: "Select upper back and lats",
    id: "upperBackLats",
    label: bodyMapRegionLabels.upperBackLats,
    paths: [
      // Upper back and lats: left back panel inside neck, shoulder, arm, and glute dividers.
      "M976 166 C950 170 930 189 918 220 C913 239 904 259 888 280 C897 324 898 386 898 437 C927 441 956 459 976 484 L976 352 C950 326 921 300 888 280 C901 256 908 231 918 220 C932 190 951 171 976 166 Z",
      // Upper back and lats: right back panel inside neck, shoulder, arm, and glute dividers.
      "M978 166 C1004 170 1024 189 1036 220 C1041 239 1050 259 1066 280 C1057 324 1056 386 1056 437 C1027 441 998 459 978 484 L978 352 C1004 326 1033 300 1066 280 C1053 256 1046 231 1036 220 C1022 190 1003 171 978 166 Z",
    ],
  },
  {
    ariaLabel: "Select glutes",
    id: "glutes",
    label: bodyMapRegionLabels.glutes,
    paths: [
      // Glutes: left glute bowl under the back divider and above the hamstrings.
      "M890 440 C925 442 959 461 976 484 L976 546 C956 572 914 575 893 553 C875 532 875 467 890 440 Z",
      // Glutes: right glute bowl under the back divider and above the hamstrings.
      "M978 484 C995 461 1029 442 1064 440 C1079 467 1079 532 1061 553 C1040 575 998 572 978 546 Z",
    ],
  },
  {
    ariaLabel: "Select quads",
    id: "quads",
    label: bodyMapRegionLabels.quads,
    paths: [
      // Quads: front left thigh, ending at the knee divider.
      "M383 445 C412 459 443 499 464 551 C455 617 443 685 427 732 C416 756 389 759 377 735 C360 670 350 555 369 486 C373 470 378 454 383 445 Z",
      // Quads: front right thigh, ending at the knee divider.
      "M563 445 C534 459 503 499 482 551 C491 617 503 685 519 732 C530 756 557 759 569 735 C586 670 596 555 577 486 C573 470 568 454 563 445 Z",
    ],
  },
  {
    ariaLabel: "Select hamstrings",
    id: "hamstrings",
    label: bodyMapRegionLabels.hamstrings,
    paths: [
      // Hamstrings: back left thigh, between glutes and knee divider.
      "M894 553 C918 575 956 572 976 546 C973 619 958 684 939 733 C927 756 901 752 891 727 C877 667 879 595 894 553 Z",
      // Hamstrings: back right thigh, between glutes and knee divider.
      "M978 546 C998 572 1036 575 1060 553 C1075 595 1077 667 1063 727 C1053 752 1027 756 1015 733 C996 684 981 619 978 546 Z",
    ],
  },
  {
    ariaLabel: "Select calves",
    id: "calves",
    label: bodyMapRegionLabels.calves,
    paths: [
      // Calves: front left lower leg below the knee divider and above the ankle.
      "M383 736 C410 719 438 733 448 781 C447 865 427 946 407 983 C386 936 371 812 383 736 Z",
      // Calves: front right lower leg below the knee divider and above the ankle.
      "M498 781 C508 733 536 719 563 736 C575 812 560 936 539 983 C519 946 499 865 498 781 Z",
      // Calves: back left lower leg below the knee divider and above the ankle.
      "M891 727 C921 707 951 724 958 780 C955 863 932 950 909 987 C885 941 875 808 891 727 Z",
      // Calves: back right lower leg below the knee divider and above the ankle.
      "M996 780 C1003 724 1033 707 1063 727 C1079 808 1069 941 1045 987 C1022 950 999 863 996 780 Z",
    ],
  },
] as const satisfies ReadonlyArray<BodyMapRegion>;

const catalogMuscleGroupToBodyMapRegion = {
  abs: "core",
  back: "upperBackLats",
  biceps: "upperArms",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  glutes: "glutes",
  hamstrings: "hamstrings",
  quadriceps: "quads",
  shoulders: "shoulders",
  triceps: "upperArms",
} as const satisfies Record<ExerciseCatalogMuscleGroupId, BodyMapRegionId>;

const sourceBackedExercises = exerciseCatalogMuscleGroups.flatMap((muscleGroup) => {
  const primaryMuscleGroup = catalogMuscleGroupToBodyMapRegion[muscleGroup.id];

  return muscleGroup.exercises.map((name) =>
    createBodyPartSelectorExercise({
      equipment: inferEquipmentFromExerciseName(name),
      name,
      primaryMuscleGroup,
    }),
  );
});

const supplementalExercises = [
  {
    equipment: ["dumbbells"],
    name: "Farmer's Carries",
    primaryMuscleGroup: "forearms",
    secondaryMuscleGroups: ["core"],
  },
  {
    equipment: ["barbell"],
    name: "Barbell Wrist Curls",
    primaryMuscleGroup: "forearms",
  },
  {
    equipment: ["bodyweight"],
    name: "Planks",
    primaryMuscleGroup: "core",
  },
  {
    equipment: ["cables"],
    name: "Cable Crunches",
    primaryMuscleGroup: "core",
  },
  {
    equipment: ["barbell"],
    name: "Barbell Hip Thrusts",
    primaryMuscleGroup: "glutes",
    secondaryMuscleGroups: ["hamstrings"],
  },
  {
    equipment: ["cables"],
    name: "Cable Glute Kickbacks",
    primaryMuscleGroup: "glutes",
  },
  {
    equipment: ["machines"],
    name: "Standing Calf Raises",
    primaryMuscleGroup: "calves",
  },
  {
    equipment: ["machines"],
    name: "Seated Calf Raises",
    primaryMuscleGroup: "calves",
  },
] as const satisfies ReadonlyArray<
  Omit<BodyPartSelectorExercise, "id"> & {
    primaryMuscleGroup: BodyMapRegionId;
  }
>;

export const bodyPartSelectorExercises = [
  ...sourceBackedExercises,
  ...supplementalExercises.map(createBodyPartSelectorExercise),
] satisfies ReadonlyArray<BodyPartSelectorExercise>;

export function getBodyMapRegionLabel(regionId: BodyMapRegionId): string {
  return bodyMapRegionLabels[regionId];
}

export function getBodyMapRegionOrder(): ReadonlyArray<BodyMapRegionId> {
  return bodyMapRegionOrder;
}

export function getBodyPartExercises(
  exercises: ReadonlyArray<BodyPartSelectorExercise>,
  regionId: BodyMapRegionId,
): ReadonlyArray<BodyPartSelectorExercise> {
  return exercises.filter((exercise) => exercise.primaryMuscleGroup === regionId);
}

function createBodyPartSelectorExercise({
  equipment,
  name,
  primaryMuscleGroup,
  secondaryMuscleGroups,
}: Omit<BodyPartSelectorExercise, "id">): BodyPartSelectorExercise {
  return {
    equipment,
    id: `${primaryMuscleGroup}-${slugifyExerciseName(name)}`,
    name,
    primaryMuscleGroup,
    ...(secondaryMuscleGroups ? { secondaryMuscleGroups } : {}),
  };
}

function inferEquipmentFromExerciseName(name: string): ReadonlyArray<IncludedEquipmentId> {
  const normalizedName = name.toLowerCase();
  const equipment = new Set<IncludedEquipmentId>();

  if (normalizedName.includes("barbell")) {
    equipment.add("barbell");
  }

  if (normalizedName.includes("dumbbell")) {
    equipment.add("dumbbells");
  }

  if (normalizedName.includes("machine")) {
    equipment.add("machines");
  }

  if (normalizedName.includes("cable")) {
    equipment.add("cables");
  }

  if (
    normalizedName.includes("pull-up") ||
    normalizedName.includes("pull up") ||
    normalizedName.includes("chin-up") ||
    normalizedName.includes("chin up")
  ) {
    equipment.add("pull_up_bar");
  }

  if (
    normalizedName.includes("bodyweight") ||
    normalizedName.includes("push-up") ||
    normalizedName.includes("push up") ||
    normalizedName.includes("dips") ||
    normalizedName.includes("inverted rows") ||
    normalizedName.includes("hyperextensions") ||
    normalizedName.includes("glute-ham")
  ) {
    equipment.add("bodyweight");
  }

  return equipment.size > 0 ? [...equipment] : ["bodyweight"];
}

function slugifyExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
