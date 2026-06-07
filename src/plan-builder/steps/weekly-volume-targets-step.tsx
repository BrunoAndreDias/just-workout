import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions } from "../../design-system/step-screen";
import {
  getRepRangeStyleOptionCardClassName,
  getSelectableOptionState,
  RepRangeStyleStatusBadge,
  repRangeStyleDescriptionStyles,
  repRangeStyleDetailStyles,
} from "../components/plan-builder-option-ui";
import type { RepRangeStyle } from "../plan-blueprint";
import { planBuilderPaths } from "../plan-builder-paths";
import {
  type OptionalVolumeMuscleGroupId,
  type VolumePreset,
  type VolumePresetId,
  type VolumePresetSource,
  volumePresets,
  type WeeklyRepTarget,
} from "../training-volume";
import {
  getOptionalWeeklyVolumeTargetRows,
  getRequiredWeeklyVolumeTargetRows,
  type OptionalWeeklyVolumeTargetDisplayRow,
  type WeeklyVolumeTargetDisplayRow,
} from "./weekly-volume-target-rows";
import "./weekly-volume-targets-step.css";

const volumePresetDescriptions = {
  balanced: "Middle of the backed weekly rep range.",
  conservative: "Lower weekly reps for easier recovery.",
  higher_volume: "Higher weekly reps when recovery allows it.",
} as const satisfies Record<VolumePresetId, string>;

type WeeklyVolumeTargetStatusTone = "accessory" | "main-target" | "moderate" | "optional";

type OptionalVolumeTargetToggleHandler = (
  muscleGroup: OptionalVolumeMuscleGroupId,
  isEnabled: boolean,
) => void;

const weeklyVolumeTargetStatusStyles = {
  accessory: "bg-[#f7efe4] text-[#8a5a2b]",
  "main-target": "bg-[#e8f6f3] text-[#0d6d67]",
  moderate: "bg-[#eef3fb] text-[#315d8a]",
  optional: "bg-[#f4f0e8] text-[#5c6d73]",
} as const satisfies Record<WeeklyVolumeTargetStatusTone, string>;

type WeeklyVolumeTargetsStepProps = {
  canContinueToExercises: boolean;
  onContinueToExercises: () => Promise<void>;
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: RepRangeStyle | null;
  selectedVolumePresetId: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};
type VolumePresetSelectorProps = {
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  selectedVolumePresetId: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
};

type VolumePresetOptionRadioProps = {
  isExplicitSelection: boolean;
  isSelected: boolean;
  onSelect: (volumePreset: VolumePresetId) => void;
  option: VolumePreset;
};

type VolumePresetTargetsProps = {
  isSelected: boolean;
  option: VolumePreset;
};

type RequiredWeeklyRepTargetsRowsProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  optionalRows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
  rows: ReadonlyArray<WeeklyVolumeTargetDisplayRow>;
};

type WeeklyVolumeTargetGroupProps = {
  label: string;
  rows: ReadonlyArray<WeeklyVolumeTargetDisplayRow>;
};

type OptionalWeeklyVolumeTargetGroupProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  rows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
};

type WeeklyVolumeTargetStatusBadgeProps = {
  label: string;
  tone: WeeklyVolumeTargetStatusTone;
};

const mainWeeklyTargetMuscleGroups = ["chest", "back", "quads", "hamstrings"] as const;

