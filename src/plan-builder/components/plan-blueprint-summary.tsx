import {
  CalendarCheck,
  CalendarDays,
  Clock3,
  Dumbbell,
  Grid2X2,
  List,
  type LucideIcon,
  SlidersHorizontal,
  Target,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../design-system/cn";
import { RailPanelSection } from "../../design-system/rail-panel";
import type { PlanBlueprintSummary } from "../plan-blueprint";
import { type PlanBuilderStep, planBuilderNextStepBodyByStep } from "./plan-builder-config";
import "./plan-blueprint-summary.css";

type PlanBlueprintSummaryRowBase = {
  icon: LucideIcon;
  label: string;
};

type PlanBlueprintSummaryRow = PlanBlueprintSummaryRowBase &
  (
    | {
        getValue: (summary: PlanBlueprintSummary) => ReactNode;
        valuePresentation?: "text";
      }
    | {
        getValue: (summary: PlanBlueprintSummary) => string;
        valuePresentation: "status";
      }
  );

const planBlueprintSummaryNotChosenValue = "Not chosen yet";
const planBlueprintEquipmentStatus = "Not configured yet";

const planBlueprintSummaryRows: ReadonlyArray<PlanBlueprintSummaryRow> = [
  {
    getValue: (summary) => summary.trainingGoal,
    icon: Target,
    label: "Goal",
  },
  {
    getValue: () => "Intermediate",
    icon: UserRound,
    label: "Experience",
  },
  {
    getValue: (summary) => summary.trainingFrequency,
    icon: CalendarDays,
    label: "Frequency",
  },
  {
    getValue: (summary) =>
      summary.split === "Choose a Training Split"
        ? planBlueprintSummaryNotChosenValue
        : summary.split,
    icon: Grid2X2,
    label: "Split",
  },
  {
    getValue: (summary) =>
      summary.repRanges === "Choose Rep ranges" ? (
        <>
          <span>{planBlueprintSummaryNotChosenValue}</span>
          <span className="sr-only">Choose Rep ranges</span>
        </>
      ) : (
        summary.repRanges
      ),
    icon: SlidersHorizontal,
    label: "Rep ranges",
  },
  {
    getValue: (summary) => summary.volumePreset,
    icon: List,
    label: "Volume preset",
  },
  {
    getValue: () => planBlueprintEquipmentStatus,
    icon: Dumbbell,
    label: "Equipment",
    valuePresentation: "status",
  },
  {
    getValue: (summary) => summary.generationStatus,
    icon: Clock3,
    label: "Generation status",
    valuePresentation: "status",
  },
] as const satisfies ReadonlyArray<PlanBlueprintSummaryRow>;

function getPlanBlueprintSummaryRowContent(
  row: PlanBlueprintSummaryRow,
  summary: PlanBlueprintSummary,
) {
  if (row.valuePresentation === "status") {
    const value = row.getValue(summary);

    return {
      status: value,
      value,
    };
  }

  return {
    status: null,
    value: row.getValue(summary),
  };
}
export type PrototypeBlueprintSummaryProps = {
  compact?: boolean;
  summary: PlanBlueprintSummary | null;
};

type PrototypeBlueprintField = {
  isPending: boolean;
  label: string;
  value: ReactNode;
};

type PlanBlueprintHeaderField = {
  isPending: boolean;
  label: string;
  value: string;
};
export function PlanBlueprintHeaderBar({ summary }: { summary: PlanBlueprintSummary | null }) {
  const fields = summary ? getPlanBlueprintHeaderFields(summary) : [];

  return (
    <aside
      aria-label="Plan blueprint summary"
      className="plan-blueprint-header mt-4 flex min-w-0 items-center rounded-lg border border-stone-950/10 bg-white/76 px-4 py-3 shadow-[0_1px_0_rgba(29,26,22,0.04)]"
    >
      <div className="plan-blueprint-header__title flex min-w-0 shrink-0 items-center gap-3 pr-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-stone-950">
          <CalendarCheck aria-hidden="true" size={24} strokeWidth={1.7} />
        </span>
        <h2 className="truncate text-base font-black leading-none text-stone-950">
          Plan blueprint
        </h2>
        <span className="rounded-full bg-[#007780] px-3 py-1 text-xs font-black leading-none text-white">
          Draft
        </span>
      </div>

      {summary ? (
        <dl className="plan-blueprint-header__fields min-w-0 flex-1 items-center">
          {fields.map((field) => (
            <div
              className="plan-blueprint-header__field grid min-w-0 grid-cols-1 content-center gap-1 border-l border-stone-950/18 px-5"
              key={field.label}
            >
              <dt className="text-xs font-black leading-none text-[#007780]">{field.label}</dt>
              <dd
                className={cn(
                  "min-w-0 text-sm font-bold leading-tight",
                  field.isPending ? "text-stone-500" : "text-stone-950",
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="min-w-0 truncate border-l border-stone-950/18 pl-5 text-sm font-bold text-stone-600">
          Loading Plan Blueprint...
        </p>
      )}
    </aside>
  );
}

function getPlanBlueprintHeaderFields(
  summary: PlanBlueprintSummary,
): ReadonlyArray<PlanBlueprintHeaderField> {
  return [
    {
      isPending: false,
      label: "Goal",
      value: summary.trainingGoal,
    },
    {
      isPending: false,
      label: "Frequency",
      value: summary.trainingFrequency,
    },
    {
      isPending: summary.split === "Choose a Training Split",
      label: "Split",
      value: summary.split === "Choose a Training Split" ? "Pending" : summary.split,
    },
    {
      isPending: summary.repRanges === "Choose Rep ranges",
      label: "Rep ranges",
      value: summary.repRanges === "Choose Rep ranges" ? "Pending" : summary.repRanges,
    },
    {
      isPending: summary.volumePreset === planBlueprintSummaryNotChosenValue,
      label: "Volume preset",
      value:
        summary.volumePreset === planBlueprintSummaryNotChosenValue
          ? "Pending"
          : summary.volumePreset,
    },
  ];
}

export function PlanBlueprintRailCard({
  currentStep = "frequency",
  onStepSelect,
  summary,
}: PrototypeBlueprintSummaryProps & {
  currentStep?: PlanBuilderStep;
  onStepSelect?: (stepNumber: number) => void;
}) {
  const currentGroupedStep = getCurrentGroupedPlanBuilderStep(currentStep);
  const railSteps = summary ? getPlanBlueprintProgressSteps(summary, currentGroupedStep) : [];

  return (
    <RailPanelSection className="plan-builder-summary-card rounded-lg border border-stone-950/10 bg-white/60 px-6 py-7">
      <h2 className="text-2xl font-black leading-tight text-[#120f0d]">Plan blueprint</h2>
      {summary ? (
        <>
          <p className="plan-builder-summary-card__step-count">Step {currentGroupedStep} of 4</p>
          <ol className="plan-builder-summary-timeline">
            {railSteps.map((step) => (
              <li
                className={cn(
                  "plan-builder-summary-timeline__item",
                  step.isCurrent ? "plan-builder-summary-timeline__item--current" : null,
                  step.isLocked ? "plan-builder-summary-timeline__item--locked" : null,
                )}
                key={step.number}
              >
                <PlanBlueprintRailStepControl
                  isInteractive={Boolean(onStepSelect && !step.isCurrent && !step.isLocked)}
                  onSelect={() => onStepSelect?.(step.number)}
                  step={step}
                />
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-6 text-sm font-semibold text-[#31505d]">Loading Plan Blueprint...</p>
      )}
    </RailPanelSection>
  );
}

function PlanBlueprintRailStepControl({
  isInteractive,
  onSelect,
  step,
}: {
  isInteractive: boolean;
  onSelect: () => void;
  step: PlanBlueprintProgressStep;
}) {
  const content = (
    <>
      <span className="plan-builder-summary-timeline__marker">{step.number}</span>
      <span className="plan-builder-summary-timeline__copy">
        <span>{step.title}</span>
        <span>{step.body}</span>
      </span>
    </>
  );

  if (isInteractive) {
    return (
      <button
        aria-label={`Go to ${step.title}`}
        className="plan-builder-summary-timeline__control"
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <span className="plan-builder-summary-timeline__control">{content}</span>;
}

export function PlanBlueprintProgressSummary({
  currentStep = "frequency",
  onStepSelect,
  summary,
}: PrototypeBlueprintSummaryProps & {
  currentStep?: PlanBuilderStep;
  onStepSelect?: (stepNumber: number) => void;
}) {
  const currentGroupedStep = getCurrentGroupedPlanBuilderStep(currentStep);
  const progressSteps = summary ? getPlanBlueprintProgressSteps(summary, currentGroupedStep) : [];

  return (
    <aside aria-label="Plan blueprint summary" className="plan-blueprint-progress-summary">
      <div className="plan-blueprint-progress-summary__header">
        <div>
          <h2>Plan blueprint</h2>
          <p>Step {currentGroupedStep} of 4</p>
        </div>
      </div>

      {summary ? (
        <ol className="plan-blueprint-progress-summary__steps">
          {progressSteps.map((step) => (
            <li
              className={cn(
                "plan-blueprint-progress-summary__step",
                step.isCurrent ? "plan-blueprint-progress-summary__step--current" : null,
                step.isLocked ? "plan-blueprint-progress-summary__step--locked" : null,
              )}
              key={step.number}
            >
              <PlanBlueprintProgressStepControl
                isInteractive={Boolean(onStepSelect && !step.isCurrent && !step.isLocked)}
                onSelect={() => onStepSelect?.(step.number)}
                step={step}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="plan-blueprint-progress-summary__loading">Loading Plan Blueprint...</p>
      )}
    </aside>
  );
}

type PlanBlueprintProgressStep = {
  body: string;
  isCurrent?: boolean;
  isLocked?: boolean;
  number: number;
  title: string;
};

function PlanBlueprintProgressStepControl({
  isInteractive,
  onSelect,
  step,
}: {
  isInteractive: boolean;
  onSelect: () => void;
  step: PlanBlueprintProgressStep;
}) {
  const content = (
    <>
      <span className="plan-blueprint-progress-summary__marker">{step.number}</span>
      <span className="plan-blueprint-progress-summary__copy">
        <span>{step.title}</span>
        <span>{step.body}</span>
      </span>
    </>
  );

  if (isInteractive) {
    return (
      <button
        aria-label={`Go to ${step.title}`}
        className="plan-blueprint-progress-summary__step-control"
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <span className="plan-blueprint-progress-summary__step-control">{content}</span>;
}

function getPlanBlueprintProgressSteps(
  summary: PlanBlueprintSummary,
  currentGroupedStep: number,
): ReadonlyArray<{
  body: string;
  isCurrent?: boolean;
  isLocked?: boolean;
  number: number;
  title: string;
}> {
  const scheduleSelection = getTrainingScheduleSelection(summary);
  const trainingStyleSelection = getTrainingStyleSelection(summary);
  const furthestAvailableGroupedStep = getFurthestAvailableGroupedPlanBuilderStep(summary);

  return [
    {
      body: currentGroupedStep === 1 ? "Current" : scheduleSelection,
      isCurrent: currentGroupedStep === 1,
      number: 1,
      title: "Training schedule",
    },
    {
      body:
        currentGroupedStep === 2
          ? "Current"
          : currentGroupedStep > 2 || furthestAvailableGroupedStep >= 2
            ? trainingStyleSelection
            : "Locked",
      isCurrent: currentGroupedStep === 2,
      isLocked: furthestAvailableGroupedStep < 2,
      number: 2,
      title: "Training style",
    },
    {
      body:
        currentGroupedStep === 3
          ? "Current"
          : furthestAvailableGroupedStep >= 3
            ? "Ready"
            : "Locked",
      isCurrent: currentGroupedStep === 3,
      isLocked: furthestAvailableGroupedStep < 3,
      number: 3,
      title: "Exercises",
    },
    {
      body:
        currentGroupedStep === 4
          ? "Current"
          : furthestAvailableGroupedStep >= 4
            ? "Ready"
            : "Locked",
      isCurrent: currentGroupedStep === 4,
      isLocked: furthestAvailableGroupedStep < 4,
      number: 4,
      title: "Review",
    },
  ];
}

function getFurthestAvailableGroupedPlanBuilderStep(summary: PlanBlueprintSummary): number {
  switch (summary.nextStep) {
    case "Rep ranges":
    case "Volume":
      return 2;
    case "Exercises":
      return 3;
    case "Review":
      return 4;
  }

  return 1;
}

function getTrainingScheduleSelection(summary: PlanBlueprintSummary): string {
  const split = summary.split === "Choose a Training Split" ? "Full Body" : summary.split;

  return `${summary.trainingFrequency} · ${split}`;
}

function getTrainingStyleSelection(summary: PlanBlueprintSummary): string {
  const repRanges =
    summary.repRanges === "Choose Rep ranges" ? "Balanced hypertrophy" : summary.repRanges;
  const volumePreset =
    summary.volumePreset === "Not chosen yet" ? "Balanced volume" : summary.volumePreset;

  return `${repRanges} · ${volumePreset}`;
}

function getCurrentGroupedPlanBuilderStep(currentStep: PlanBuilderStep): number {
  switch (currentStep) {
    case "frequency":
      return 1;
    case "rep-ranges":
    case "volume":
      return 2;
    case "exercises":
      return 3;
    case "review":
      return 4;
  }

  return 1;
}

export function PlanBuilderNextStepCard({ currentStep }: { currentStep: PlanBuilderStep }) {
  return (
    <RailPanelSection className="plan-builder-next-card rounded-lg border border-stone-950/10 bg-white/60 px-6 py-7">
      <h2 className="text-2xl font-black leading-tight text-[#120f0d]">What happens next</h2>
      <p className="mt-5 text-base font-medium leading-7 text-[#31505d]">
        {planBuilderNextStepBodyByStep[currentStep as keyof typeof planBuilderNextStepBodyByStep]}
      </p>
    </RailPanelSection>
  );
}
export function PrototypeBlueprintStrip({ summary }: PrototypeBlueprintSummaryProps) {
  return (
    <aside aria-label="Plan blueprint summary" className="mt-4 border-y border-stone-950/10 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
        <PrototypeBlueprintPills summary={summary} />
      </div>
    </aside>
  );
}

export function PrototypeBlueprintPills({ summary }: PrototypeBlueprintSummaryProps) {
  if (!summary) {
    return <p className="text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>;
  }

  return (
    <dl className="flex min-w-0 flex-wrap items-center gap-2">
      {planBlueprintSummaryRows.slice(0, 5).map((row) => {
        const { value } = getPlanBlueprintSummaryRowContent(row, summary);

        return (
          <div
            className="flex min-w-0 items-center gap-2 rounded-full border border-stone-950/10 bg-white/70 px-3 py-1.5"
            key={row.label}
          >
            <dt className="text-[0.7rem] font-black uppercase text-stone-500">{row.label}</dt>
            <dd className="max-w-48 truncate text-xs font-bold text-stone-950">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function PrototypeHeaderBlueprintPanel({ summary }: PrototypeBlueprintSummaryProps) {
  if (!summary) {
    return (
      <div className="border-l border-stone-950/10 pl-5">
        <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
        <p className="mt-2 text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>
      </div>
    );
  }

  const fields = getPrototypeHeaderBlueprintFields(summary);
  const completedCount = fields.filter((field) => !field.isPending).length;

  return (
    <div className="border-l border-stone-950/10 pl-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
          <p className="mt-0.5 text-[0.68rem] font-semibold leading-3 text-[#31505d]">
            {completedCount} of {fields.length} decisions set
          </p>
        </div>
        <span className="rounded-full bg-[#006f78] px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
          Draft
        </span>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {fields.map((field) => (
          <div
            className={cn(
              "flex min-w-0 items-baseline gap-1.5 border-l pl-2",
              field.isPending ? "border-stone-950/10" : "border-[#006f78]/60",
            )}
            key={field.label}
          >
            <dt
              className={cn(
                "shrink-0 text-[0.58rem] font-black uppercase",
                field.isPending ? "text-stone-400" : "text-[#006f78]",
              )}
            >
              {field.label}
            </dt>
            <dd
              className={cn(
                "max-w-28 truncate text-[0.72rem] font-bold leading-3",
                field.isPending ? "text-stone-500" : "text-stone-950",
              )}
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function getPrototypeHeaderBlueprintFields(
  summary: PlanBlueprintSummary,
): ReadonlyArray<PrototypeBlueprintField> {
  return [
    {
      isPending: false,
      label: "Goal",
      value: summary.trainingGoal,
    },
    {
      isPending: false,
      label: "Frequency",
      value: summary.trainingFrequency,
    },
    {
      isPending: summary.split === "Choose a Training Split",
      label: "Split",
      value: summary.split === "Choose a Training Split" ? "Pending" : summary.split,
    },
    {
      isPending: summary.repRanges === "Choose Rep ranges",
      label: "Rep ranges",
      value: summary.repRanges === "Choose Rep ranges" ? "Pending" : summary.repRanges,
    },
  ];
}

export function PrototypeBlueprintRows({
  compact = false,
  summary,
}: PrototypeBlueprintSummaryProps) {
  if (!summary) {
    return <p className="mt-3 text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>;
  }

  return (
    <dl className={cn("mt-4 grid divide-y divide-stone-950/8", compact ? "text-xs" : "text-sm")}>
      {planBlueprintSummaryRows.map((row) => {
        const { status, value } = getPlanBlueprintSummaryRowContent(row, summary);

        return (
          <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 py-2" key={row.label}>
            <row.icon
              aria-hidden="true"
              className="mt-0.5 text-[#006f78]"
              size={14}
              strokeWidth={1.8}
            />
            <div className="min-w-0">
              <dt className="font-black uppercase text-stone-500">{row.label}</dt>
              <dd className="mt-0.5 truncate font-semibold text-stone-950">
                {status ? <span className="text-[#b93725]">{status}</span> : value}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

export function PlanBuilderNextStepMini({ currentStep }: { currentStep: PlanBuilderStep }) {
  return (
    <section className="mt-4 border-t border-stone-950/10 pt-4">
      <h2 className="text-xs font-black uppercase text-stone-500">Next</h2>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#31505d]">
        {planBuilderNextStepBodyByStep[currentStep as keyof typeof planBuilderNextStepBodyByStep]}
      </p>
    </section>
  );
}
