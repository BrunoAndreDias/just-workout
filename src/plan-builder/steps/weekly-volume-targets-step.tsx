import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import {
  getSelectableOptionCardClassName,
  getSelectableOptionState,
  RepRangeStyleStatusBadge,
  selectableOptionMutedTextStyles,
} from "../components/plan-builder-option-ui";
import { PlanBuilderStepStatusCard } from "../components/plan-builder-page";
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

const weeklyVolumeHowItWorksItems = [
  "Just Workout will distribute your weekly reps across your training days.",
  "Compound and isolation exercises will both count toward the same weekly muscle-group targets.",
  "You will refine the exact exercises later, after the weekly targets are in place.",
] as const;

const weeklyVolumeHowItWorksItemClassName =
  "rounded-md border border-stone-900/10 bg-[#fcfaf6] px-3 py-2 text-sm text-stone-700";
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

const weeklyVolumeTargetColumnHeaderClassName =
  "px-4 py-3 text-xs font-bold uppercase tracking-wide text-stone-500";

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
        <StepPanel aria-labelledby="weekly-volume-targets-title" className="training-volume-panel">
          <h3
            className="training-volume-section-title text-xl font-black text-stone-950 sm:text-2xl"
            id="weekly-volume-targets-title"
          >
            Weekly volume targets
          </h3>
          <p className="training-volume-section-copy mt-2 max-w-2xl text-sm text-[#244256]">
            Set weekly rep targets for each muscle group before exercises are selected.
          </p>
          <p className="training-volume-section-copy mt-2 max-w-2xl text-sm text-[#244256]">
            Just Workout will translate those weekly targets into sets and reps across your training
            days later.
          </p>

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

          <section
            aria-labelledby="weekly-volume-how-it-works-title"
            className="training-volume-how"
          >
            <h4
              className="text-lg font-black text-stone-950 sm:text-xl"
              id="weekly-volume-how-it-works-title"
            >
              How this works
            </h4>
            <ul className="mt-3 grid gap-3">
              {weeklyVolumeHowItWorksItems.map((item) => (
                <li className={weeklyVolumeHowItWorksItemClassName} key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <StepActions className="training-volume-actions">
            <Button asChild className="training-volume-action-button" variant="outline">
              <Link to={planBuilderPaths.repRanges}>Back to Rep ranges</Link>
            </Button>
            <Button
              className="training-volume-action-button"
              disabled={!canContinueToExercises}
              onClick={() => {
                void onContinueToExercises();
              }}
              type="button"
            >
              Continue to Exercises
            </Button>
          </StepActions>
        </StepPanel>
      </div>

      <PlanBuilderStepStatusCard
        body="Weekly targets only: these targets describe your full training week, not a single workout."
        className="training-volume-scope-note"
        title="Weekly targets note"
        titleDisplay="visible"
      />
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
        getSelectableOptionCardClassName(optionState),
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
        <span className="training-split-option__control" aria-hidden="true">
          {isSelected ? <Check aria-hidden="true" size={19} strokeWidth={2.8} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="volume-preset-option__title font-black">{option.title}</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isSelected ? (
                <RepRangeStyleStatusBadge tone="selected">Selected</RepRangeStyleStatusBadge>
              ) : null}
              {option.isRecommended ? (
                <RepRangeStyleStatusBadge tone="recommended">Recommended</RepRangeStyleStatusBadge>
              ) : null}
            </div>
          </div>
          <p
            className={cn(
              "volume-preset-option__copy",
              isSelected ? "text-[#244256]" : selectableOptionMutedTextStyles[optionState],
            )}
          >
            {volumePresetDescriptions[option.id]}
          </p>
          <p
            className={cn(
              "volume-preset-option__targets",
              isSelected ? "text-[#244256]" : selectableOptionMutedTextStyles[optionState],
            )}
          >
            {option.largerMuscleTarget} larger-muscle reps/week · {option.smallerMuscleTarget}{" "}
            smaller-muscle reps/week
          </p>
        </div>
      </div>
    </label>
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
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Reps/week is the saved Training Volume target. Estimated sets/week is display context
            only.
          </p>
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
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Calves and Abs stay out of the saved Training Volume until you add direct work for them.
          </p>
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
    <div className="training-volume-table-wrap overflow-x-auto rounded-lg border border-stone-900/10 bg-[#fcfaf6]">
      <table
        aria-label="Required Weekly Rep Targets"
        className="min-w-full border-collapse text-left"
      >
        <thead className="bg-[#f4f0e8]">
          <tr>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Muscle group</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Weekly rep target</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Estimated sets/week</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Status</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Adjustment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-900/10 bg-white/88">
          {rows.map((row) => (
            <tr className="align-top" key={row.muscleGroupId}>
              <th className="px-4 py-4 text-sm font-semibold text-stone-950" scope="row">
                {row.label}
              </th>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.weeklyRepTargetLabel}
              </td>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.estimatedSetRangeLabel}
              </td>
              <td className="px-4 py-4">
                <WeeklyVolumeTargetStatusBadge label={row.statusLabel} tone={row.statusTone} />
              </td>
              <td className="px-4 py-4">
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
    <div className="training-volume-table-wrap overflow-x-auto rounded-lg border border-stone-900/10 bg-[#fcfaf6]">
      <table aria-label="Optional Volume Targets" className="min-w-full border-collapse text-left">
        <thead className="bg-[#f4f0e8]">
          <tr>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Muscle group</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Weekly rep target</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Estimated sets/week</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Status</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-900/10 bg-white/88">
          {rows.map((row) => (
            <tr className="align-top" key={row.muscleGroupId}>
              <th className="px-4 py-4 text-sm font-semibold text-stone-950" scope="row">
                {row.label}
              </th>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.weeklyRepTargetLabel}
              </td>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.estimatedSetRangeLabel}
              </td>
              <td className="px-4 py-4">
                <WeeklyVolumeTargetStatusBadge label="Optional" tone="optional" />
              </td>
              <td className="px-4 py-4">
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
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        weeklyVolumeTargetStatusStyles[tone],
      )}
    >
      {label}
    </span>
  );
}