export function WeeklyVolumeTargetsStep({
  canContinueToExercises,
  onContinueToExercises,
  onOptionalVolumeTargetToggle,
  onVolumePresetChange,
  repRangeStyle,
  selectedVolumePresetId,
  volumePresetSource,
  weeklyRepTargets,
}: WeeklyVolumeTargetsStepProps) {
  const requiredWeeklyVolumeTargetRows = getRequiredWeeklyVolumeTargetRows({
    repRangeStyle,
    weeklyRepTargets,
  });
  const optionalWeeklyVolumeTargetRows = getOptionalWeeklyVolumeTargetRows({
    repRangeStyle,
    weeklyRepTargets,
  });

  return (
    <div className="training-volume-step">
      <div className="min-w-0 space-y-4">
        <section aria-label="Training volume options" className="training-volume-panel">
          <VolumePresetSelector
            onVolumePresetChange={onVolumePresetChange}
            selectedVolumePresetId={selectedVolumePresetId}
            volumePresetSource={volumePresetSource}
          />

          <div className="training-volume-targets-grid">
            <RequiredWeeklyRepTargetsSection
              onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
              optionalRows={optionalWeeklyVolumeTargetRows}
              rows={requiredWeeklyVolumeTargetRows}
            />
          </div>

          <StepActions className="training-volume-actions">
            <Button asChild size="step" variant="outline">
              <Link to={planBuilderPaths.repRanges}>
                <ChevronLeft aria-hidden="true" size={20} />
                Back to Rep ranges
              </Link>
            </Button>
            <Button
              disabled={!canContinueToExercises}
              onClick={() => {
                void onContinueToExercises();
              }}
              size="step"
              type="button"
              variant="builderPrimary"
            >
              Continue to Exercises
              <ArrowRight aria-hidden="true" size={20} />
            </Button>
          </StepActions>
        </section>
      </div>
    </div>
  );
}
function VolumePresetSelector({
  onVolumePresetChange,
  selectedVolumePresetId,
  volumePresetSource,
}: VolumePresetSelectorProps) {
  if (!selectedVolumePresetId || !volumePresetSource) {
    return <p className="mt-5 text-sm font-semibold text-stone-600">Loading volume presets...</p>;
  }

  return (
    <fieldset className="volume-preset-options">
      <legend className="sr-only">Volume preset</legend>
      {volumePresets.map((option) => (
        <VolumePresetOptionRadio
          isExplicitSelection={
            selectedVolumePresetId === option.id && volumePresetSource === "user_selected"
          }
          isSelected={selectedVolumePresetId === option.id}
          key={option.id}
          onSelect={onVolumePresetChange}
          option={option}
        />
      ))}
    </fieldset>
  );
}

function VolumePresetOptionRadio({
  isExplicitSelection,
  isSelected,
  onSelect,
  option,
}: VolumePresetOptionRadioProps) {
  const optionState = getSelectableOptionState(isSelected);

  function selectOption() {
    onSelect(option.id);
  }

  function saveExplicitSelection() {
    if (isSelected && !isExplicitSelection) {
      selectOption();
    }
  }

  return (
    <label
      className={cn(
        "volume-preset-option",
        getRepRangeStyleOptionCardClassName(optionState),
        isSelected ? "volume-preset-option--selected" : null,
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="volume-preset"
        onClick={saveExplicitSelection}
        onChange={selectOption}
        type="radio"
        value={option.id}
      />
      <div className="volume-preset-option__body">
        <div className="min-w-0 flex-1">
          <div className="rep-range-option__header">
            <div className="rep-range-option__title-row">
              <p className="volume-preset-option__title font-black">{option.title}</p>
              {option.isRecommended ? (
                <RepRangeStyleStatusBadge tone="recommended">Recommended</RepRangeStyleStatusBadge>
              ) : null}
            </div>
            {isSelected ? (
              <span className="rep-range-option__selected-check" aria-hidden="true">
                <Check aria-hidden="true" size={14} strokeWidth={3} />
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "volume-preset-option__copy",
              repRangeStyleDescriptionStyles[optionState],
            )}
          >
            {volumePresetDescriptions[option.id]}
          </p>
          <VolumePresetTargets isSelected={isSelected} option={option} />
        </div>
      </div>
    </label>
  );
}

function VolumePresetTargets({ isSelected, option }: VolumePresetTargetsProps) {
  const optionState = getSelectableOptionState(isSelected);
  const styles = repRangeStyleDetailStyles[optionState];

  return (
    <dl className="rep-range-targets">
      <div className="rep-range-target min-w-0">
        <dt className={cn("rep-range-target__label", styles.targetLabelClassName)}>
          Larger muscle groups
        </dt>
        <dd className={cn("rep-range-target__value", styles.targetValueClassName)}>
          {option.largerMuscleTarget} reps/week
        </dd>
      </div>
      <div className="rep-range-target min-w-0">
        <dt className={cn("rep-range-target__label", styles.targetLabelClassName)}>
          Smaller muscle groups
        </dt>
        <dd className={cn("rep-range-target__value", styles.targetValueClassName)}>
          {option.smallerMuscleTarget} reps/week
        </dd>
      </div>
    </dl>
  );
}

function RequiredWeeklyRepTargetsSection({
  onOptionalVolumeTargetToggle,
  optionalRows,
  rows,
}: RequiredWeeklyRepTargetsRowsProps) {
  const mainRows = getRowsForMuscleGroups(rows, mainWeeklyTargetMuscleGroups);
  const supportingRows = rows.filter(
    (row) =>
      !mainWeeklyTargetMuscleGroups.some((muscleGroupId) => muscleGroupId === row.muscleGroupId),
  );

  return (
    <section
      aria-labelledby="weekly-volume-targets-title"
      className="training-volume-target-section training-volume-target-section--required"
    >
      <div className="training-volume-target-section__header">
        <div>
          <h4
            className="text-lg font-black text-stone-950 sm:text-xl"
            id="weekly-volume-targets-title"
          >
            Weekly volume targets
          </h4>
          <p className="training-volume-section-copy">
            These targets guide which exercises and how much work your plan should include.
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="weekly-volume-target-groups">
          <WeeklyVolumeTargetGroup label="Main targets" rows={mainRows} />
          <WeeklyVolumeTargetGroup label="Supporting targets" rows={supportingRows} />
          <OptionalWeeklyVolumeTargetGroup
            onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
            rows={optionalRows}
          />
          <p className="weekly-volume-targets-note">
            Targets are generated from your selected volume style and guide exercise selection in
            the next step.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-stone-600">Loading weekly rep targets...</p>
      )}
    </section>
  );
}

