import { cn } from "../../design-system/cn";
import { StepPanel } from "../../design-system/step-screen";
import type { MovementPatternCoverageGroup } from "../exercise-selection-preferences";

type MovementPatternCoverageStatus = "direct" | "indirect";

type MovementPatternCoverageSectionProps = {
  coverageGroups: ReadonlyArray<MovementPatternCoverageGroup>;
};

type MovementPatternCoverageGroupCardProps = {
  group: MovementPatternCoverageGroup;
};

type MovementPatternCoverageStatusBadgeProps = {
  isDirectlyTargeted: boolean;
};

const movementPatternCoverageStatusStyles = {
  direct: "border-[#c7ebdf] bg-[#eff9f3] text-[#0f6d54]",
  indirect: "border-[#e7dcc8] bg-[#f9f3e8] text-[#8a5a2b]",
} as const;

const movementPatternCoverageStatusLabels = {
  direct: "Direct Weekly Rep Target",
  indirect: "Indirect support only",
} as const satisfies Record<MovementPatternCoverageStatus, string>;

export function MovementPatternCoverageSection({
  coverageGroups,
}: MovementPatternCoverageSectionProps) {
  return (
    <StepPanel aria-label="Movement pattern coverage">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="movement-pattern-coverage-title"
          >
            Movement-pattern coverage
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Derived from the current Training Split, strategy, and Weekly Rep Targets. This view
            stays read-only in v1 and does not promise final exercise slots.
          </p>
        </div>
        <span className="rounded-full border border-stone-900/10 bg-[#f4f0e8] px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide text-stone-700">
          Read-only in v1
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {coverageGroups.map((group) => (
          <MovementPatternCoverageGroupCard group={group} key={group.id} />
        ))}
      </div>
    </StepPanel>
  );
}

function MovementPatternCoverageGroupCard({ group }: MovementPatternCoverageGroupCardProps) {
  const titleId = `${group.id}-movement-patterns-title`;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-5"
    >
      <h4 className="text-lg font-black text-stone-950" id={titleId}>
        {group.title}
      </h4>
      <p className="mt-2 text-sm leading-6 text-stone-700">{group.sessionBias}</p>

      <ul aria-label={group.title} className="mt-4 grid gap-3">
        {group.patterns.map((pattern) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-900/10 bg-white px-4 py-3"
            key={pattern.id}
          >
            <span className="text-sm font-bold text-stone-950">{pattern.label}</span>
            <MovementPatternCoverageStatusBadge isDirectlyTargeted={pattern.isDirectlyTargeted} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MovementPatternCoverageStatusBadge({
  isDirectlyTargeted,
}: MovementPatternCoverageStatusBadgeProps) {
  const status = getMovementPatternCoverageStatus(isDirectlyTargeted);

  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide",
        movementPatternCoverageStatusStyles[status],
      )}
    >
      {movementPatternCoverageStatusLabels[status]}
    </span>
  );
}

function getMovementPatternCoverageStatus(
  isDirectlyTargeted: boolean,
): MovementPatternCoverageStatus {
  if (isDirectlyTargeted) {
    return "direct";
  }

  return "indirect";
}
