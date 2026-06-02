import { Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Info } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions } from "../../design-system/step-screen";
import { SectionDescription, SectionTitle } from "../../design-system/typography";
import {
  getSelectableOptionCardClassName,
  getSelectableOptionState,
  SelectionBadge,
  selectableOptionMutedTextStyles,
} from "../components/plan-builder-option-ui";
import { PlanBuilderStepStatusCard } from "../components/plan-builder-page";
import type { TrainingFrequencyDaysPerWeek } from "../plan-blueprint";
import { planBuilderPaths } from "../plan-builder-paths";
import {
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  type TrainingSplitDefinition,
  type TrainingSplitId,
  type TrainingSplitSchedule,
  unsupportedTrainingSplitCategories,
} from "../training-split";
import "./training-split-step.css";

type TrainingSplitStepProps = {
  onContinueToRepRanges: () => Promise<void>;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedSplit: TrainingSplitDefinition;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type TrainingSplitOptionRadioProps = {
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: (split: TrainingSplitId) => void;
  option: TrainingSplitDefinition;
};

type TrainingSplitFitStatus = {
  body: string;
  title: string;
};

type TrainingSplitDetailsPanelProps = {
  fitStatus: TrainingSplitFitStatus;
  split: TrainingSplitDefinition;
};

type TrainingSplitFitPanelProps = {
  fitStatus: TrainingSplitFitStatus;
};

type TrainingSplitSchedulePanelProps = {
  schedule: TrainingSplitSchedule;
};
export function TrainingSplitStep({
  onContinueToRepRanges,
  onTrainingSplitChange,
  selectedSplit,
  trainingFrequencyDaysPerWeek,
}: TrainingSplitStepProps) {
  const compatibleSplits = getCompatibleTrainingSplits(trainingFrequencyDaysPerWeek);
  const recommendedSplitId = getRecommendedTrainingSplitId(trainingFrequencyDaysPerWeek);
  const trainingFrequencyLabel = `${trainingFrequencyDaysPerWeek} days/week`;
  const fitStatus = getTrainingSplitFitStatus({
    recommendedSplitId,
    selectedSplit,
    trainingFrequencyLabel,
  });

  return (
    <div className="training-split-step">
      <div className="min-w-0">
        <section aria-labelledby="training-split-title" className="training-split-choice">
          <div>
            <SectionTitle
              className="training-split-section-title font-black text-stone-950"
              id="training-split-title"
            >
              Choose a compatible split
            </SectionTitle>
            <SectionDescription className="training-split-section-copy mt-1 max-w-2xl">
              Just Workout recommends the best fit, but you can choose another compatible structure
              for {trainingFrequencyLabel}.
            </SectionDescription>
          </div>

          <fieldset className="training-split-options">
            <legend className="sr-only">Training Split</legend>
            {compatibleSplits.map((option) => (
              <TrainingSplitOptionRadio
                isRecommended={option.id === recommendedSplitId}
                isSelected={option.id === selectedSplit.id}
                key={option.id}
                onSelect={onTrainingSplitChange}
                option={option}
              />
            ))}
          </fieldset>
        </section>

        <TrainingSplitDetailsPanel
          fitStatus={fitStatus}
          key={selectedSplit.id}
          split={selectedSplit}
        />
        <UnsupportedTrainingSplitsPanel />

        <StepActions className="training-split-actions">
          <Button asChild className="training-split-action-button" variant="outline">
            <Link to={planBuilderPaths.frequency}>Back to Frequency</Link>
          </Button>
          <Button
            className="training-split-action-button"
            onClick={() => {
              void onContinueToRepRanges();
            }}
            type="button"
          >
            Continue to Rep ranges
          </Button>
        </StepActions>
      </div>

      <PlanBuilderStepStatusCard
        body="Your workout stays in blueprint mode until Review confirms the full plan."
        className="training-split-generation-note"
        title="Plan status"
      />
    </div>
  );
}

function getTrainingSplitFitStatus({
  recommendedSplitId,
  selectedSplit,
  trainingFrequencyLabel,
}: {
  recommendedSplitId: TrainingSplitId;
  selectedSplit: TrainingSplitDefinition;
  trainingFrequencyLabel: string;
}): TrainingSplitFitStatus {
  if (selectedSplit.id === recommendedSplitId) {
    return {
      body: `Just Workout recommends ${selectedSplit.label} for ${trainingFrequencyLabel} as the clearest starting point.`,
      title: "Recommended fit",
    };
  }

  return {
    body: `${selectedSplit.label} still fits ${trainingFrequencyLabel}, but it trades the default recommendation for a different weekly rhythm.`,
    title: "Compatible alternative",
  };
}
function TrainingSplitOptionRadio({
  isRecommended,
  isSelected,
  onSelect,
  option,
}: TrainingSplitOptionRadioProps) {
  const badgeLabel = isRecommended ? "Recommended" : "Also works";
  const optionState = getSelectableOptionState(isSelected);

  return (
    <label
      className={cn(
        "training-split-option",
        getSelectableOptionCardClassName(optionState),
        isSelected ? "training-split-option--selected" : null,
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="training-split"
        onChange={() => onSelect(option.id)}
        type="radio"
        value={option.id}
      />
      <div className="training-split-option__body">
        <span className="training-split-option__control" aria-hidden="true">
          {isSelected ? <Check aria-hidden="true" size={19} strokeWidth={2.8} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="training-split-option__title font-black">{option.label}</p>
            <SelectionBadge isSelected={isSelected}>{badgeLabel}</SelectionBadge>
          </div>
          <p
            className={cn(
              "training-split-option__copy",
              isSelected ? "text-[#244256]" : selectableOptionMutedTextStyles[optionState],
            )}
          >
            {option.cardDescription}
          </p>
        </div>
      </div>
    </label>
  );
}
function TrainingSplitDetailsPanel({ fitStatus, split }: TrainingSplitDetailsPanelProps) {
  return (
    <section
      aria-labelledby="training-split-details-title"
      aria-atomic="true"
      aria-live="polite"
      className="training-split-details rounded-lg border border-[#0b6f78] bg-[#fbfdfc] p-4"
    >
      <div className="training-split-details__heading">
        <span className="training-split-details__check flex h-9 w-9 items-center justify-center rounded-full bg-[#00636a] text-white">
          <Check aria-hidden="true" size={20} strokeWidth={2.6} />
        </span>
        <h3 className="text-xl font-black text-stone-950" id="training-split-details-title">
          {split.label}
        </h3>
      </div>
      <p className="training-split-details__copy mt-2 max-w-3xl text-sm text-[#244256]">
        {split.cardDescription}
      </p>

      <div className="training-split-details__content">
        <TrainingSplitFitPanel fitStatus={fitStatus} />
        <TrainingSplitSchedulePanel schedule={split.schedule} />
      </div>
    </section>
  );
}

function TrainingSplitFitPanel({ fitStatus }: TrainingSplitFitPanelProps) {
  return (
    <div className="training-split-fit-panel">
      <h4 className="text-base font-black text-stone-950">Why this split fits</h4>
      <ul className="mt-3 grid gap-2 text-sm font-medium leading-5 text-[#112c3a]">
        <li className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#00636a]" size={17} />
          <span>{fitStatus.title}</span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#00636a]" size={17} />
          <span>Muscle frequency and recovery stay balanced.</span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#00636a]" size={17} />
          <span>Easy to recover from and schedule.</span>
        </li>
      </ul>
    </div>
  );
}

function UnsupportedTrainingSplitsPanel() {
  return (
    <section aria-labelledby="not-recommended-split-title" className="training-split-unsupported">
      <h4 className="text-base font-black text-stone-950" id="not-recommended-split-title">
        Not included in this step
      </h4>
      <div className="mt-2 divide-y divide-stone-950/10">
        {unsupportedTrainingSplitCategories.map((category) => (
          <div className="training-split-unsupported__row" key={category.title}>
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[#0a5960]" size={18} />
            <p className="font-semibold text-[#112c3a]">{category.title}</p>
            <p className="text-[#244256]">
              {getUnsupportedTrainingSplitShortReason(category.title)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getUnsupportedTrainingSplitShortReason(title: string): string {
  if (title === "Body-part split weeks") {
    return "Too low in frequency for most users on a 2-5 day builder.";
  }

  return "Less compatible with the selected Training Frequency.";
}

function TrainingSplitSchedulePanel({ schedule }: TrainingSplitSchedulePanelProps) {
  return (
    <div className="training-split-schedule-panel">
      <h4 className="text-base font-black text-stone-950">
        {getTrainingSplitScheduleHeading(schedule)}
      </h4>
      <TrainingSplitScheduleContent schedule={schedule} />
    </div>
  );
}

function TrainingSplitScheduleContent({ schedule }: TrainingSplitSchedulePanelProps) {
  switch (schedule.kind) {
    case "fixed-week": {
      const trainingDays = schedule.week.filter(
        (day) => !day.sessionLabel.toLowerCase().includes("rest"),
      );

      return (
        <div className="mt-3">
          <ol className="training-split-schedule-days">
            {trainingDays.map((day, index) => (
              <li
                className="training-split-schedule-day"
                key={`${day.dayLabel}-${day.sessionLabel}`}
              >
                <p className="text-sm font-bold text-[#244256]">
                  {getSuggestedTrainingDayLabel(day.dayLabel, index)}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#00636a]">{day.sessionLabel}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm font-medium leading-6 text-[#244256]">
            {schedule.description}
          </p>
        </div>
      );
    }
    case "rotating-cycle":
      return (
        <div className="mt-3 space-y-3">
          <ol className="training-split-schedule-days">
            {schedule.cycle.map((session, index) => (
              <li className="training-split-schedule-day" key={session.id}>
                <p className="text-sm font-bold text-[#244256]">Cycle step {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-[#00636a]">{session.sessionLabel}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm font-medium leading-6 text-[#244256]">{schedule.cadence}</p>
        </div>
      );
  }
}

function getSuggestedTrainingDayLabel(dayLabel: string, index: number): string {
  const suggestedWeekdays = ["Mon", "Wed", "Fri", "Sat", "Sun"];

  if (dayLabel.startsWith("Day ")) {
    return suggestedWeekdays[index] ?? dayLabel;
  }

  return dayLabel;
}

function getTrainingSplitScheduleHeading(schedule: TrainingSplitSchedule): string {
  switch (schedule.kind) {
    case "fixed-week":
      return "Suggested weekly layout";
    case "rotating-cycle":
      return "Rotating-cycle preview";
  }
}