function WeeklyVolumeTargetGroup({ label, rows }: WeeklyVolumeTargetGroupProps) {
  return (
    <section className="weekly-volume-target-group" aria-label={label}>
      <h5>{label}</h5>
      <ul className="weekly-volume-target-list" aria-label={label}>
        {rows.map((row) => (
          <li className="weekly-volume-target-row" key={row.muscleGroupId}>
            <span className="weekly-volume-target-row__muscle">{row.label}</span>
            <span className="weekly-volume-target-row__reps">{row.weeklyRepTargetLabel}</span>
            <span className="weekly-volume-target-row__sets">{row.estimatedSetRangeLabel}</span>
            <WeeklyVolumeTargetStatusBadge label={row.statusLabel} tone={row.statusTone} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OptionalWeeklyVolumeTargetGroup({
  onOptionalVolumeTargetToggle,
  rows,
}: OptionalWeeklyVolumeTargetGroupProps) {
  return (
    <section
      className="weekly-volume-target-group weekly-volume-target-group--optional"
      aria-label="Optional targets"
    >
      <div className="weekly-volume-target-group__header">
        <h5>Optional targets</h5>
        <p>Add direct work for smaller muscle groups if you want them included in the plan.</p>
      </div>
      {rows.length > 0 ? (
        <ul className="weekly-volume-target-list" aria-label="Optional targets">
          {rows.map((row) => (
            <li
              className={cn(
                "weekly-volume-target-row weekly-volume-target-row--optional",
                row.isEnabled ? "weekly-volume-target-row--included" : null,
              )}
              key={row.muscleGroupId}
            >
              <span className="weekly-volume-target-row__muscle">
                <span>{row.label}</span>
                <span className="weekly-volume-target-row__description">
                  {getOptionalVolumeAddonCopy(row.muscleGroupId)}
                </span>
              </span>
              <span className="weekly-volume-target-row__reps">
                {row.isEnabled ? row.weeklyRepTargetLabel : "Not included"}
              </span>
              <span className="weekly-volume-target-row__sets">
                {row.isEnabled ? row.estimatedSetRangeLabel : "Optional direct work"}
              </span>
              <Button
                aria-label={`${row.actionLabel} ${row.label} target`}
                className={cn(
                  "weekly-volume-target-row__action",
                  row.isEnabled
                    ? "weekly-volume-target-row__action--remove"
                    : "weekly-volume-target-row__action--add",
                )}
                onClick={() => onOptionalVolumeTargetToggle(row.muscleGroupId, !row.isEnabled)}
                size="sm"
                type="button"
                variant={row.isEnabled ? "ghost" : "outline"}
              >
                {row.isEnabled ? (
                  <Trash2 aria-hidden="true" size={15} strokeWidth={2.1} />
                ) : (
                  "Add target"
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold text-stone-600">
          Loading optional volume targets...
        </p>
      )}
    </section>
  );
}

function WeeklyVolumeTargetStatusBadge({ label, tone }: WeeklyVolumeTargetStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
        weeklyVolumeTargetStatusStyles[tone],
      )}
    >
      {label}
    </span>
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

function getOptionalVolumeAddonCopy(muscleGroupId: OptionalVolumeMuscleGroupId) {
  if (muscleGroupId === "calves") {
    return "Optional direct lower-leg work";
  }

  return "Optional direct core work";
}
