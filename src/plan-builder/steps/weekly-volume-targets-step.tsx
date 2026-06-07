import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
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

const weeklyVolumeTargetColumnHeaderClassName = "px-3 py-2 text-xs font-bold text-stone-500";

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
  rows: ReadonlyArray<WeeklyVolumeTargetDisplayRow>;
};

type OptionalWeeklyRepTargetsSectionProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  rows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
};

type OptionalWeeklyRepTargetsTableProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  rows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
};

type WeeklyVolumeTargetStatusBadgeProps = {
  label: string;
  tone: WeeklyVolumeTargetStatusTone;
};

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
            <RequiredWeeklyRepTargetsSection rows={requiredWeeklyVolumeTargetRows} />
            <OptionalWeeklyRepTargetsSection
              onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
              rows={optionalWeeklyVolumeTargetRows}
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

function RequiredWeeklyRepTargetsSection({ rows }: RequiredWeeklyRepTargetsRowsProps) {
  return (
    <section
      aria-labelledby="required-weekly-rep-targets-title"
      className="training-volume-target-section"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4
            className="text-lg font-black text-stone-950 sm:text-xl"
            id="required-weekly-rep-targets-title"
          >
            Required weekly rep targets
          </h4>
        </div>
      </div>

      {rows.length > 0 ? (
        <RequiredWeeklyRepTargetsTable rows={rows} />
      ) : (
        <p className="mt-3 text-sm font-semibold text-stone-600">Loading weekly rep targets...</p>
      )}
    </section>
  );
}

function OptionalWeeklyRepTargetsSection({
  onOptionalVolumeTargetToggle,
  rows,
}: OptionalWeeklyRepTargetsSectionProps) {
  return (
    <section
      aria-labelledby="optional-volume-targets-title"
      className="training-volume-target-section"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4
            className="text-lg font-black text-stone-950 sm:text-xl"
            id="optional-volume-targets-title"
          >
            Optional volume targets
          </h4>
        </div>
      </div>

      {rows.length > 0 ? (
        <OptionalWeeklyRepTargetsTable
          onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
          rows={rows}
        />
      ) : (
        <p className="mt-3 text-sm font-semibold text-stone-600">
          Loading optional volume targets...
        </p>
      )}
    </section>
  );
}

function RequiredWeeklyRepTargetsTable({ rows }: RequiredWeeklyRepTargetsRowsProps) {
  return (
    <div className="training-volume-table-wrap overflow-x-auto">
      <table
        aria-label="Required Weekly Rep Targets"
        className="min-w-full border-collapse text-left"
      >
        <thead>
          <tr>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Muscle group</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Weekly rep target</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Estimated sets/week</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Status</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Adjustment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-900/10">
          {rows.map((row) => (
            <tr className="align-top" key={row.muscleGroupId}>
              <th className="px-3 py-2.5 text-sm font-semibold text-stone-950" scope="row">
                {row.label}
              </th>
              <td className="px-3 py-2.5 text-sm font-semibold text-stone-900">
                {row.weeklyRepTargetLabel}
              </td>
              <td className="px-3 py-2.5 text-sm font-semibold text-stone-900">
                {row.estimatedSetRangeLabel}
              </td>
              <td className="px-3 py-2.5">
                <WeeklyVolumeTargetStatusBadge label={row.statusLabel} tone={row.statusTone} />
              </td>
              <td className="px-3 py-2.5">
                <Button
                  aria-label={`Adjust ${row.label} target`}
                  className="px-0 text-stone-500 disabled:opacity-100"
                  disabled
                  size="sm"
                  variant="ghost"
                >
                  Adjust
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptionalWeeklyRepTargetsTable({
  onOptionalVolumeTargetToggle,
  rows,
}: OptionalWeeklyRepTargetsTableProps) {
  return (
    <div className="training-volume-table-wrap overflow-x-auto">
      <table aria-label="Optional Volume Targets" className="min-w-full border-collapse text-left">
        <thead>
          <tr>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Muscle group</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Weekly rep target</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Estimated sets/week</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Status</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-900/10">
          {rows.map((row) => (
            <tr className="align-top" key={row.muscleGroupId}>
              <th className="px-3 py-2.5 text-sm font-semibold text-stone-950" scope="row">
                {row.label}
              </th>
              <td className="px-3 py-2.5 text-sm font-semibold text-stone-900">
                {row.weeklyRepTargetLabel}
              </td>
              <td className="px-3 py-2.5 text-sm font-semibold text-stone-900">
                {row.estimatedSetRangeLabel}
              </td>
              <td className="px-3 py-2.5">
                <WeeklyVolumeTargetStatusBadge label="Optional" tone="optional" />
              </td>
              <td className="px-3 py-2.5">
                <Button
                  aria-label={`${row.actionLabel} ${row.label} target`}
                  onClick={() => onOptionalVolumeTargetToggle(row.muscleGroupId, !row.isEnabled)}
                  size="sm"
                  variant={row.isEnabled ? "ghost" : "outline"}
                >
                  {row.actionLabel}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
