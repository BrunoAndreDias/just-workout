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
      "M402 174 C429 175 455 181 471 196 L471 264 C459 285 435 294 405 286 C382 280 371 260 372 232 C373 209 384 186 402 174 Z",
      // Chest: right pec, kept inside the sternum, shoulder seam, and lower pec curve.
      "M475 196 C491 181 517 175 544 174 C562 186 573 209 574 232 C575 260 564 280 541 286 C511 294 487 285 475 264 Z",
    ],
  },
  {
    ariaLabel: "Select shoulders",
    id: "shoulders",
    label: bodyMapRegionLabels.shoulders,
    paths: [
      // Shoulders: front left deltoid cap.
      "M344 172 C365 171 388 175 399 182 C391 201 385 217 381 231 C370 242 357 250 346 256 C340 234 340 198 344 172 Z",
      // Shoulders: front right deltoid cap.
      "M602 172 C581 171 558 175 547 182 C555 201 561 217 565 231 C576 242 589 250 600 256 C606 234 606 198 602 172 Z",
      // Shoulders: back left deltoid cap.
      "M850 172 C875 171 897 176 909 183 C902 202 890 220 876 235 C864 243 852 249 840 254 C835 228 839 193 850 172 Z",
      // Shoulders: back right deltoid cap.
      "M1100 172 C1075 171 1053 176 1041 183 C1048 202 1060 220 1074 235 C1086 243 1098 249 1110 254 C1115 228 1111 193 1100 172 Z",
    ],
  },
  {
    ariaLabel: "Select upper arms",
    id: "upperArms",
    label: bodyMapRegionLabels.upperArms,
    paths: [
      // Upper arms: front left upper arm between shoulder cap and elbow seam.
      "M342 253 C358 247 374 237 383 226 C389 264 382 313 363 337 C346 348 329 339 324 319 C328 291 333 268 342 253 Z",
      // Upper arms: front right upper arm between shoulder cap and elbow seam.
      "M604 253 C588 247 572 237 563 226 C557 264 564 313 583 337 C600 348 617 339 622 319 C618 291 613 268 604 253 Z",
      // Upper arms: back left upper arm between rear shoulder and elbow seam.
      "M834 250 C850 246 865 240 878 231 C888 268 882 311 861 336 C844 346 826 337 821 316 C824 288 828 266 834 250 Z",
      // Upper arms: back right upper arm between rear shoulder and elbow seam.
      "M1116 250 C1100 246 1085 240 1072 231 C1062 268 1068 311 1089 336 C1106 346 1124 337 1129 316 C1126 288 1122 266 1116 250 Z",
    ],
  },
  {
    ariaLabel: "Select forearms",
    id: "forearms",
    label: bodyMapRegionLabels.forearms,
    paths: [
      // Forearms: front left forearm, stopped before the wrist and hand.
      "M334 352 C344 371 356 378 365 368 C360 421 344 485 328 525 C317 523 310 510 313 492 C320 440 326 390 334 352 Z",
      // Forearms: front right forearm, stopped before the wrist and hand.
      "M612 352 C602 371 590 378 581 368 C586 421 602 485 618 525 C629 523 636 510 633 492 C626 440 620 390 612 352 Z",
      // Forearms: back left forearm, stopped before the wrist and hand.
      "M832 349 C842 369 853 376 863 366 C857 421 840 486 823 526 C812 523 805 509 808 491 C815 438 823 389 832 349 Z",
      // Forearms: back right forearm, stopped before the wrist and hand.
      "M1118 349 C1108 369 1097 376 1087 366 C1093 421 1110 486 1127 526 C1138 523 1145 509 1142 491 C1135 438 1127 389 1118 349 Z",
    ],
  },
  {
    ariaLabel: "Select core",
    id: "core",
    label: bodyMapRegionLabels.core,
    paths: [
      // Core: abdominal blocks bounded by the lower pecs and hip-line curves.
      "M423 283 C439 296 507 296 523 283 L529 446 C512 465 493 474 473 474 C453 474 434 465 417 446 Z",
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
      "M891 445 C928 446 958 463 976 486 L975 545 C957 565 917 569 895 550 C878 531 878 470 891 445 Z",
      // Glutes: right glute bowl under the back divider and above the hamstrings.
      "M978 486 C996 463 1026 446 1063 445 C1076 470 1076 531 1059 550 C1037 569 997 565 979 545 Z",
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
      "M898 550 C919 568 956 566 975 544 C971 612 957 671 940 718 C929 741 903 738 893 715 C881 658 883 590 898 550 Z",
      // Hamstrings: back right thigh, between glutes and knee divider.
      "M979 544 C998 566 1035 568 1056 550 C1071 590 1073 658 1061 715 C1051 738 1025 741 1014 718 C997 671 983 612 979 544 Z",
    ],
  },
  {
    ariaLabel: "Select calves",
    id: "calves",
    label: bodyMapRegionLabels.calves,
    paths: [
      // Calves: front left lower leg below the knee divider and above the ankle.
      "M385 736 C408 722 433 736 442 782 C440 845 424 916 407 951 C390 913 374 809 385 736 Z",
      // Calves: front right lower leg below the knee divider and above the ankle.
      "M504 782 C513 736 538 722 561 736 C572 809 556 913 539 951 C522 916 506 845 504 782 Z",
      // Calves: back left lower leg below the knee divider and above the ankle.
      "M894 729 C921 711 946 726 952 780 C949 847 929 918 910 956 C890 917 881 807 894 729 Z",
      // Calves: back right lower leg below the knee divider and above the ankle.
      "M1002 780 C1008 726 1033 711 1060 729 C1073 807 1064 917 1044 956 C1025 918 1005 847 1002 780 Z",
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
