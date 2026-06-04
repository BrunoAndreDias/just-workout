import {
  ArrowRight,
  BarChart3,
  Bed,
  Calendar,
  Check,
  ChevronLeft,
  Dumbbell,
  Repeat2,
} from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
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
          Training frequency
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

      <div className="training-frequency-actions">
        <Button
          className="training-frequency-action-button training-frequency-action-button--back"
          disabled
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" size={20} />
          Back
        </Button>
        {canContinueToTrainingStyle ? (
          <Button
            className="training-frequency-action-button training-frequency-action-button--continue"
            onClick={() => {
              void onContinueToTrainingStyle();
            }}
            type="button"
          >
            Continue to Training style
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        ) : (
          <Button
            className="training-frequency-action-button training-frequency-action-button--continue"
            disabled
            type="button"
          >
            Continue to Training style
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        )}
      </div>
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
  const optionLabel = `${option.daysPerWeek} days/week`;

  return (
    <label
      className={cn(
        "training-frequency-option",
        isSelected ? "training-frequency-option--selected" : null,
      )}
    >
      <input
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
  const isRecommendedSelected = selectedSplit.id === recommendedSplit.id;
  const benefits = getRecommendedSplitBenefits(recommendedSplit);
  const weeklyLayout = getCompactWeeklyLayout(recommendedSplit);

  return (
    <section aria-labelledby="training-schedule-split-title" className="training-schedule-split">
      <h2 className="training-schedule-split__section-title">Recommended weekly split</h2>
      <label
        className={cn(
          "training-schedule-split__card",
          isRecommendedSelected ? "training-schedule-split__card--selected" : null,
        )}
      >
        <input
          checked={isRecommendedSelected}
          className="sr-only"
          name="training-split"
          onChange={() => onTrainingSplitChange(recommendedSplit.id)}
          type="radio"
          value={recommendedSplit.id}
        />
        <div className="training-schedule-split__heading">
          <div>
            <div className="training-schedule-split__title-row">
              <h3 id="training-schedule-split-title">{recommendedSplit.label}</h3>
              <span
                className={cn(
                  "training-schedule-split__badge",
                  isRecommendedSelected ? "training-schedule-split__badge--selected" : null,
                )}
              >
                Best fit
              </span>
            </div>
            <p>{recommendedSplit.cardDescription}</p>
          </div>
        </div>

        <div className="training-schedule-split__details">
          <div>
            <h4>Why this split fits</h4>
            <ul className="training-schedule-split__benefits" aria-label="Why this split fits">
              {benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>
          <div className="training-schedule-split__layout">
            <h4>Suggested weekly layout</h4>
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
        </div>
      </label>

      {compatibleSplits.length > 0 ? (
        <div className="training-schedule-split__alternatives">
          <h3>Other compatible splits</h3>
          <div>
            {compatibleSplits.map((split) => {
              const isSelected = selectedSplit.id === split.id;
              const SplitIcon = getCompatibleSplitIcon(split);

              return (
                <label
                  className={cn(
                    "training-schedule-split__alternative",
                    isSelected ? "training-schedule-split__alternative--selected" : null,
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
                  <span className="training-schedule-split__alternative-icon" aria-hidden="true">
                    <SplitIcon size={24} strokeWidth={1.8} />
                  </span>
                  <span className="training-schedule-split__alternative-copy">
                    <span>{split.label}</span>
                    <span>{getCompatibleSplitTradeoff(split)}</span>
                  </span>
                  <span className="training-schedule-split__alternative-tag">
                    {getCompatibleSplitTag(split)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getRecommendedSplitBenefits(split: TrainingSplitDefinition): ReadonlyArray<string> {
  if (split.id === "upper-lower-4-day") {
    return ["Best balance", "Muscles trained about twice per week", "Manageable recovery"];
  }

  if (split.id === "full-body-3-day" || split.id === "alternating-full-body-a-b") {
    return ["Best fit", "Muscles trained 3x/week", "Manageable recovery"];
  }

  return ["Best fit", split.muscleFrequency, "Manageable recovery"];
}

function getCompatibleSplitTradeoff(split: TrainingSplitDefinition): string {
  if (split.id === "rotating-push-pull-legs") {
    return "Can work for 4 days/week, but Upper/Lower is easier to keep consistent across fixed weekdays.";
  }

  return split.weeklyRhythm;
}

function getCompatibleSplitIcon(split: TrainingSplitDefinition) {
  if (split.id === "alternating-full-body-a-b") {
    return Repeat2;
  }

  return BarChart3;
}

function getCompatibleSplitTag(split: TrainingSplitDefinition): string {
  if (split.id === "alternating-full-body-a-b") {
    return "More variety";
  }

  if (split.id === "upper-lower-full-body") {
    return "More complex";
  }

  return "Compatible";
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
