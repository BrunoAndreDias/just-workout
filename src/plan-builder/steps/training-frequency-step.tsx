import { ArrowRight, Bed, Calendar, Check, ChevronLeft, Dumbbell } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions } from "../../design-system/step-screen";
import {
  type TrainingFrequencyDaysPerWeek,
  type TrainingFrequencyOption,
  trainingFrequencyOptions,
} from "../plan-blueprint";
import {
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  getTrainingSplit,
  type TrainingSplitDefinition,
  type TrainingSplitId,
} from "../training-split";
import "./training-frequency-step.css";

type TrainingFrequencyStepProps = {
  canContinueToTrainingStyle: boolean;
  onContinueToTrainingStyle: () => Promise<void>;
  onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedTrainingSplitId: TrainingSplitId | null;
  selectedTrainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek | null;
};

export function TrainingFrequencyStep({
  canContinueToTrainingStyle,
  onContinueToTrainingStyle,
  onTrainingFrequencyChange,
  onTrainingSplitChange,
  selectedTrainingSplitId,
  selectedTrainingFrequencyDaysPerWeek,
}: TrainingFrequencyStepProps) {
  const selectedFrequency = selectedTrainingFrequencyDaysPerWeek ?? 3;
  const recommendedSplit = getTrainingSplit(getRecommendedTrainingSplitId(selectedFrequency));
  const selectedSplitId = selectedTrainingSplitId ?? recommendedSplit.id;
  const selectedSplit =
    compatibleTrainingSplitOrDefault(selectedSplitId, selectedFrequency) ?? recommendedSplit;
  const compatibleSplits = getTrainingScheduleCompatibleSplits(selectedFrequency, recommendedSplit);

  return (
    <section aria-labelledby="training-frequency-title" className="training-frequency-panel">
      <div className="training-frequency-heading">
        <h2 className="training-frequency-title" id="training-frequency-title">
          How many days can you train per week?
        </h2>
      </div>

      <fieldset className="training-frequency-options">
        <legend className="sr-only">Training Frequency</legend>
        {trainingFrequencyOptions.map((option) => (
          <TrainingFrequencyOptionRadio
            isSelected={option.daysPerWeek === selectedTrainingFrequencyDaysPerWeek}
            key={option.daysPerWeek}
            onSelect={onTrainingFrequencyChange}
            option={option}
          />
        ))}
      </fieldset>
      <TrainingFrequencyRecommendationCard
        compatibleSplits={compatibleSplits}
        onTrainingSplitChange={onTrainingSplitChange}
        recommendedSplit={recommendedSplit}
        selectedSplit={selectedSplit}
      />

      <StepActions className="training-frequency-actions">
        <Button disabled size="step" type="button" variant="outline">
          <ChevronLeft aria-hidden="true" size={20} />
          Back
        </Button>
        {canContinueToTrainingStyle ? (
          <Button
            onClick={() => {
              void onContinueToTrainingStyle();
            }}
            size="step"
            type="button"
            variant="builderPrimary"
          >
            Continue to Rep ranges
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        ) : (
          <Button disabled size="step" type="button" variant="builderPrimary">
            Continue to Rep ranges
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        )}
      </StepActions>
    </section>
  );
}

function compatibleTrainingSplitOrDefault(
  selectedSplitId: TrainingSplitId,
  selectedFrequency: TrainingFrequencyDaysPerWeek,
): TrainingSplitDefinition | null {
  return (
    getCompatibleTrainingSplits(selectedFrequency).find((split) => split.id === selectedSplitId) ??
    null
  );
}

function getTrainingScheduleCompatibleSplits(
  selectedFrequency: TrainingFrequencyDaysPerWeek,
  recommendedSplit: TrainingSplitDefinition,
): ReadonlyArray<TrainingSplitDefinition> {
  const compatibleSplits = getCompatibleTrainingSplits(selectedFrequency).filter(
    (split) => split.id !== recommendedSplit.id,
  );

  if (selectedFrequency !== 3) {
    return compatibleSplits;
  }

  return compatibleSplits.toSorted((first, second) => {
    const requestedOrder = ["alternating-full-body-a-b", "upper-lower-full-body"];

    return requestedOrder.indexOf(first.id) - requestedOrder.indexOf(second.id);
  });
}
type TrainingFrequencyOptionRadioProps = {
  isSelected: boolean;
  onSelect: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  option: TrainingFrequencyOption;
};
function TrainingFrequencyOptionRadio({
  isSelected,
  onSelect,
  option,
}: TrainingFrequencyOptionRadioProps) {
  const optionLabel = `${option.daysPerWeek} days`;
  const accessibleOptionLabel = `${option.daysPerWeek} days per week`;

  return (
    <label
      aria-label={accessibleOptionLabel}
      className={cn(
        "training-frequency-option",
        isSelected ? "training-frequency-option--selected" : null,
      )}
    >
      <input
        aria-label={accessibleOptionLabel}
        checked={isSelected}
        className="sr-only"
        name="training-frequency-days-per-week"
        onChange={() => onSelect(option.daysPerWeek)}
        type="radio"
        value={option.daysPerWeek}
      />
      {isSelected ? (
        <span className="training-frequency-option__check">
          <Check aria-hidden="true" size={19} strokeWidth={2.5} />
        </span>
      ) : null}
      <span className="training-frequency-option__icon">
        <span className="training-frequency-option__icon-frame">
          <Calendar aria-hidden="true" size={58} strokeWidth={1.4} />
          <span className="training-frequency-option__day">{option.daysPerWeek}</span>
        </span>
      </span>
      <span className="training-frequency-option__label">{optionLabel}</span>
      {option.helperText ? (
        <span className="training-frequency-option__helper">{option.helperText}</span>
      ) : null}
    </label>
  );
}
type TrainingFrequencyRecommendationCardProps = {
  compatibleSplits: ReadonlyArray<TrainingSplitDefinition>;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  recommendedSplit: TrainingSplitDefinition;
  selectedSplit: TrainingSplitDefinition;
};

