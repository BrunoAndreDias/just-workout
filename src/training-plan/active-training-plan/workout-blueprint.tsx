import { ChevronDown, Clock3, Dumbbell, ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { WorkoutTemplate } from "../index";
import {
  getTrainingBlockExerciseSwapAffectedSlotCount,
  getTrainingBlockExerciseSwapChoices,
  type TrainingBlockExerciseSwapSlotLocator,
} from "../training-block";
import type { TrainingPlan } from "../training-plan";
import { TrainingBlockExerciseSwap } from "./training-block-exercise-swap";
import {
  getWorkoutBlueprintReadModel,
  type WorkoutBlueprintExerciseRowReadModel,
  type WorkoutBlueprintSectionReadModel,
} from "./workout-blueprint-read-model";
import "./workout-blueprint.css";

export function WorkoutBlueprint({
  hasCompletedSessionsInCurrentBlock = false,
  onSwapExercise,
  trainingBlockCycleNumber,
  trainingPlan,
  workoutTemplate,
}: {
  hasCompletedSessionsInCurrentBlock?: boolean;
  onSwapExercise?: (
    input: TrainingBlockExerciseSwapSlotLocator & { nextExerciseId: string },
  ) => Promise<TrainingPlan>;
  trainingBlockCycleNumber?: number;
  trainingPlan: TrainingPlan;
  workoutTemplate: WorkoutTemplate;
}) {
  const blueprint = getWorkoutBlueprintReadModel(workoutTemplate);

  return (
    <div className="workout-blueprint">
      <WarmupBlueprintItem />

      {blueprint.supersets.map((section) => (
        <SupersetBlueprintItem
          hasCompletedSessionsInCurrentBlock={hasCompletedSessionsInCurrentBlock}
          key={section.title}
          onSwapExercise={onSwapExercise}
          section={section}
          trainingBlockCycleNumber={trainingBlockCycleNumber}
          trainingPlan={trainingPlan}
        />
      ))}

      <IsolationFinisherBlueprintItem
        hasCompletedSessionsInCurrentBlock={hasCompletedSessionsInCurrentBlock}
        onSwapExercise={onSwapExercise}
        section={blueprint.isolationFinisher}
        trainingBlockCycleNumber={trainingBlockCycleNumber}
        trainingPlan={trainingPlan}
      />
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

function SupersetBlueprintItem({
  hasCompletedSessionsInCurrentBlock,
  onSwapExercise,
  section,
  trainingBlockCycleNumber,
  trainingPlan,
}: {
  hasCompletedSessionsInCurrentBlock: boolean;
  onSwapExercise?: (
    input: TrainingBlockExerciseSwapSlotLocator & { nextExerciseId: string },
  ) => Promise<TrainingPlan>;
  section: WorkoutBlueprintSectionReadModel;
  trainingBlockCycleNumber?: number;
  trainingPlan: TrainingPlan;
}) {
  return (
    <BlueprintTimelineItem
      icon={<Dumbbell aria-hidden="true" />}
      markerTone="main"
      section={
        <WorkoutSection
          defaultExpandedOnMobile={section.defaultExpandedOnMobile}
          rows={section.rows.map((row) => (
            <ExercisePlanRow
              hasCompletedSessionsInCurrentBlock={hasCompletedSessionsInCurrentBlock}
              key={row.key}
              onSwapExercise={onSwapExercise}
              row={row}
              trainingBlockCycleNumber={trainingBlockCycleNumber}
              trainingPlan={trainingPlan}
            />
          ))}
          title={section.title}
        />
      }
    />
  );
}

function IsolationFinisherBlueprintItem({
  hasCompletedSessionsInCurrentBlock,
  onSwapExercise,
  section,
  trainingBlockCycleNumber,
  trainingPlan,
}: {
  hasCompletedSessionsInCurrentBlock: boolean;
  onSwapExercise?: (
    input: TrainingBlockExerciseSwapSlotLocator & { nextExerciseId: string },
  ) => Promise<TrainingPlan>;
  section: WorkoutBlueprintSectionReadModel;
  trainingBlockCycleNumber?: number;
  trainingPlan: TrainingPlan;
}) {
  return (
    <BlueprintTimelineItem
      icon={<ListChecks aria-hidden="true" />}
      markerTone="main"
      section={
        <WorkoutSection
          defaultExpandedOnMobile={section.defaultExpandedOnMobile}
          rows={section.rows.map((row) => (
            <ExercisePlanRow
              hasCompletedSessionsInCurrentBlock={hasCompletedSessionsInCurrentBlock}
              key={row.key}
              onSwapExercise={onSwapExercise}
              row={row}
              trainingBlockCycleNumber={trainingBlockCycleNumber}
              trainingPlan={trainingPlan}
            />
          ))}
          title={section.title}
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

function ExercisePlanRow({
  hasCompletedSessionsInCurrentBlock,
  onSwapExercise,
  row,
  trainingBlockCycleNumber,
  trainingPlan,
}: {
  hasCompletedSessionsInCurrentBlock: boolean;
  onSwapExercise?: (
    input: TrainingBlockExerciseSwapSlotLocator & { nextExerciseId: string },
  ) => Promise<TrainingPlan>;
  row: WorkoutBlueprintExerciseRowReadModel;
  trainingBlockCycleNumber?: number;
  trainingPlan: TrainingPlan;
}) {
  const [isApplyingSwap, setIsApplyingSwap] = useState(false);
  const swapChoices =
    onSwapExercise && trainingPlan.trainingBlock
      ? getTrainingBlockExerciseSwapChoices({
          groupId: row.groupId,
          slotIndex: row.slotIndex,
          templateId: row.templateId,
          trainingPlan,
        })
      : [];
  const affectedSlotCount = getTrainingBlockExerciseSwapAffectedSlotCount();
  const slotLabel = affectedSlotCount === 1 ? "slot" : "slots";
  const trainingBlockLabel = trainingBlockCycleNumber ?? 1;
  const scopeCopy = hasCompletedSessionsInCurrentBlock
    ? `This updates ${affectedSlotCount} future workout ${slotLabel} in Training Block ${trainingBlockLabel}. Completed sessions stay in Training History.`
    : `This updates the next visible session and ${affectedSlotCount} workout ${slotLabel} for the rest of Training Block ${trainingBlockLabel}.`;

  return (
    <article className="exercise-plan-row">
      <div className="exercise-plan-row__identity">
        <div className="exercise-plan-row__name-stack">
          <h3 className="exercise-plan-row__name">{row.exerciseName}</h3>
          <p className="exercise-plan-row__movement">{row.movementPattern}</p>
        </div>
      </div>

      <p className="exercise-plan-row__muscles">{row.targetMuscles}</p>

      <div className="exercise-plan-row__prescription">
        <span>{row.prescription}</span>
        <span className="exercise-plan-row__role-badge">{row.role}</span>
      </div>
      {onSwapExercise && trainingPlan.trainingBlock ? (
        <div className="exercise-plan-row__actions">
          <TrainingBlockExerciseSwap
            actionLabel={`Swap exercise for ${row.exerciseName}`}
            affectedSlotCount={affectedSlotCount}
            choices={swapChoices}
            dialogTitle={`Training Block Exercise Swap for ${row.exerciseName}`}
            isPending={isApplyingSwap}
            movementPattern={row.movementPatternId}
            onApply={async (nextExerciseId) => {
              setIsApplyingSwap(true);

              try {
                await onSwapExercise({
                  groupId: row.groupId,
                  nextExerciseId,
                  slotIndex: row.slotIndex,
                  templateId: row.templateId,
                });
              } finally {
                setIsApplyingSwap(false);
              }
            }}
            role={row.roleId}
            scopeCopy={scopeCopy}
          />
        </div>
      ) : null}
    </article>
  );
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/s+/g, "-");
}
