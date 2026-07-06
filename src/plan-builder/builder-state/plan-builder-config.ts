const planBuilderSteps = [
  { id: "frequency", label: "Frequency" },
  { id: "rep-ranges", label: "Rep ranges" },
  { id: "volume", label: "Volume" },
  { id: "exercises", label: "Exercises" },
  { id: "generate", label: "Generate" },
];

export type PlanBuilderStep = (typeof planBuilderSteps)[number]["id"];

export const planBuilderBlueprintQueryKey = ["plan-builder", "blueprint"] as const;