type CompactWeeklyLayoutDay = {
  dayLabel: string;
  isRestDay: boolean;
  sessionLabel: string;
};

function TrainingFrequencyRecommendationCard({
  compatibleSplits,
  onTrainingSplitChange,
  recommendedSplit,
  selectedSplit,
}: TrainingFrequencyRecommendationCardProps) {
  const weeklyLayout = getCompactWeeklyLayout(selectedSplit);
  const splitOptions = [recommendedSplit, ...compatibleSplits];

  return (
    <section aria-labelledby="training-schedule-split-title" className="training-schedule-split">
      <div className="training-schedule-split__section-heading">
        <h2 className="training-schedule-split__section-title" id="training-schedule-split-title">
          Choose your weekly split
        </h2>
      </div>

      <div className="training-schedule-split__cards">
        {splitOptions.map((split) => {
          const isSelected = selectedSplit.id === split.id;
          const isRecommended = split.id === recommendedSplit.id;

          return (
            <label
              className={cn(
                "training-schedule-split__card",
                isRecommended ? "training-schedule-split__card--recommended" : null,
                isSelected ? "training-schedule-split__card--selected" : null,
              )}
              key={split.id}
            >
              <input
                checked={isSelected}
                className="sr-only"
                name="training-split"
                onChange={() => onTrainingSplitChange(split.id)}
                type="radio"
                value={split.id}
              />
              <div className="training-schedule-split__heading">
                <div className="training-schedule-split__title-row">
                  <h3>{split.label}</h3>
                  {isRecommended ? (
                    <span className="training-schedule-split__chips">
                      <span className="training-schedule-split__badge">Best fit</span>
                    </span>
                  ) : null}
                </div>
              </div>

              <ul
                className={cn(
                  "training-schedule-split__benefits",
                  isSelected ? "training-schedule-split__benefits--selected" : null,
                )}
                aria-label={`${split.label} benefits`}
              >
                {getSplitCardBenefits(split).map((benefit) => (
                  <li key={benefit}>
                    <Check aria-hidden="true" size={15} strokeWidth={2.4} />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>

      <div className="training-schedule-split__layout">
        <h3>Weekly preview</h3>
        <p className="training-schedule-split__layout-helper">
          Training on Mon, Wed and Fri with recovery days between sessions.
        </p>
        <ol>
          {weeklyLayout.map((layoutDay) => (
            <li
              className={cn(
                "training-schedule-split__layout-day",
                layoutDay.isRestDay ? "training-schedule-split__layout-day--rest" : null,
              )}
              key={`${layoutDay.dayLabel}-${layoutDay.sessionLabel}`}
            >
              <strong>{layoutDay.dayLabel}</strong>
              {layoutDay.isRestDay ? (
                <Bed aria-hidden="true" size={24} strokeWidth={1.65} />
              ) : (
                <Dumbbell aria-hidden="true" size={24} strokeWidth={1.8} />
              )}
              <span>{layoutDay.sessionLabel}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function getSplitCardBenefits(split: TrainingSplitDefinition): ReadonlyArray<string> {
  switch (split.id) {
    case "full-body-2-day":
      return ["Muscles trained 2x/week", "Simple weekly rhythm", "Long recovery windows"];
    case "alternating-full-body-a-b":
      return ["More variety", "Full-body focus", "Slightly more programming variation"];
    case "upper-lower-full-body":
      return ["Mixed emphasis", "Slightly more complex", "Good variety across the week"];
    case "upper-lower-4-day":
      return ["Upper and lower focus", "Muscles trained 2x/week", "Manageable recovery"];
    case "rotating-push-pull-legs":
      return ["Flexible training days", "Push, pull, legs variety", "Best with movable weekdays"];
    default:
      return ["Muscles trained 3x/week", "Simple progression", "Manageable recovery"];
  }
}

function getCompactWeeklyLayout(
  split: TrainingSplitDefinition,
): ReadonlyArray<CompactWeeklyLayoutDay> {
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (split.schedule.kind === "rotating-cycle") {
    const cycle = split.schedule.cycle;

    return weekdayLabels.map((dayLabel, index) => ({
      dayLabel,
      isRestDay: !cycle[index],
      sessionLabel: cycle[index]?.sessionLabel ?? "Rest",
    }));
  }

  return split.schedule.week.map((session, index) => ({
    dayLabel: weekdayLabels[index] ?? session.dayLabel,
    isRestDay: session.sessionLabel.toLowerCase().includes("rest"),
    sessionLabel: session.sessionLabel.toLowerCase().includes("rest")
      ? "Rest"
      : session.sessionLabel,
  }));
}
