export const planBuilderSteps = [
  { id: "frequency", label: "Frequency" },
  { id: "rep-ranges", label: "Rep ranges" },
  { id: "volume", label: "Volume" },
  { id: "exercises", label: "Exercises" },
  { id: "generate", label: "Generate" },
];

export type PlanBuilderStep = (typeof planBuilderSteps)[number]["id"];

export const planBuilderBlueprintQueryKey = ["plan-builder", "blueprint"] as const;

export const planBuilderNextStepBodyByStep = {
  frequency: "Next, you'll choose the rep range and volume style for your workout plan.",
  "rep-ranges": "Next, you will set weekly volume targets for each muscle group.",
  volume:
    "Exercises come next; this step stays focused on weekly rep targets before specific lifts are chosen.",
  exercises: "Next, you'll generate the Training Plan from this blueprint.",
  generate: "Generate the Training Plan when everything is ready.",
} as const satisfies Record<PlanBuilderStep, string>;
