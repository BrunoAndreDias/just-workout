import { Minus, Plus } from "lucide-react";
import { cn } from "../../../design-system/cn";
import type { RepRangeStyle } from "../../plan-blueprint";
import { ChoiceCard, ChoiceCardGroup } from "../../shared-ui/choice-card/choice-card";
import { PlanBuilderStepSection } from "../../shared-ui/step-layout/plan-builder-step-layout";
import {
  type OptionalVolumeMuscleGroupId,
  type VolumePresetId,
  type VolumePresetSource,
  volumePresets,
  type WeeklyRepTarget,
} from "../../training-volume";
import {
  getOptionalWeeklyVolumeTargetRows,
  getRequiredWeeklyVolumeTargetRows,
  type OptionalWeeklyVolumeTargetDisplayRow,
  type WeeklyVolumeTargetDisplayRow,
} from "./weekly-volume-target-rows";
import "./weekly-volume-targets-step.css";

const volumePresetDescriptions = {
  balanced: "A middle-of-the-range amount of weekly work.",
  conservative: "Fewer weekly reps, so recovery is easier.",
  higher_volume: "More weekly reps, if you can recover from them.",
} as const satisfies Record<VolumePresetId, string>;

type OptionalVolumeTargetToggleHandler = (
  muscleGroup: OptionalVolumeMuscleGroupId,
  isEnabled: boolean,
) => void;

type WeeklyVolumeTargetsStepProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: RepRangeStyle | null;
  selectedVolumePresetId: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};

const mainWeeklyTargetMuscleGroups = ["chest", "back", "quads", "hamstrings"] as const;

export function WeeklyVolumeTargetsStep({
  onOptionalVolumeTargetToggle,
  onVolumePresetChange,
  repRangeStyle,
  selectedVolumePresetId,
  volumePresetSource,
  weeklyRepTargets,
}: WeeklyVolumeTargetsStepProps) {
  const rows = getRequiredWeeklyVolumeTargetRows({ repRangeStyle, weeklyRepTargets });
  const optionalRows = getOptionalWeeklyVolumeTargetRows({ repRangeStyle, weeklyRepTargets });
  const mainRows = getRowsForMuscleGroups(rows, mainWeeklyTargetMuscleGroups);
  const supportingRows = rows.filter(
    (row) =>
      !mainWeeklyTargetMuscleGroups.some((muscleGroupId) => muscleGroupId === row.muscleGroupId),
  );

  return (
    <>
      {selectedVolumePresetId && volumePresetSource ? (
        <ChoiceCardGroup legend="Volume preset">
          {volumePresets.map((option) => {
            const isSelected = selectedVolumePresetId === option.id;
            const isExplicitSelection = isSelected && volumePresetSource === "user_selected";

            return (
              <ChoiceCard
                description={volumePresetDescriptions[option.id]}
                facts={[
                  { label: "Larger muscles", value: `${option.largerMuscleTarget} reps/week` },
                  { label: "Smaller muscles", value: `${option.smallerMuscleTarget} reps/week` },
                ]}
                isRecommended={option.isRecommended}
                isSelected={isSelected}
                key={option.id}
                name="volume-preset"
                onClick={() => {
                  // Clicking the shown default saves it as an explicit choice.
                  if (isSelected && !isExplicitSelection) {
                    onVolumePresetChange(option.id);
                  }
                }}
                onSelect={() => onVolumePresetChange(option.id)}
                title={option.title}
                value={option.id}
              />
            );
          })}
        </ChoiceCardGroup>
      ) : (
        <p className="pb-loading">Loading volume presets…</p>
      )}

      <PlanBuilderStepSection
        description="What your plan aims for each week, per muscle. Exercises are picked to hit these."
        title="Weekly volume targets"
      >
        {rows.length > 0 ? (
          <div className="pb-targets">
            <WeeklyVolumeTargetGroup label="Main muscles" rows={mainRows} />
            <WeeklyVolumeTargetGroup label="Supporting muscles" rows={supportingRows} />
            <OptionalWeeklyVolumeTargetGroup
              onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
              rows={optionalRows}
            />
          </div>
        ) : (
          <p className="pb-loading">Loading weekly rep targets…</p>
        )}
      </PlanBuilderStepSection>
    </>
  );
}

function WeeklyVolumeTargetGroup({
  label,
  rows,
}: {
  label: string;
  rows: ReadonlyArray<WeeklyVolumeTargetDisplayRow>;
}) {
  return (
    <section aria-label={label} className="card pb-targets__group">
      <h4 className="pb-targets__group-title">{label}</h4>
      <ul className="pb-targets__list">
        {rows.map((row) => (
          <li className="pb-targets__row" key={row.muscleGroupId}>
            <span className="pb-targets__muscle">{row.label}</span>
            <span className="pb-targets__reps">{row.weeklyRepTargetLabel}</span>
            <span className="pb-targets__sets">{row.estimatedSetRangeLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OptionalWeeklyVolumeTargetGroup({
  onOptionalVolumeTargetToggle,
  rows,
}: {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  rows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section aria-label="Optional targets" className="card pb-targets__group">
      <h4 className="pb-targets__group-title">
        Optional extras
        <span>Add direct work for these if you want it in your plan.</span>
      </h4>
      <ul className="pb-targets__list">
        {rows.map((row) => (
          <li
            className={cn(
              "pb-targets__row pb-targets__row--optional",
              row.isEnabled ? "pb-targets__row--included" : null,
            )}
            key={row.muscleGroupId}
          >
            <span className="pb-targets__muscle">{row.label}</span>
            <span className="pb-targets__reps">
              {row.isEnabled ? row.weeklyRepTargetLabel : "Not included"}
            </span>
            <span className="pb-targets__sets">
              {row.isEnabled ? row.estimatedSetRangeLabel : null}
            </span>
            <button
              aria-label={`${row.actionLabel} ${row.label} target`}
              className="pb-targets__toggle"
              data-included={row.isEnabled ? "true" : undefined}
              onClick={() => onOptionalVolumeTargetToggle(row.muscleGroupId, !row.isEnabled)}
              type="button"
            >
              {row.isEnabled ? (
                <Minus aria-hidden="true" size={15} strokeWidth={2.6} />
              ) : (
                <Plus aria-hidden="true" size={15} strokeWidth={2.6} />
              )}
              {row.actionLabel}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getRowsForMuscleGroups(
  rows: ReadonlyArray<WeeklyVolumeTargetDisplayRow>,
  muscleGroupIds: ReadonlyArray<WeeklyVolumeTargetDisplayRow["muscleGroupId"]>,
): Array<WeeklyVolumeTargetDisplayRow> {
  return muscleGroupIds.flatMap((muscleGroupId) =>
    rows.filter((row) => row.muscleGroupId === muscleGroupId),
  );
}
