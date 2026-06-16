import { ChevronDown, Clock3, Dumbbell, ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { SupersetGroup, TrainingPlanSlot, WorkoutTemplate } from "../index";
import {
  formatExerciseRole,
  formatMovementPattern,
  formatTargetMuscles,
} from "./active-training-plan-read-model";
import "./workout-blueprint.css";

export function WorkoutBlueprint({ workoutTemplate }: { workoutTemplate: WorkoutTemplate }) {
  const supersetGroups = workoutTemplate.supersetGroups.filter(
    (group) => group.type === "superset",
  );
  const isolationGroup =
    workoutTemplate.supersetGroups.find((group) => group.type === "isolation") ?? null;

  return (
    <div className="workout-blueprint">
      <WarmupBlueprintItem />

      {supersetGroups.slice(0, 2).map((group, index) => (
        <SupersetBlueprintItem group={group} index={index} key={group.id} />
      ))}

      <IsolationFinisherBlueprintItem isolationGroup={isolationGroup} />
      <CooldownBlueprintItem />
    </div>
  );
}

function WarmupBlueprintItem() {
  return (
    <BlueprintTimelineItem
      icon={<Clock3 aria-hidden="true" />}
      markerTone="optional"
      section={
        <WorkoutSection
          defaultExpandedOnMobile={false}
          title="Warm-up"
          titleSuffix="(optional)"
          rows={[<OptionalActivityRow key="warm-up" activity="5 min rower + dynamic mobility" />]}
        />
      }
    />
  );
}

function SupersetBlueprintItem({ group, index }: { group: SupersetGroup; index: number }) {
  return (
    <BlueprintTimelineItem
      icon={<Dumbbell aria-hidden="true" />}
      markerTone="main"
      section={
        <WorkoutSection
          defaultExpandedOnMobile={index === 0}
          rows={getExercisePlanRows(group, index === 0 ? "A" : "B").map((row) => (
            <ExercisePlanRow
              key={`${group.id}-${row.exerciseLabel}-${row.slot.exerciseId}`}
              prescription="3 × 8–12"
              slot={row.slot}
            />
          ))}
          title={`Superset ${index + 1}`}
        />
      }
    />
  );
}

function IsolationFinisherBlueprintItem({
  isolationGroup,
}: {
  isolationGroup: SupersetGroup | null;
}) {
  return (
    <BlueprintTimelineItem
      icon={<ListChecks aria-hidden="true" />}
      markerTone="main"
      section={
        <WorkoutSection
          defaultExpandedOnMobile={false}
          rows={getExercisePlanRows(isolationGroup, "C").map((row) => (
            <ExercisePlanRow
              key={`${isolationGroup?.id ?? "isolation"}-${row.exerciseLabel}-${row.slot.exerciseId}`}
              prescription="3 × 8–12"
              slot={row.slot}
            />
          ))}
          title="Isolation Finisher"
        />
      }
    />
  );
}

function CooldownBlueprintItem() {
  return (
    <BlueprintTimelineItem
      icon={<Clock3 aria-hidden="true" />}
      markerTone="optional"
      section={
        <WorkoutSection
          defaultExpandedOnMobile={false}
          title="Cooldown"
          titleSuffix="(optional)"
          rows={[<OptionalActivityRow key="cooldown" activity="2–3 min easy walk + breathing" />]}
        />
      }
    />
  );
}

function BlueprintTimelineItem({
  icon,
  markerTone,
  section,
}: {
  icon: ReactNode;
  markerTone: "main" | "optional";
  section: ReactNode;
}) {
  return (
    <div className="workout-blueprint__item">
      <div className="workout-blueprint__timeline" aria-hidden="true">
        <span className={`workout-blueprint__marker workout-blueprint__marker--${markerTone}`}>
          {icon}
        </span>
      </div>
      {section}
    </div>
  );
}

function WorkoutSection({
  defaultExpandedOnMobile = true,
  rows,
  title,
  titleSuffix,
}: {
  defaultExpandedOnMobile?: boolean;
  rows: ReactNode[];
  title: string;
  titleSuffix?: string;
}) {
  const sectionId = `workout-section-${slugify(title)}`;
  const bodyId = `${sectionId}-body`;
  const [isExpandedOnMobile, setIsExpandedOnMobile] = useState(defaultExpandedOnMobile);

  return (
    <section
      className={`workout-section${isExpandedOnMobile ? "" : " workout-section--collapsed-mobile"}`}
      aria-labelledby={sectionId}
    >
      <header className="workout-section__header">
        <div className="workout-section__copy">
          <h2 className="workout-section__title" id={sectionId}>
            <span>{title}</span>
            {titleSuffix ? (
              <span className="workout-section__title-suffix">{titleSuffix}</span>
            ) : null}
          </h2>
        </div>
        <button
          aria-controls={bodyId}
          aria-expanded={isExpandedOnMobile}
          className="workout-section__toggle"
          onClick={() => setIsExpandedOnMobile((isExpanded) => !isExpanded)}
          type="button"
        >
          <ChevronDown aria-hidden="true" className="workout-section__toggle-icon" />
          <span className="sr-only">
            {isExpandedOnMobile ? "Collapse" : "Expand"} {title}
          </span>
        </button>
      </header>

      <div className="workout-section__body" id={bodyId}>
        <div className="workout-section__rows">{rows}</div>
      </div>
    </section>
  );
}

function OptionalActivityRow({ activity }: { activity: string }) {
  return <p className="optional-activity-row">{activity}</p>;
}

function ExercisePlanRow({ prescription, slot }: { prescription: string; slot: TrainingPlanSlot }) {
  return (
    <article className="exercise-plan-row">
      <div className="exercise-plan-row__identity">
        <div className="exercise-plan-row__name-stack">
          <h3 className="exercise-plan-row__name">{slot.exerciseName}</h3>
          <p className="exercise-plan-row__movement">
            {formatMovementPattern(slot.movementPattern)}
          </p>
        </div>
      </div>

      <p className="exercise-plan-row__muscles">{formatTargetMuscles(slot.targetMuscles)}</p>

      <div className="exercise-plan-row__prescription">
        <span>{prescription}</span>
        <span className="exercise-plan-row__role-badge">{formatExerciseRole(slot.role)}</span>
      </div>
    </article>
  );
}

function getExercisePlanRows(
  group: SupersetGroup | null,
  labelPrefix: "A" | "B" | "C",
): Array<{ exerciseLabel: string; slot: TrainingPlanSlot }> {
  const slots = group?.slots ?? [];

  return slots.map((slot, index) => ({
    exerciseLabel: labelPrefix + (index + 1),
    slot,
  }));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/s+/g, "-");
}
